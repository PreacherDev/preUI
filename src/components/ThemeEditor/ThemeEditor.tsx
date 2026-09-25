import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useIcon } from "../../icons";
import { applyTokens } from "../../theming/apply-tokens";
import { checkTokenContrast, type TokenContrastResult } from "../../theming/contrast";
import {
  defaultThemePresets,
  resolveThemeConfig,
  resolveThemeConfigTokens,
  type ThemeConfig,
  type ThemePreset,
} from "../../theming/theme-config";
import { renderTokenOverrides, sharedTokenSet, tokenOverridesHeader } from "../../theming/token-css";
import { lightTokens, tokens, type PreuiScheme, type PreuiTokenName } from "../../tailwind/tokens";
import { cn } from "../../utils/cn";
import { Button } from "../Button/Button";
import type { ColorPickerLabels } from "../ColorPicker/ColorPicker";
import { ColorPicker } from "../ColorPicker/ColorPicker";
import { ContrastBadge, type ContrastBadgeLabels } from "../ContrastBadge/ContrastBadge";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Select/Select";
import { Slider, SliderLabel, SliderValue } from "../Slider/Slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs/Tabs";
import { Textarea } from "../Textarea/Textarea";
import type { SchemePreference } from "../Theme/theme-script";
import { ToggleGroup, ToggleGroupItem } from "../ToggleGroup/ToggleGroup";
import {
  applyPreset,
  fieldProblems,
  getSharedToken,
  hasOverrides,
  importantPairs,
  matchesPreset,
  normalizeThemeConfig,
  pairKey,
  parseRem,
  setPaletteColor,
  setSharedToken,
  themeEditorColorKeys,
  toHex,
  type ThemeEditorColorKey,
} from "./theme-editor-config";
import { ThemeEditorPreview, type ThemeEditorPreviewLabels } from "./ThemeEditorPreview";

// ------------------------------------------------------------------------------------------------
// Labels
// ------------------------------------------------------------------------------------------------

/** Every visible and accessible text of the editor. English defaults; pass a partial object per language. */
export interface ThemeEditorLabels {
  /** Accessible name of the always visible contrast status. */
  status: string;
  /** One scheme in the status, e.g. `"Dark: all readable"`. */
  statusScheme: (scheme: string, summary: string) => string;
  allReadable: string;
  problems: (count: number) => string;
  presets: string;
  /** Preset check mark (accessible). */
  presetReadable: string;
  presetProblems: (count: number) => string;
  scheme: string;
  schemes: Record<SchemePreference, string>;
  colors: string;
  fields: Record<ThemeEditorColorKey, string>;
  /** Marker of a changed field (accessible). */
  changed: string;
  /** Default hint of a field that is not set: the shown colour is the effective (derived) one. */
  inherited: string;
  resetField: (field: string) => string;
  /** Heading of the contrast details, e.g. `"Contrast (Dark)"`. */
  contrast: (scheme: string) => string;
  /** Names of the checked pairs, keyed `"fg/bg"` without `--pui-` (see `contrastPairs`). */
  pairs: Record<string, string>;
  shared: string;
  radius: string;
  radiusValue: (value: string) => string;
  font: string;
  fontDefault: string;
  fontCustom: string;
  preview: string;
  export: string;
  exportFormat: string;
  exportCss: string;
  exportJson: string;
  copy: string;
  copied: string;
  copyFailed: string;
  reset: string;
  save: string;
  /** Passed to every `ContrastBadge`. */
  contrastBadge?: Partial<ContrastBadgeLabels>;
  /** Passed to every `ColorPicker` (the trigger's name is the field label). */
  colorPicker?: Partial<Omit<ColorPickerLabels, "trigger">>;
  /** Texts of the built-in sample content of `layout="split"` (`ThemeEditorPreview`). */
  sample?: Partial<ThemeEditorPreviewLabels>;
}

export const defaultThemeEditorLabels: ThemeEditorLabels = {
  status: "Contrast",
  statusScheme: (scheme, summary) => `${scheme}: ${summary}`,
  allReadable: "all readable",
  problems: (count) => (count === 1 ? "1 problem" : `${count} problems`),
  presets: "Presets",
  presetReadable: "Readable in both schemes",
  presetProblems: (count) => (count === 1 ? "1 contrast problem" : `${count} contrast problems`),
  scheme: "Default scheme",
  schemes: { dark: "Dark", light: "Light", system: "System" },
  colors: "Colors",
  fields: {
    primary: "Primary",
    background: "Background",
    foreground: "Text",
    positive: "Positive",
    negative: "Negative",
    destructive: "Destructive",
    warning: "Warning",
    info: "Info",
  },
  changed: "changed",
  inherited: "default",
  resetField: (field) => `Reset ${field}`,
  contrast: (scheme) => `Contrast (${scheme})`,
  pairs: {
    "foreground/background": "Text on background",
    "card-foreground/card": "Text on card",
    "popover-foreground/popover": "Text on popover",
    "tooltip-foreground/tooltip": "Tooltip text",
    "primary-foreground/primary": "Text on primary",
    "secondary-foreground/secondary": "Text on secondary",
    "accent-foreground/accent": "Text on hover surface",
    "muted-foreground/background": "Muted text on background",
    "muted-foreground/card": "Muted text on card",
    "muted-foreground/muted": "Muted text on muted surface",
    "positive-foreground/positive": "Text on positive",
    "negative-foreground/negative": "Text on negative",
    "destructive-foreground/destructive": "Text on destructive",
    "warning-foreground/warning": "Text on warning",
    "info-foreground/info": "Text on info",
    "primary/background": "Primary as text",
    "positive/background": "Positive as text",
    "negative/background": "Negative as text",
    "warning/background": "Warning as text",
    "info/background": "Info as text",
  },
  shared: "Shape & font",
  radius: "Corner radius",
  radiusValue: (value) => `${value} rem`,
  font: "Font",
  fontDefault: "Default",
  fontCustom: "Custom",
  preview: "Preview",
  export: "Export",
  exportFormat: "Export format",
  exportCss: "CSS",
  exportJson: "JSON",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
  reset: "Reset all",
  save: "Save",
};

type ThemeEditorLabelsInput = Partial<Omit<ThemeEditorLabels, "fields" | "pairs" | "schemes">> & {
  fields?: Partial<ThemeEditorLabels["fields"]>;
  pairs?: Partial<ThemeEditorLabels["pairs"]>;
  schemes?: Partial<ThemeEditorLabels["schemes"]>;
};

// ------------------------------------------------------------------------------------------------
// Props
// ------------------------------------------------------------------------------------------------

export interface ThemeEditorFont {
  label: string;
  /** A `font-family` value, e.g. `'"Rajdhani", system-ui, sans-serif'`. */
  value: string;
}

export type ThemeEditorExportFormat = "css" | "json";

export interface ThemeEditorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "onReset" | "children"> {
  /** Controlled theme (protocol v1 — `GlobalState.theme`, `NuiThemeBridge`, your own storage). */
  value?: ThemeConfig | null;
  /** Initial theme when uncontrolled. */
  defaultValue?: ThemeConfig | null;
  /** Every change, as a complete config: `{ v: 1, scheme, palette, tokens? }` plus the fields it came with (`theme`). */
  onChange?: (config: ThemeConfig) => void;
  /** Shows the Save button. A returned promise shows a spinner until it settles. */
  onSave?: (config: ThemeConfig) => void | Promise<unknown>;
  /** Called after "Reset all" with the reset config (it is passed to `onChange` as well). */
  onReset?: (config: ThemeConfig) => void;
  /**
   * Presets at the top (`ThemePreset[]`). Clicking one applies its palettes + tokens; edits continue from there.
   * `[]` hides the section. @default defaultThemePresets
   */
  presets?: readonly ThemePreset[];
  /** Font choices for `--pui-font-sans`; the font section is hidden without them. */
  fonts?: readonly ThemeEditorFont[];
  /**
   * Live preview: while mounted, the edited theme is applied to the whole page with `applyTokens` (own `<style>`,
   * removed on unmount). It sets the complete token set of both schemes, so it also wins over other runtime
   * overrides (a server theme) and shows the config exactly as it will look. The page's `data-scheme` is not touched.
   * @default true
   */
  preview?: boolean;
  /** `<style>` id of the preview. @default "preui-theme-editor-preview" */
  previewId?: string;
  /**
   * Your own preview content, shown with the edited theme in the scheme of the active tab (scoped CSS variables, also
   * with `preview={false}`) — so the light colours can be checked on a dark page and vice versa. With
   * `layout="split"` it replaces the built-in sample content of the preview pane.
   */
  previewSlot?: ReactNode;
  /** Extra content at the start of the action bar, e.g. a Cancel button or keybind hints of your window. */
  actionsSlot?: ReactNode;
  /** Show the export section (copy the CSS for `tokensToCss`-style files and the config as JSON). @default false */
  exportable?: boolean;
  /** Called when the user copies an export (e.g. to also log it in a game console). */
  onExport?: (format: ThemeEditorExportFormat, text: string) => void;
  /** Controlled tab (the scheme whose colours are edited). */
  editingScheme?: PreuiScheme;
  /** Initial tab. Default: the config's scheme when it is dark/light, else `"dark"`. */
  defaultEditingScheme?: PreuiScheme;
  onEditingSchemeChange?: (scheme: PreuiScheme) => void;
  /** Scheme written when the value has none. @default "dark" */
  fallbackScheme?: SchemePreference;
  /** Ratio below which a pair counts as a problem. @default 4.5 */
  minContrast?: number;
  /** `"panel"`: framed card surface. `"inline"`: no frame, for your own window or sidebar. @default "panel" */
  variant?: "panel" | "inline";
  /**
   * `"stacked"`: one column (`previewSlot` inside it). `"split"`: the controls on the left and a large preview pane on
   * the right — `previewSlot`, or the built-in sample content (`ThemeEditorPreview`) when there is none — themed with
   * the edited tokens of the active tab. Below the `lg` breakpoint the two stack. Give it room: e.g. `h-[48rem]`.
   * @default "stacked"
   */
  layout?: "stacked" | "split";
  labels?: ThemeEditorLabelsInput;
  /** Number formatting (contrast ratios, radius). @default "en-US" */
  locale?: string;
}

const DEFAULT_FONT = "__preui-default-font__";
const RADIUS_DEFAULT = parseRem((tokens as Record<string, string>)["--pui-radius"]) ?? 0.5;
const schemeList: PreuiScheme[] = ["dark", "light"];

const eyebrow = "text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground";

/** Clipboard API, with the `execCommand` fallback CEF / insecure pages need. Only called from event handlers. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// ------------------------------------------------------------------------------------------------
// ThemeEditor
// ------------------------------------------------------------------------------------------------

/**
 * A complete theme editor for one `ThemeConfig` (protocol v1): presets, default scheme, base colours per scheme
 * (expanded with `deriveTokens`), corner radius and font, an always visible contrast status for both schemes,
 * reset, save and export. Environment-agnostic — it never talks to a server or storage; wire `onChange` / `onSave`
 * to `fetchNui`, `localStorage` or your API. Works in FiveM NUI (Chromium 103, everything drawn in the DOM) and on
 * websites (SSR-safe; the preview is applied in an effect).
 */
export const ThemeEditor = /* @__PURE__ */ forwardRef<HTMLDivElement, ThemeEditorProps>(function ThemeEditor(
  {
    value: valueProp,
    defaultValue,
    onChange,
    onSave,
    onReset,
    presets = defaultThemePresets,
    fonts,
    preview = true,
    previewId = "preui-theme-editor-preview",
    previewSlot,
    actionsSlot,
    exportable = false,
    onExport,
    editingScheme: editingProp,
    defaultEditingScheme,
    onEditingSchemeChange,
    fallbackScheme = "dark",
    minContrast = 4.5,
    variant = "panel",
    layout = "stacked",
    labels: labelsProp,
    locale = "en-US",
    className,
    ...props
  },
  ref,
) {
  const labels = useMemo<ThemeEditorLabels>(
    () => ({
      ...defaultThemeEditorLabels,
      ...labelsProp,
      fields: { ...defaultThemeEditorLabels.fields, ...labelsProp?.fields },
      pairs: { ...defaultThemeEditorLabels.pairs, ...labelsProp?.pairs } as Record<string, string>,
      schemes: { ...defaultThemeEditorLabels.schemes, ...labelsProp?.schemes },
    }),
    [labelsProp],
  );

  // ---- value (controlled / uncontrolled) --------------------------------------------------------
  const controlled = valueProp !== undefined;
  const [inner, setInner] = useState<ThemeConfig | null | undefined>(defaultValue);
  const raw = controlled ? valueProp : inner;
  const config = useMemo(() => normalizeThemeConfig(raw, fallbackScheme), [raw, fallbackScheme]);
  const configRef = useLatest(config);
  const onChangeRef = useLatest(onChange);

  const commit = useCallback(
    (next: ThemeConfig) => {
      const normalized = normalizeThemeConfig(next, fallbackScheme);
      configRef.current = normalized;
      if (!controlled) setInner(normalized);
      onChangeRef.current?.(normalized);
      return normalized;
    },
    [controlled, fallbackScheme, configRef, onChangeRef],
  );
  const update = useCallback((recipe: (current: ThemeConfig) => ThemeConfig) => commit(recipe(configRef.current)), [commit, configRef]);

  // ---- tab --------------------------------------------------------------------------------------
  const [innerEditing, setInnerEditing] = useState<PreuiScheme>(
    () => defaultEditingScheme ?? (config.scheme === "light" ? "light" : "dark"),
  );
  const editing = editingProp ?? innerEditing;
  const setEditing = (scheme: PreuiScheme) => {
    if (editingProp === undefined) setInnerEditing(scheme);
    onEditingSchemeChange?.(scheme);
  };

  // ---- derived state ----------------------------------------------------------------------------
  const resolved = useMemo(() => resolveThemeConfig(config), [config]);
  const effective = useMemo(
    () => ({ dark: resolveThemeConfigTokens(config, "dark"), light: resolveThemeConfigTokens(config, "light") }),
    [config],
  );
  const contrast = useMemo(
    () => ({ dark: checkTokenContrast(effective.dark), light: checkTokenContrast(effective.light) }),
    [effective],
  );
  const problemCount = (scheme: PreuiScheme) => contrast[scheme].filter((result) => result.ratio < minContrast).length;

  // ---- live preview -----------------------------------------------------------------------------
  const previewCss = useMemo(() => {
    const shared: Record<string, string> = {
      "--pui-radius": effective.dark["--pui-radius"],
      "--pui-font-sans": effective.dark["--pui-font-sans"],
      ...(resolved.shared as Record<string, string> | undefined),
    };
    const scheme = (name: PreuiScheme) => {
      const defaults = (name === "light" ? lightTokens : tokens) as Record<string, string>;
      const all = effective[name] as Record<string, string>;
      // Every scheme-dependent colour the editor derives, so other runtime overrides can't leak into the preview.
      return Object.fromEntries(Object.keys(defaults).filter((key) => !sharedTokenSet.has(key)).map((key) => [key, all[key]]));
    };
    return { shared, dark: scheme("dark"), light: scheme("light") };
  }, [effective, resolved]);
  useEffect(() => {
    if (!preview) return;
    return applyTokens(previewCss, { id: previewId });
  }, [preview, previewCss, previewId]);

  // ---- actions ----------------------------------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const save = () => {
    const result = onSave?.(configRef.current);
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setSaving(true);
      (result as Promise<unknown>).then(
        () => mounted.current && setSaving(false),
        () => mounted.current && setSaving(false),
      );
    }
  };
  const reset = () => {
    const next = commit({ ...configRef.current, palette: {}, tokens: undefined });
    onReset?.(next);
  };

  const Check = useIcon("check");
  const Warning = useIcon("warning");
  const id = useId();

  const split = layout === "split";

  const schemeSummary = (scheme: PreuiScheme) => {
    const count = problemCount(scheme);
    return labels.statusScheme(labels.schemes[scheme], count === 0 ? labels.allReadable : labels.problems(count));
  };

  return (
    <div
      ref={ref}
      data-slot="theme-editor"
      data-variant={variant}
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-col text-sm text-pui-foreground",
        variant === "panel" && "rounded-pui border border-pui-border bg-pui-card text-pui-card-foreground",
        className,
      )}
      {...props}
    >
      {/* Contrast status of both schemes — always visible, outside the scrolling body. */}
      <div
        data-slot="theme-editor-status"
        role="group"
        aria-label={labels.status}
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-1.5 border-b border-pui-border",
          variant === "panel" ? "px-4 py-2.5" : "pb-2.5",
        )}
      >
        {schemeList.map((scheme) => {
          const count = problemCount(scheme);
          const Icon = count === 0 ? Check : Warning;
          return (
            <button
              key={scheme}
              type="button"
              data-slot="theme-editor-status-item"
              data-scheme-status={scheme}
              data-problems={count}
              aria-pressed={editing === scheme}
              onClick={() => setEditing(scheme)}
              className={cn(
                "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium outline-none",
                "transition-colors duration-pui-fast ease-pui focus-visible:ring-pui focus-visible:ring-pui-ring",
                count === 0
                  ? "border-pui-positive/tint-border bg-pui-positive/tint text-pui-positive"
                  : "border-pui-warning/tint-border bg-pui-warning/tint text-pui-warning",
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span aria-live="polite">{schemeSummary(scheme)}</span>
            </button>
          );
        })}
      </div>

      <div
        data-slot="theme-editor-body"
        data-layout={layout}
        className={cn("flex min-h-0 flex-1 flex-col", split && ["lg:flex-row", variant === "inline" && "gap-4 lg:gap-6"])}
      >
        <ScrollArea
          className={cn("min-h-0 flex-1", split && "lg:w-[26rem] lg:flex-none")}
          contentClassName={cn("flex flex-col gap-6", variant === "panel" ? "p-4" : "py-4")}
        >
          {presets.length > 0 && (
            <PresetPicker
              presets={presets}
              config={config}
              labels={labels}
              minContrast={minContrast}
              onPick={(preset) => update((current) => applyPreset(current, preset))}
            />
          )}

          <section data-slot="theme-editor-scheme" className="flex flex-col gap-2">
            <span id={`${id}-scheme`} className={eyebrow}>
              {labels.scheme}
            </span>
            <ToggleGroup
              aria-labelledby={`${id}-scheme`}
              value={[config.scheme ?? fallbackScheme]}
              onValueChange={(next) => {
                const scheme = next[0] as SchemePreference | undefined;
                if (scheme) update((current) => ({ ...current, scheme }));
              }}
              className="self-start"
            >
              {(["dark", "light", "system"] as const).map((scheme) => (
                <ToggleGroupItem key={scheme} value={scheme}>
                  {labels.schemes[scheme]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <section data-slot="theme-editor-colors" className="flex flex-col gap-2">
            <span className={eyebrow}>{labels.colors}</span>
            <Tabs value={editing} onValueChange={(next) => setEditing(next as PreuiScheme)} className="gap-3">
              <TabsList>
                {schemeList.map((scheme) => (
                  <TabsTrigger key={scheme} value={scheme} data-problems={problemCount(scheme)}>
                    {labels.schemes[scheme]}
                    {problemCount(scheme) > 0 && <Warning className="size-3.5 text-pui-warning" aria-hidden="true" />}
                  </TabsTrigger>
                ))}
              </TabsList>
              {schemeList.map((scheme) => (
                <TabsContent key={scheme} value={scheme} className="flex flex-col gap-5">
                  <ul className="flex flex-col gap-1" data-slot="theme-editor-color-list">
                    {themeEditorColorKeys.map((key) => (
                      <ColorField
                        key={key}
                        fieldKey={key}
                        scheme={scheme}
                        set={config.palette?.[scheme]?.[key]}
                        effective={effective[scheme][`--pui-${key}` as PreuiTokenName]}
                        problems={fieldProblems(key, contrast[scheme], minContrast)}
                        labels={labels}
                        locale={locale}
                        onValue={(next) => update((current) => setPaletteColor(current, scheme, key, next))}
                      />
                    ))}
                  </ul>
                  <ContrastDetails
                    scheme={scheme}
                    results={contrast[scheme]}
                    labels={labels}
                    locale={locale}
                    minContrast={minContrast}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </section>

          {!split && previewSlot != null && (
            <section data-slot="theme-editor-preview" className="flex flex-col gap-2">
              <span className={eyebrow}>
                {labels.preview} · {labels.schemes[editing]}
              </span>
              <div
                data-scheme={editing}
                // The edited tokens as scoped CSS variables, so the slot shows them even with preview={false}.
                style={effective[editing] as CSSProperties}
                className="flex flex-col gap-3 rounded-pui border border-pui-border bg-pui-background p-3 font-sans text-pui-foreground"
              >
                {previewSlot}
              </div>
            </section>
          )}

          <SharedSection config={config} fonts={fonts} labels={labels} locale={locale} update={update} idBase={id} />

          {exportable && <ExportSection config={config} resolvedCss={resolved} labels={labels} onExport={onExport} />}
        </ScrollArea>

        {split && (
          <section
            data-slot="theme-editor-preview"
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              variant === "panel"
                ? "border-t border-pui-border lg:border-l lg:border-t-0"
                : "mb-4 rounded-pui border border-pui-border lg:my-4",
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-pui-border px-4 py-2">
              <span id={`${id}-preview`} className={eyebrow}>
                {labels.preview}
              </span>
              <ToggleGroup
                aria-labelledby={`${id}-preview`}
                value={[editing]}
                onValueChange={(next) => {
                  const scheme = next[0] as PreuiScheme | undefined;
                  if (scheme) setEditing(scheme);
                }}
              >
                {schemeList.map((scheme) => (
                  <ToggleGroupItem key={scheme} value={scheme}>
                    {labels.schemes[scheme]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            {/* The edited tokens of the active tab as scoped CSS variables — independent of the page and of `preview`. */}
            <ScrollArea
              data-scheme={editing}
              style={effective[editing] as CSSProperties}
              className="min-h-0 flex-1 bg-pui-background font-sans text-pui-foreground"
              contentClassName="p-4 lg:p-6"
            >
              {previewSlot ?? <ThemeEditorPreview labels={labels.sample} />}
            </ScrollArea>
          </section>
        )}
      </div>

      <div
        data-slot="theme-editor-actions"
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-pui-border",
          variant === "panel" ? "px-4 py-3" : "pt-3",
        )}
      >
        {actionsSlot != null && <div className="mr-auto flex items-center gap-2">{actionsSlot}</div>}
        <Button variant="ghost" onClick={reset} disabled={!hasOverrides(config)} data-slot="theme-editor-reset">
          {labels.reset}
        </Button>
        {onSave && (
          <Button variant="solid" onClick={save} loading={saving} data-slot="theme-editor-save">
            {labels.save}
          </Button>
        )}
      </div>
    </div>
  );
});

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

function PresetPicker({
  presets,
  config,
  labels,
  minContrast,
  onPick,
}: {
  presets: readonly ThemePreset[];
  config: ThemeConfig;
  labels: ThemeEditorLabels;
  minContrast: number;
  onPick: (preset: ThemePreset) => void;
}) {
  const Check = useIcon("check");
  const Warning = useIcon("warning");
  const id = useId();
  // Swatch colours + contrast per preset (only recomputed when the list changes).
  const info = useMemo(
    () =>
      presets.map((preset) => {
        const dark = resolveThemeConfigTokens(preset.config, "dark");
        const light = resolveThemeConfigTokens(preset.config, "light");
        const problems = [...checkTokenContrast(dark), ...checkTokenContrast(light)].filter(
          (result) => result.ratio < minContrast,
        ).length;
        return {
          preset,
          problems,
          swatches: [
            { background: dark["--pui-background"], primary: dark["--pui-primary"] },
            { background: light["--pui-background"], primary: light["--pui-primary"] },
          ],
        };
      }),
    [presets, minContrast],
  );

  return (
    <section data-slot="theme-editor-presets" className="flex flex-col gap-2">
      <span id={`${id}-presets`} className={eyebrow}>
        {labels.presets}
      </span>
      <div role="group" aria-labelledby={`${id}-presets`} className="grid grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-1.5">
        {info.map(({ preset, problems, swatches }) => {
          const selected = matchesPreset(config, preset);
          return (
            <button
              key={preset.id}
              type="button"
              data-slot="theme-editor-preset"
              data-preset={preset.id}
              data-selected={selected ? "" : undefined}
              data-contrast={problems === 0 ? "pass" : "fail"}
              aria-pressed={selected}
              title={preset.description}
              onClick={() => onPick(preset)}
              className={cn(
                "flex min-w-0 flex-col gap-1.5 rounded-pui-md border p-1.5 text-left text-xs font-medium outline-none",
                "transition-colors duration-pui-fast ease-pui focus-visible:ring-pui focus-visible:ring-pui-ring",
                selected
                  ? "border-pui-primary/tint-border bg-pui-primary/tint text-pui-foreground"
                  : "border-pui-border text-pui-muted-foreground hover:bg-pui-accent hover:text-pui-accent-foreground",
              )}
            >
              {/* Dark | light: background with the primary as a dot. */}
              <span aria-hidden="true" className="flex h-7 w-full overflow-hidden rounded-pui-sm border border-pui-border">
                {swatches.map((swatch, index) => (
                  <span
                    key={index}
                    className="flex h-full min-w-0 flex-1 basis-0 items-center justify-center"
                    style={{ backgroundColor: `hsl(${swatch.background})` }}
                  >
                    <span className="size-3 rounded-full" style={{ backgroundColor: `hsl(${swatch.primary})` }} />
                  </span>
                ))}
              </span>
              <span className="flex w-full min-w-0 items-center gap-1 px-0.5">
                <span className="min-w-0 flex-1 truncate">{preset.label}</span>
                {problems === 0 ? (
                  <Check className="size-3.5 shrink-0 text-pui-positive" aria-hidden="true" />
                ) : (
                  <Warning className="size-3.5 shrink-0 text-pui-warning" aria-hidden="true" />
                )}
                <span className="sr-only">{problems === 0 ? labels.presetReadable : labels.presetProblems(problems)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------
// Colour field
// ------------------------------------------------------------------------------------------------

function ColorField({
  fieldKey,
  scheme,
  set,
  effective,
  problems,
  labels,
  locale,
  onValue,
}: {
  fieldKey: ThemeEditorColorKey;
  scheme: PreuiScheme;
  set: string | undefined;
  effective: string;
  problems: TokenContrastResult[];
  labels: ThemeEditorLabels;
  locale: string;
  onValue: (value: string | undefined) => void;
}) {
  const Undo = useIcon("undo");
  const label = labels.fields[fieldKey];
  const changed = set !== undefined;
  const hex = toHex(set) ?? toHex(effective) ?? "#000000";
  const worst = problems[0];
  return (
    <li
      data-slot="theme-editor-color-field"
      data-field={fieldKey}
      data-scheme-field={scheme}
      data-changed={changed ? "" : undefined}
      data-contrast={worst ? "fail" : "pass"}
      className="flex h-9 min-w-0 items-center gap-2.5"
    >
      <ColorPicker
        value={hex}
        onValueChange={(next) => onValue(next)}
        labels={{ ...labels.colorPicker, trigger: label }}
      />
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className={cn("truncate", changed ? "text-pui-foreground" : "text-pui-muted-foreground")}>{label}</span>
        {changed ? (
          <span className="size-1.5 shrink-0 self-center rounded-full bg-pui-primary" role="img" aria-label={labels.changed} />
        ) : (
          <span className="sr-only">{labels.inherited}</span>
        )}
      </span>
      {worst && (
        <ContrastBadge
          ratio={worst.ratio}
          showRatio
          locale={locale}
          labels={labels.contrastBadge}
          data-slot="theme-editor-field-contrast"
          title={labels.pairs[pairKey(worst)]}
          className="shrink-0"
        />
      )}
      <span className="w-16 shrink-0 font-mono text-xs uppercase text-pui-muted-foreground">{hex}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={labels.resetField(label)}
        disabled={!changed}
        onClick={() => onValue(undefined)}
        data-slot="theme-editor-field-reset"
        className="shrink-0"
      >
        <Undo aria-hidden="true" />
      </Button>
    </li>
  );
}

// ------------------------------------------------------------------------------------------------
// Contrast details
// ------------------------------------------------------------------------------------------------

function ContrastDetails({
  scheme,
  results,
  labels,
  locale,
  minContrast,
}: {
  scheme: PreuiScheme;
  results: TokenContrastResult[];
  labels: ThemeEditorLabels;
  locale: string;
  minContrast: number;
}) {
  const id = useId();
  // Important pairs always, the others while they fail; problems first.
  const shown = results
    .filter((result) => importantPairs.includes(pairKey(result)) || result.ratio < minContrast)
    .sort((a, b) => Number(b.ratio < minContrast) - Number(a.ratio < minContrast));
  return (
    <div data-slot="theme-editor-contrast" className="flex flex-col gap-2">
      <span id={`${id}-contrast`} className={eyebrow}>
        {labels.contrast(labels.schemes[scheme])}
      </span>
      <ul aria-labelledby={`${id}-contrast`} className="flex flex-col gap-1.5">
        {shown.map((result) => {
          const key = pairKey(result);
          return (
            <li
              key={key}
              data-slot="theme-editor-contrast-item"
              data-pair={key}
              data-contrast={result.ratio < minContrast ? "fail" : "pass"}
              className="flex min-w-0 items-center justify-between gap-2"
            >
              <span className="truncate text-pui-muted-foreground">{labels.pairs[key] ?? key}</span>
              <ContrastBadge ratio={result.ratio} locale={locale} labels={labels.contrastBadge} className="shrink-0" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Radius + font
// ------------------------------------------------------------------------------------------------

function SharedSection({
  config,
  fonts,
  labels,
  locale,
  update,
  idBase,
}: {
  config: ThemeConfig;
  fonts: readonly ThemeEditorFont[] | undefined;
  labels: ThemeEditorLabels;
  locale: string;
  update: (recipe: (current: ThemeConfig) => ThemeConfig) => void;
  idBase: string;
}) {
  const Undo = useIcon("undo");
  const radiusRaw = getSharedToken(config, "radius");
  const radius = parseRem(radiusRaw) ?? RADIUS_DEFAULT;
  const font = getSharedToken(config, "font-sans");
  const fontItems = useMemo(() => {
    if (!fonts || fonts.length === 0) return null;
    const items = [{ value: DEFAULT_FONT, label: labels.fontDefault }, ...fonts];
    if (font && !fonts.some((item) => item.value === font)) items.push({ value: font, label: labels.fontCustom });
    return items;
  }, [fonts, font, labels.fontDefault, labels.fontCustom]);
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 3 }),
    [locale],
  );

  return (
    <section data-slot="theme-editor-shared" className="flex flex-col gap-3">
      <span className={eyebrow}>{labels.shared}</span>
      <div data-slot="theme-editor-radius" data-changed={radiusRaw !== undefined ? "" : undefined} className="flex items-end gap-2">
        <Slider
          value={radius}
          min={0}
          max={1.25}
          step={0.025}
          locale={locale}
          onValueChange={(next) => update((current) => setSharedToken(current, "radius", `${next as number}rem`))}
          className="flex-1"
        >
          <div className="flex items-center justify-between">
            <SliderLabel>{labels.radius}</SliderLabel>
            <SliderValue>{() => labels.radiusValue(formatter.format(radius))}</SliderValue>
          </div>
        </Slider>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={labels.resetField(labels.radius)}
          disabled={radiusRaw === undefined}
          onClick={() => update((current) => setSharedToken(current, "radius", undefined))}
          className="shrink-0"
        >
          <Undo aria-hidden="true" />
        </Button>
      </div>
      {fontItems && (
        <div data-slot="theme-editor-font" className="flex flex-col gap-1.5">
          <span id={`${idBase}-font`} className="text-xs font-medium text-pui-muted-foreground">
            {labels.font}
          </span>
          <Select
            items={fontItems}
            value={font ?? DEFAULT_FONT}
            onValueChange={(next) =>
              update((current) =>
                setSharedToken(current, "font-sans", !next || next === DEFAULT_FONT ? undefined : (next as string)),
              )
            }
          >
            <SelectTrigger aria-labelledby={`${idBase}-font`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  <span style={item.value === DEFAULT_FONT ? undefined : { fontFamily: item.value }}>{item.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------
// Export
// ------------------------------------------------------------------------------------------------

function ExportSection({
  config,
  resolvedCss,
  labels,
  onExport,
}: {
  config: ThemeConfig;
  resolvedCss: ReturnType<typeof resolveThemeConfig>;
  labels: ThemeEditorLabels;
  onExport?: (format: ThemeEditorExportFormat, text: string) => void;
}) {
  const Copy = useIcon("copy");
  const [format, setFormat] = useState<ThemeEditorExportFormat>("css");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const id = useId();
  const text = useMemo(
    () =>
      format === "css"
        ? `${tokenOverridesHeader}\n${renderTokenOverrides(resolvedCss).css}`
        : JSON.stringify(config, null, 2),
    [format, resolvedCss, config],
  );
  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 1500);
    return () => clearTimeout(timer);
  }, [copyState]);

  return (
    <section data-slot="theme-editor-export" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id={`${id}-export`} className={eyebrow}>
          {labels.export}
        </span>
        <ToggleGroup
          aria-label={labels.exportFormat}
          value={[format]}
          onValueChange={(next) => next[0] && setFormat(next[0] as ThemeEditorExportFormat)}
        >
          <ToggleGroupItem value="css">{labels.exportCss}</ToggleGroupItem>
          <ToggleGroupItem value="json">{labels.exportJson}</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Textarea
        readOnly
        value={text}
        rows={6}
        aria-labelledby={`${id}-export`}
        data-slot="theme-editor-export-text"
        data-format={format}
        spellCheck={false}
        onFocus={(event) => event.currentTarget.select()}
        className="max-h-48 font-mono text-xs"
      />
      <Button
        variant="outline"
        size="sm"
        leftIcon={<Copy />}
        className="self-start"
        data-slot="theme-editor-copy"
        onClick={async () => {
          onExport?.(format, text);
          setCopyState((await copyText(text)) ? "copied" : "failed");
        }}
      >
        {copyState === "copied" ? labels.copied : copyState === "failed" ? labels.copyFailed : labels.copy}
      </Button>
    </section>
  );
}
