import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { useIcon } from "../../icons";
import { applyTokens } from "../../theming/apply-tokens";
import type { TokenOverrides } from "../../theming/token-css";
import { Button, type ButtonProps } from "../Button/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type DropdownMenuContentProps,
} from "../DropdownMenu/DropdownMenu";
import {
  applyThemeState,
  getThemeScript,
  normalizeThemeOptions,
  parseStoredTheme,
  resolveThemeState,
  sanitizeStoredTheme,
  type ResolvedScheme,
  type SchemePreference,
  type StoredTheme,
  type ThemeOptions,
  type ThemeStorage,
  type ThemeSupport,
} from "./theme-script";

// ---------------------------------------------------------------------------
// External stores (SSR-safe: the server render and the hydration pass use the server snapshots)
// ---------------------------------------------------------------------------

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Fallback when localStorage is blocked (private mode, sandboxed iframes, CEF without storage). */
const memoryStorage = new Map<string, string>();
const storageListeners = new Set<() => void>();

function readStorage(key: string): string | null {
  let value: string | null = null;
  try {
    value = window.localStorage.getItem(key);
  } catch {
    return memoryStorage.get(key) ?? null;
  }
  return value ?? memoryStorage.get(key) ?? null;
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    memoryStorage.delete(key);
  } catch {
    memoryStorage.set(key, value);
  }
  for (const listener of storageListeners) listener();
}

function subscribeStorage(onChange: () => void) {
  storageListeners.add(onChange);
  // Other tabs: the storage event fires for every change of localStorage (we filter by value in React).
  window.addEventListener("storage", onChange);
  return () => {
    storageListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

const SYSTEM_QUERY = "(prefers-color-scheme: dark)";
const canMatchMedia = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

function subscribeSystem(onChange: () => void) {
  if (!canMatchMedia()) return () => {};
  const mql = window.matchMedia(SYSTEM_QUERY);
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }
  mql.addListener(onChange);
  return () => mql.removeListener(onChange);
}

const getSystemSnapshot = (): ResolvedScheme | undefined =>
  canMatchMedia() ? (window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light") : undefined;
const getUnknown = () => undefined;
const getNull = () => null;
const noopSubscribe = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

// ---------------------------------------------------------------------------
// Provider + hook
// ---------------------------------------------------------------------------

export interface ThemeChangeDetails {
  scheme: SchemePreference;
  resolvedScheme: ResolvedScheme;
  theme: string | null;
}

export interface ThemeProviderProps extends ThemeOptions {
  children?: ReactNode;
  /**
   * Briefly disable CSS transitions while switching, so colours change at once instead of animating.
   * @default true
   */
  disableTransitionOnChange?: boolean;
  /** Called after the applied scheme or theme changed (not on the initial application). */
  onChange?: (details: ThemeChangeDetails) => void;
  /**
   * Runtime token overrides (`{ shared, dark, light }`), applied with `applyTokens` and updated whenever the
   * content changes — e.g. from a theme editor or a server-side theme. Removed when the provider unmounts.
   */
  tokens?: TokenOverrides;
}

export interface ThemeContextValue {
  /** The scheme preference: `"light"`, `"dark"` or `"system"`. */
  scheme: SchemePreference;
  setScheme: (scheme: SchemePreference) => void;
  /** The scheme actually applied (`data-scheme` on `<html>`). */
  resolvedScheme: ResolvedScheme;
  /** The active theme name (`data-theme` on `<html>`), `null` for none. */
  theme: string | null;
  /** Picks a theme; `null` removes it. */
  setTheme: (theme: string | null) => void;
  /** The declared theme names (keys of the `themes` prop). */
  themes: string[];
  /** Which schemes each declared theme supports. */
  themeSupport: Record<string, ThemeSupport>;
  /** The operating-system scheme, `undefined` until known (server render / hydration). */
  systemScheme: ResolvedScheme | undefined;
  /** `false` while the scheme is forced or the active theme supports only one scheme. */
  canToggleScheme: boolean;
  /** Whether `"system"` is an allowed scheme. */
  enableSystem: boolean;
}

const ThemeContext = /* @__PURE__ */ createContext<ThemeContextValue | null>(null);

/**
 * Manages the colour scheme (`data-scheme="light" | "dark"`) and your named theme (`data-theme`) on `<html>`:
 * persists both in localStorage (or your own `storage`), syncs across tabs and follows `prefers-color-scheme` for
 * `"system"`. `tokens` sets runtime token overrides (see `applyTokens`).
 * SSR-safe; add `<ThemeScript />` (same options) to `<head>` so the stored choice applies before the first paint.
 */
export function ThemeProvider({
  children,
  defaultScheme,
  defaultTheme,
  themes,
  storageKey,
  enableSystem,
  forcedScheme,
  forcedTheme,
  colorScheme,
  storage,
  disableTransitionOnChange = true,
  onChange,
  tokens,
}: ThemeProviderProps) {
  const local = storage === undefined || storage === null;
  const options = useMemo(
    () =>
      normalizeThemeOptions({
        defaultScheme,
        defaultTheme,
        themes,
        storageKey,
        enableSystem,
        forcedScheme,
        forcedTheme,
        colorScheme,
        storage: local ? undefined : false,
      }),
    // `themes` is compared by content, so an inline object literal doesn't recreate the options every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      defaultScheme,
      defaultTheme,
      JSON.stringify(themes ?? {}),
      storageKey,
      enableSystem,
      forcedScheme,
      forcedTheme,
      colorScheme,
      local,
    ],
  );
  const key = options.storageKey;

  // localStorage (default). With a custom storage or `storage={false}` these never touch localStorage.
  const getStored = useCallback(() => (local ? readStorage(key) : null), [key, local]);
  const raw = useSyncExternalStore(local ? subscribeStorage : noopSubscribe, getStored, getNull);
  // Custom storage / `false`: the choice lives in React state, loaded from and written to `storage`.
  const [memory, setMemory] = useState<StoredTheme>({});
  const external: ThemeStorage | null = storage ? storage : null;
  useIsomorphicLayoutEffect(() => {
    if (!external) return;
    setMemory(sanitizeStoredTheme(external.get()));
    return external.subscribe?.((value) => setMemory((current) => ({ ...current, ...sanitizeStoredTheme(value) })));
  }, [external]);
  const stored = useMemo<StoredTheme>(() => (local ? parseStoredTheme(raw) : memory), [local, raw, memory]);
  const systemScheme = useSyncExternalStore(subscribeSystem, getSystemSnapshot, getUnknown);
  // false during the server render and the hydration pass: the DOM (set by ThemeScript) is left alone until the
  // client values are known, so hydrating never flashes the default scheme.
  const hydrated = useSyncExternalStore(noopSubscribe, getTrue, getFalse);

  const state = resolveThemeState(options, stored, systemScheme);
  const { scheme, theme, resolvedScheme, canToggleScheme } = state;

  const memoryRef = useRef(memory);
  memoryRef.current = memory;
  const write = useCallback(
    (patch: StoredTheme) => {
      if (local) {
        const next = { ...parseStoredTheme(readStorage(key)), ...patch };
        writeStorage(key, JSON.stringify(next));
        return;
      }
      const next = { ...memoryRef.current, ...patch };
      memoryRef.current = next;
      setMemory(next);
      external?.set({
        scheme: next.scheme ?? options.defaultScheme,
        theme: next.theme !== undefined ? next.theme : options.defaultTheme,
      });
    },
    [key, local, external, options.defaultScheme, options.defaultTheme],
  );
  const setScheme = useCallback(
    (next: SchemePreference) => {
      if (next !== "light" && next !== "dark" && !(next === "system" && options.enableSystem)) return;
      write({ scheme: next });
    },
    [write, options.enableSystem],
  );
  const setTheme = useCallback((next: string | null) => write({ theme: next || null }), [write]);

  const applied = useRef<{ resolvedScheme: ResolvedScheme; theme: string | null } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useIsomorphicLayoutEffect(() => {
    if (!hydrated) return;
    const previous = applied.current;
    if (previous && previous.resolvedScheme === resolvedScheme && previous.theme === theme) return;
    const root = document.documentElement;
    const restore = previous && disableTransitionOnChange ? suspendTransitions() : null;
    applyThemeState(root, { resolvedScheme, theme }, options.colorScheme);
    restore?.();
    applied.current = { resolvedScheme, theme };
    if (previous) onChangeRef.current?.({ scheme, resolvedScheme, theme });
  }, [hydrated, resolvedScheme, theme, scheme, disableTransitionOnChange, options.colorScheme]);

  // Runtime token overrides: rewritten when their content changes, removed on unmount.
  const tokensKey = tokens ? JSON.stringify(tokens) : null;
  const removeTokens = useRef<(() => void) | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (tokensKey === null) {
      removeTokens.current?.();
      removeTokens.current = null;
      return;
    }
    removeTokens.current = applyTokens(JSON.parse(tokensKey) as TokenOverrides);
  }, [tokensKey]);
  useEffect(
    () => () => {
      removeTokens.current?.();
      removeTokens.current = null;
    },
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      setScheme,
      resolvedScheme,
      theme,
      setTheme,
      themes: Object.keys(options.themes),
      themeSupport: options.themes,
      systemScheme,
      canToggleScheme,
      enableSystem: options.enableSystem,
    }),
    [scheme, setScheme, resolvedScheme, theme, setTheme, options, systemScheme, canToggleScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Disables transitions until the next frame (like next-themes), so a scheme switch doesn't animate colours. */
function suspendTransitions(): () => void {
  const style = document.createElement("style");
  style.setAttribute("data-preui-theme-transition", "");
  style.appendChild(
    document.createTextNode("*,*::before,*::after{-webkit-transition:none!important;transition:none!important}"),
  );
  document.head.appendChild(style);
  return () => {
    // Force a style recalculation with the new colours before transitions come back.
    void window.getComputedStyle(document.body).opacity;
    window.setTimeout(() => style.remove(), 1);
  };
}

/** Scheme + theme state of the surrounding `ThemeProvider`. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a <ThemeProvider />");
  return context;
}

// ---------------------------------------------------------------------------
// ThemeScript
// ---------------------------------------------------------------------------

export interface ThemeScriptProps extends ThemeOptions {
  /** CSP nonce for the inline script. */
  nonce?: string;
}

/**
 * Inline `<script>` for `<head>`: applies the stored / system scheme and theme before the first paint.
 * Pass the same options as to `ThemeProvider`. For raw HTML (e.g. a Vite `index.html`) use `getThemeScript()`.
 */
export function ThemeScript({ nonce, ...options }: ThemeScriptProps) {
  return (
    <script
      data-slot="theme-script"
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: getThemeScript(options) }}
    />
  );
}

// ---------------------------------------------------------------------------
// ThemeToggle
// ---------------------------------------------------------------------------

export interface ThemeToggleProps extends Omit<ButtonProps, "onClick" | "children"> {
  /** Accessible label. @default "Toggle color scheme" */
  label?: string;
  onClick?: ButtonProps["onClick"];
}

/**
 * Icon button that switches between light and dark (shows the current scheme's icon).
 * Disabled while the scheme is locked (forced scheme or a light-/dark-only theme).
 */
export const ThemeToggle = /* @__PURE__ */ forwardRef<HTMLElement, ThemeToggleProps>(function ThemeToggle(
  { label = "Toggle color scheme", variant = "ghost", size = "icon", disabled, onClick, ...props },
  ref,
) {
  const { resolvedScheme, setScheme, canToggleScheme } = useTheme();
  const Sun = useIcon("sun");
  const Moon = useIcon("moon");
  const Icon = resolvedScheme === "light" ? Sun : Moon;
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      aria-label={label}
      title={label}
      disabled={disabled || !canToggleScheme}
      data-slot="theme-toggle"
      data-scheme={resolvedScheme}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setScheme(resolvedScheme === "dark" ? "light" : "dark");
      }}
      {...props}
    >
      <Icon data-slot="theme-toggle-icon" aria-hidden="true" />
    </Button>
  );
});

// ---------------------------------------------------------------------------
// ThemeSelect
// ---------------------------------------------------------------------------

export interface ThemeSelectLabels {
  /** Trigger label (accessible name). */
  trigger: string;
  scheme: string;
  light: string;
  dark: string;
  system: string;
  theme: string;
  /** The "no theme" option. */
  noTheme: string;
}

export const defaultThemeSelectLabels: ThemeSelectLabels = {
  trigger: "Color scheme and theme",
  scheme: "Scheme",
  light: "Light",
  dark: "Dark",
  system: "System",
  theme: "Theme",
  noTheme: "Default",
};

export interface ThemeSelectProps extends Omit<ButtonProps, "children"> {
  /** Visible texts (partial overrides). */
  labels?: Partial<ThemeSelectLabels>;
  /** Display names of your themes; defaults to the theme name. */
  themeLabels?: Record<string, ReactNode>;
  /** Show the theme list (when the provider declares `themes`). @default true */
  showThemes?: boolean;
  /** Props for the menu popup (`align`, `side`, `className` …). */
  contentProps?: Partial<DropdownMenuContentProps>;
  /** Trigger content; defaults to the current scheme's icon (icon button). */
  children?: ReactNode;
}

type SchemeOption = SchemePreference;

/**
 * Menu to pick the scheme (light / dark / system) and, if the provider declares `themes`, a theme.
 * Scheme options are disabled while the scheme is locked.
 */
export const ThemeSelect = /* @__PURE__ */ forwardRef<HTMLButtonElement, ThemeSelectProps>(function ThemeSelect(
  { labels: labelOverrides, themeLabels, showThemes = true, contentProps, children, variant = "ghost", size, ...props },
  ref,
) {
  const { scheme, setScheme, resolvedScheme, theme, setTheme, themes, canToggleScheme, enableSystem } = useTheme();
  const labels = { ...defaultThemeSelectLabels, ...labelOverrides };
  const Sun = useIcon("sun");
  const Moon = useIcon("moon");
  const Monitor = useIcon("monitor");
  const Current = resolvedScheme === "light" ? Sun : Moon;
  const schemeOptions: { value: SchemeOption; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: labels.light, Icon: Sun },
    { value: "dark", label: labels.dark, Icon: Moon },
    ...(enableSystem ? [{ value: "system" as const, label: labels.system, Icon: Monitor }] : []),
  ];
  const withThemes = showThemes && themes.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        ref={ref}
        render={
          <Button
            variant={variant}
            size={size ?? (children ? "default" : "icon")}
            aria-label={children ? undefined : labels.trigger}
            title={children ? undefined : labels.trigger}
            data-slot="theme-select-trigger"
            data-scheme={resolvedScheme}
            {...(props as ComponentPropsWithoutRef<typeof Button>)}
          />
        }
      >
        {children ?? <Current data-slot="theme-select-icon" aria-hidden="true" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" {...contentProps}>
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>{labels.scheme}</DropdownMenuGroupLabel>
          <DropdownMenuRadioGroup
            value={canToggleScheme ? scheme : resolvedScheme}
            onValueChange={(value) => setScheme(value as SchemePreference)}
          >
            {schemeOptions.map(({ value, label, Icon }) => (
              <DropdownMenuRadioItem
                key={value}
                value={value}
                disabled={!canToggleScheme}
                closeOnClick
                data-value={value}
              >
                <Icon aria-hidden="true" className="size-4 text-pui-muted-foreground" />
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {withThemes && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuGroupLabel>{labels.theme}</DropdownMenuGroupLabel>
              <DropdownMenuRadioGroup value={theme ?? ""} onValueChange={(value) => setTheme((value as string) || null)}>
                <DropdownMenuRadioItem value="" closeOnClick data-value="">
                  {labels.noTheme}
                </DropdownMenuRadioItem>
                {themes.map((name) => (
                  <DropdownMenuRadioItem
                    key={name}
                    value={name}
                    closeOnClick
                    data-value={name}
                  >
                    {themeLabels?.[name] ?? name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
