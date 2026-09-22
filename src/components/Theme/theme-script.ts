/** A colour scheme preUI ships tokens for. */
export type ResolvedScheme = "light" | "dark";

/** The scheme preference: a fixed scheme or `"system"` (follows `prefers-color-scheme`). */
export type SchemePreference = ResolvedScheme | "system";

/** Which schemes a theme supports: both (default) or only one (the scheme is then locked). */
export type ThemeSupport = ResolvedScheme | "both";

/** Options shared by `ThemeProvider`, `ThemeScript` and `getThemeScript` — pass the same values to all of them. */
export interface ThemeOptions {
  /** Scheme used until the user picks one. @default "dark" */
  defaultScheme?: SchemePreference;
  /** Theme (`data-theme`) used until the user picks one. @default none */
  defaultTheme?: string | null;
  /**
   * Your theme names and the schemes they support, e.g. `{ brand: "both", paper: "light" }`.
   * A light-/dark-only theme locks the scheme while it is active. Undeclared names count as `"both"`.
   */
  themes?: Record<string, ThemeSupport>;
  /** localStorage key for the persisted choice (`{"scheme":…,"theme":…}`). @default "preui-theme" */
  storageKey?: string;
  /** Allow `"system"` (follow `prefers-color-scheme`). Without it, `"system"` falls back to dark. @default true */
  enableSystem?: boolean;
  /** Force a scheme regardless of the stored choice (e.g. a page that must stay dark). */
  forcedScheme?: ResolvedScheme;
  /** Force a theme regardless of the stored choice; `null` forces no theme. */
  forcedTheme?: string | null;
}

export const DEFAULT_STORAGE_KEY = "preui-theme";

/** The persisted choice. `theme: null` means the user explicitly picked no theme. */
export interface StoredTheme {
  scheme?: SchemePreference;
  theme?: string | null;
}

export interface NormalizedThemeOptions {
  storageKey: string;
  defaultScheme: SchemePreference;
  defaultTheme: string | null;
  themes: Record<string, ThemeSupport>;
  enableSystem: boolean;
  forcedScheme: ResolvedScheme | null;
  /** `undefined` = not forced. */
  forcedTheme: string | null | undefined;
}

const isResolved = (value: unknown): value is ResolvedScheme => value === "light" || value === "dark";

export function normalizeThemeOptions(options: ThemeOptions = {}): NormalizedThemeOptions {
  const enableSystem = options.enableSystem ?? true;
  const requested = options.defaultScheme ?? "dark";
  const defaultScheme: SchemePreference = isResolved(requested) || (requested === "system" && enableSystem) ? requested : "dark";
  return {
    storageKey: options.storageKey || DEFAULT_STORAGE_KEY,
    defaultScheme,
    defaultTheme: options.defaultTheme || null,
    themes: options.themes ?? {},
    enableSystem,
    forcedScheme: isResolved(options.forcedScheme) ? options.forcedScheme : null,
    forcedTheme: options.forcedTheme === undefined ? undefined : options.forcedTheme || null,
  };
}

/** Parses the stored JSON; anything invalid counts as "nothing stored". */
export function parseStoredTheme(raw: string | null): StoredTheme {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return {};
    const stored = value as Record<string, unknown>;
    const result: StoredTheme = {};
    if (stored.scheme === "light" || stored.scheme === "dark" || stored.scheme === "system") result.scheme = stored.scheme;
    if (typeof stored.theme === "string" || stored.theme === null) result.theme = stored.theme || null;
    return result;
  } catch {
    return {};
  }
}

export interface ResolvedThemeState {
  /** The scheme preference (user choice or default; the forced scheme when forced). */
  scheme: SchemePreference;
  /** The active theme name, `null` for none. */
  theme: string | null;
  /** The scheme actually applied (`data-scheme`). */
  resolvedScheme: ResolvedScheme;
  /** `false` while the scheme is forced or the active theme supports only one scheme. */
  canToggleScheme: boolean;
}

/**
 * The one resolution rule, shared by the provider and (hand-translated) the inline script.
 * `systemScheme` is `undefined` while unknown (server render / hydration) — then "system" resolves to dark.
 */
export function resolveThemeState(
  options: NormalizedThemeOptions,
  stored: StoredTheme,
  systemScheme: ResolvedScheme | undefined,
): ResolvedThemeState {
  let scheme: SchemePreference = options.forcedScheme ?? stored.scheme ?? options.defaultScheme;
  if (scheme === "system" && !options.enableSystem) scheme = options.defaultScheme === "system" ? "dark" : options.defaultScheme;
  const theme =
    options.forcedTheme !== undefined ? options.forcedTheme : stored.theme !== undefined ? stored.theme : options.defaultTheme;
  const support = theme && Object.prototype.hasOwnProperty.call(options.themes, theme) ? options.themes[theme] : "both";
  const locked = isResolved(support);
  const resolvedScheme: ResolvedScheme = locked
    ? support
    : scheme === "system"
      ? (systemScheme ?? "dark")
      : scheme;
  return { scheme, theme, resolvedScheme, canToggleScheme: !locked && !options.forcedScheme };
}

/** Writes the state to an element (normally `<html>`): `data-scheme`, `data-theme`, `color-scheme`. */
export function applyThemeState(element: HTMLElement, { resolvedScheme, theme }: Pick<ResolvedThemeState, "resolvedScheme" | "theme">) {
  element.setAttribute("data-scheme", resolvedScheme);
  if (theme) element.setAttribute("data-theme", theme);
  else element.removeAttribute("data-theme");
  element.style.colorScheme = resolvedScheme;
}

/**
 * The inline script for `<head>` that applies the stored/system scheme and theme before the first paint
 * (no flash). ES5, no dependencies, survives blocked localStorage. Pass the same options as to `ThemeProvider`.
 * Same resolution as `resolveThemeState` (tested against it).
 */
export function getThemeScript(options: ThemeOptions = {}): string {
  const o = normalizeThemeOptions(options);
  const config = {
    k: o.storageKey,
    s: o.defaultScheme,
    t: o.defaultTheme,
    m: o.themes,
    e: o.enableSystem,
    fs: o.forcedScheme,
    ft: o.forcedTheme === undefined ? 0 : 1,
    fv: o.forcedTheme ?? null,
  };
  // `<` escaped so a theme name can never close the script tag.
  const json = JSON.stringify(config).replace(/</g, "\\u003c");
  return (
    "(function(){try{" +
    `var o=${json},d=document.documentElement,p={},r=null;` +
    "try{r=localStorage.getItem(o.k)}catch(e){}" +
    'if(r){try{p=JSON.parse(r);if(!p||typeof p!=="object")p={}}catch(e){p={}}}' +
    'var s=o.fs||(p.scheme==="light"||p.scheme==="dark"||p.scheme==="system"?p.scheme:o.s);' +
    'if(s==="system"&&!o.e)s=o.s==="system"?"dark":o.s;' +
    'var t=o.ft?o.fv:(typeof p.theme==="string"||p.theme===null?p.theme||null:o.t);' +
    'var u=t&&Object.prototype.hasOwnProperty.call(o.m,t)?o.m[t]:"both";' +
    'var c=u==="light"||u==="dark"?u:s==="system"?(window.matchMedia?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):"dark"):s;' +
    'd.setAttribute("data-scheme",c);if(t)d.setAttribute("data-theme",t);else d.removeAttribute("data-theme");d.style.colorScheme=c' +
    "}catch(e){}})()"
  );
}
