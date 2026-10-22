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
  type KeyboardEvent,
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
import { copyText } from "../../utils/copy-text";
import { PortalContainerProvider } from "../../utils/portal-container";
import { Button } from "../Button/Button";
import type { ColorPickerLabels } from "../ColorPicker/ColorPicker";
import { ColorPicker } from "../ColorPicker/ColorPicker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../Collapsible/Collapsible";
import { ContrastBadge, type ContrastBadgeLabels } from "../ContrastBadge/ContrastBadge";
import { IconButton } from "../IconButton/IconButton";
import { WithTooltip } from "../Tooltip/IconTooltip";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "../Item/Item";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import { Separator } from "../Separator/Separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "../Sidebar/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs/Tabs";
import { Textarea } from "../Textarea/Textarea";
import type { SchemePreference } from "../Theme/theme-script";
import { ToggleGroup, ToggleGroupItem } from "../ToggleGroup/ToggleGroup";
import {
  applyPreset,
  deriveLightFromDark,
  fieldProblems,
  fixAllContrast,
  fixFieldContrastWithTint,
  hasFixableProblems,
  hasRawColorToken,
  isOwnTintPair,
  allPairKeys,
  hasOverrides,
  importantPairs,
  otherPairKeys,
  matchesPreset,
  normalizeThemeConfig,
  pairKey,
  setPaletteColor,
  styleTokenKeys,
  themeEditorColorKeys,
  toHex,
  type ThemeEditorColorKey,
} from "./theme-editor-config";
import { AdvancedSection, FontSection, ImportSection, SavePresetForm, ShareSection, StyleSection } from "./theme-editor-sections";
import { ThemeEditorPreview, type ThemeEditorPreviewLabels } from "./ThemeEditorPreview";
import { PresetActionDialogs, PresetActionsMenu, type PendingPresetAction } from "./theme-editor-preset-actions";
import { defaultThemeEditorFonts, resolveThemeEditorFonts, type ThemeEditorFont } from "./theme-editor-fonts";

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
  /** Collapsible group of the contrast details with the less important pairs. */
  otherPairs: string;
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
  /** Style section (radius, transparency, accent, borders, shadows). */
  style: string;
  surfaceOpacity: string;
  tintScale: string;
  borderOpacity: string;
  shadowScale: string;
  /** Slider value in percent, e.g. `"85 %"`. */
  percentValue: (value: string) => string;
  /** Shown while panels are see-through: the contrast check assumes opaque panels. */
  transparencyHint: string;
  /** Shown under the accent strength while coloured text on its own tint is unreadable (no lightness helps then). */
  tintHint: string;
  /**
   * Contrast repair button of a field ("Fix"): changes the colour's lightness, and lowers the accent strength just
   * enough when no lightness works.
   */
  fixContrast: string;
  /** Accessible name of the repair button, e.g. `"Make Primary readable"`. */
  fixContrastField: (field: string) => string;
  /** Light tab: derive the light accents from the dark ones. */
  deriveLight: string;
  deriveLightHint: string;
  undo: string;
  redo: string;
  /** Back to the last saved state (or the state the editor opened with). */
  discard: string;
  /** Marker while the theme differs from the saved state. */
  unsaved: string;
  importTitle: string;
  importPlaceholder: string;
  importApply: string;
  importErrors: Record<"json" | "shape" | "version" | "size" | "code", string>;
  /** After an import that dropped some entries. */
  importWarnings: (count: number, list: string) => string;
  importDone: string;
  savePreset: string;
  presetName: string;
  savePresetConfirm: string;
  /** Accessible name of the menu button on a saved preset, e.g. `"Actions for My theme"`. */
  presetActions: (preset: string) => string;
  renamePreset: string;
  renamePresetTitle: string;
  renamePresetConfirm: string;
  deletePreset: string;
  deletePresetTitle: (preset: string) => string;
  deletePresetText: string;
  deletePresetConfirm: string;
  cancel: string;
  advanced: string;
  advancedHint: string;
  /** Preview pane: the built-in sample sets. */
  sampleWeb: string;
  sampleGame: string;
  /** Button that fixes every fixable contrast problem at once (status bar, colour and contrast tabs, accent hint). */
  fixAll: string;
  /** Accessible name of the "Fix all" button of one scheme's tab, e.g. `"Fix all problems in Dark"`. */
  fixAllScheme: (scheme: string) => string;
  /** Share section (`shareable`): the own theme code, its hint, and the field for someone else's code. */
  shareCode: string;
  shareHint: string;
  sharePaste: string;
  sharePlaceholder: string;
  shareApply: string;
  /** `layout="sidebar"`: accessible name of the navigation. */
  navigation: string;
  /** `layout="sidebar"`: the collapse button at the bottom of the navigation, and its tooltip while collapsed. */
  collapse: string;
  expand: string;
  /** `layout="sidebar"`: accessible name of the toggle in the header and on the navigation's edge. */
  toggleNavigation: string;
  /** `layout="sidebar"`: names of the navigation entries. */
  pages: Record<ThemeEditorPage, string>;
  /** `layout="sidebar"`: second line of the navigation entries. */
  pageHints: Record<ThemeEditorPage, string>;
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
    "primary/primary": "Primary text on its tint",
    "positive/positive": "Positive text on its tint",
    "negative/negative": "Negative text on its tint",
    "warning/warning": "Warning text on its tint",
    "info/info": "Info text on its tint",
  },
  otherPairs: "Other pairs",
  shared: "Font",
  radius: "Corner radius",
  radiusValue: (value) => `${value} rem`,
  font: "Font",
  fontDefault: "Inter (default)",
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
  style: "Style",
  surfaceOpacity: "Panel opacity",
  tintScale: "Accent strength",
  borderOpacity: "Borders",
  shadowScale: "Shadows",
  percentValue: (value) => `${value} %`,
  transparencyHint: "See-through panels: readability also depends on what is behind them (the contrast check assumes opaque panels).",
  tintHint:
    "At this accent strength coloured text on its own tint can't be read. Lower it, or fix the colours: that lowers the strength just enough.",
  fixContrast: "Fix",
  fixContrastField: (field) => `Make ${field} readable`,
  deriveLight: "From dark",
  deriveLightHint: "Take the accent and status colours of the dark scheme and make them readable on light.",
  undo: "Undo",
  redo: "Redo",
  discard: "Discard changes",
  unsaved: "Unsaved changes",
  importTitle: "Import",
  importPlaceholder: "Paste a theme (JSON or theme code)",
  importApply: "Apply",
  importErrors: {
    json: "That is not valid JSON.",
    shape: "That is not a theme (expected a JSON object).",
    version: "Unknown theme version (expected v: 1).",
    size: "The text is too long for a theme.",
    code: "That is not a valid theme code.",
  },
  importWarnings: (count, list) => `Applied. ${count === 1 ? "1 entry was" : `${count} entries were`} left out: ${list}`,
  importDone: "Applied.",
  savePreset: "Save as preset",
  presetName: "Preset name",
  savePresetConfirm: "Save preset",
  presetActions: (preset) => `Actions for ${preset}`,
  renamePreset: "Rename",
  renamePresetTitle: "Rename preset",
  renamePresetConfirm: "Rename",
  deletePreset: "Delete",
  deletePresetTitle: (preset) => `Delete "${preset}"?`,
  deletePresetText: "The preset is removed from the list. The theme you are editing stays as it is.",
  deletePresetConfirm: "Delete",
  cancel: "Cancel",
  advanced: "All colours",
  advancedHint: "Every colour token of this scheme. Values set here win over the base colours above.",
  sampleWeb: "Interface",
  sampleGame: "Game",
  fixAll: "Fix all",
  fixAllScheme: (scheme) => `Fix all problems in ${scheme}`,
  shareCode: "Your theme code",
  shareHint: "Anyone who pastes this code gets your theme.",
  sharePaste: "Theme code from someone else",
  sharePlaceholder: "PUI1.…",
  shareApply: "Apply",
  navigation: "Theme editor sections",
  collapse: "Collapse",
  expand: "Expand",
  toggleNavigation: "Toggle navigation",
  pages: {
    presets: "Presets",
    colors: "Colors",
    style: "Style",
    contrast: "Contrast",
    share: "Share",
    advanced: "Advanced",
  },
  pageHints: {
    presets: "Ready-made looks",
    colors: "Scheme and base colours",
    style: "Corners, opacity, font",
    contrast: "Check readability",
    share: "Pass your theme on, take someone else's",
    advanced: "All colours, import, export",
  },
};

type ThemeEditorLabelsInput = Partial<Omit<ThemeEditorLabels, "fields" | "pairs" | "schemes" | "pages" | "pageHints">> & {
  fields?: Partial<ThemeEditorLabels["fields"]>;
  pairs?: Partial<ThemeEditorLabels["pairs"]>;
  schemes?: Partial<ThemeEditorLabels["schemes"]>;
  pages?: Partial<ThemeEditorLabels["pages"]>;
  pageHints?: Partial<ThemeEditorLabels["pageHints"]>;
};

// ------------------------------------------------------------------------------------------------
// Props
// ------------------------------------------------------------------------------------------------

/** Sections of the editor, for `sections`. */
export type ThemeEditorSection =
  | "presets"
  | "scheme"
  | "colors"
  | "contrast"
  | "style"
  | "font"
  | "advanced"
  | "import"
  | "export"
  | "share";

/**
 * Pages of `layout="sidebar"` and the sections each one shows: `presets` (presets), `colors` (scheme, colors),
 * `style` (style, font), `contrast` (contrast), `share` (share), `advanced` (advanced, import, export). A page whose
 * sections are all hidden is left out of the navigation.
 */
export type ThemeEditorPage = "presets" | "colors" | "style" | "contrast" | "share" | "advanced";

const pageSections: Record<ThemeEditorPage, readonly ThemeEditorSection[]> = {
  presets: ["presets"],
  colors: ["scheme", "colors"],
  style: ["style", "font"],
  contrast: ["contrast"],
  share: ["share"],
  advanced: ["advanced", "import", "export"],
};
const pageIcons: Record<ThemeEditorPage, "layers" | "palette" | "slidersHorizontal" | "contrast" | "share" | "settings"> = {
  presets: "layers",
  colors: "palette",
  style: "slidersHorizontal",
  contrast: "contrast",
  share: "share",
  advanced: "settings",
};
const allPages = Object.keys(pageSections) as ThemeEditorPage[];

export type ThemeEditorExportFormat = "css" | "json";

/** Built-in sample content of the split preview: an interface (`"web"`) or game-style windows (`"game"`). */
export type ThemeEditorSample = "web" | "game";

const allSamples: readonly ThemeEditorSample[] = ["web", "game"];

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
  /**
   * Font choices for `--pui-font-sans`. @default defaultThemeEditorFonts — 20 curated families whose entries carry
   * only the file *names* (`files`), resolved against `fontSrcBase`. `[]` hides the font section.
   */
  fonts?: readonly ThemeEditorFont[];
  /**
   * Where the `.woff2` files of the font choices live, e.g. `"https://cfx-nui-pre_lib/theme/fonts/"` or `"/fonts/"`.
   * Each entry's `files` names are appended to it. **preUI ships no font files** — without a base URL the families
   * are still offered as plain `font-family` values (fine when they are installed or loaded elsewhere), but nothing
   * is downloaded and the theme stores no `fonts.sans`.
   */
  fontSrcBase?: string;
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
  /** Show the import section (paste a theme as JSON; checked, applied as one undoable change). @default false */
  importable?: boolean;
  /** Called after an import was applied, with the entries it left out (unknown tokens, invalid colours …). */
  onImport?: (config: ThemeConfig, droppedEntries: string[]) => void;
  /**
   * Show the share section: the theme as a code to copy (`encodeThemeCode`, e.g. `PUI1.eyJ2Ijox…`) and a field to paste
   * someone else's code — checked like an import, one undoable change, reported through `onImport`. @default false
   */
  shareable?: boolean;
  /**
   * Shows "Save as preset" under the presets: the current theme with a name the user types. Store it and pass it back
   * in `presets` (e.g. a server's `presets.lua`).
   */
  onSavePreset?: (preset: ThemePreset) => void;
  /**
   * Shows "Delete" in the menu of presets marked `removable` (the ones saved with "Save as preset" are). Called after
   * the user confirmed; remove the preset from `presets`. The theme being edited doesn't change.
   */
  onDeletePreset?: (preset: ThemePreset) => void;
  /** Shows "Rename" in the menu of presets marked `removable`; called with the new name (trimmed, not empty). */
  onRenamePreset?: (preset: ThemePreset, label: string) => void;
  /**
   * The saved theme, for "unsaved changes" and "Discard changes". Default: the value the editor opened with, then
   * whatever was last saved through `onSave`.
   */
  savedValue?: ThemeConfig | null;
  /**
   * Which sections to show, in their fixed order. Default: all of presets, scheme, colors, contrast, style, font (with
   * `fonts`), advanced, plus import / export / share when `importable` / `exportable` / `shareable`.
   */
  sections?: readonly ThemeEditorSection[];
  /** Built-in sample of the split preview to start with. @default "web" */
  defaultSample?: ThemeEditorSample;
  /**
   * Built-in samples of the split preview the user can switch between. With one entry (e.g. `["web"]`) the switch is
   * hidden and only that sample is shown. @default ["web", "game"]
   */
  samples?: readonly ThemeEditorSample[];
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
   * `"sidebar"`: like `"split"`, plus a `Sidebar` navigation on the left that shows one page of sections at a time
   * (`ThemeEditorPage`); below `lg` the navigation becomes a row above the controls. Give it room: e.g. `h-[52rem]`.
   * @default "stacked"
   */
  layout?: "stacked" | "split" | "sidebar";
  /** `layout="sidebar"`: the open page (controlled). */
  page?: ThemeEditorPage;
  /** `layout="sidebar"`: the page to start with. @default "presets" (the first one shown) */
  defaultPage?: ThemeEditorPage;
  onPageChange?: (page: ThemeEditorPage) => void;
  labels?: ThemeEditorLabelsInput;
  /** Number formatting (contrast ratios, radius). @default "en-US" */
  locale?: string;
}

const schemeList: PreuiScheme[] = ["dark", "light"];

/** Whether the dark palette sets an accent or status colour (something "From dark" can carry over). */
const hasDarkAccents = (config: ThemeConfig) =>
  Object.keys(config.palette?.dark ?? {}).some((key) => key !== "background" && key !== "foreground");

const eyebrow = "text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground";

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
    fontSrcBase,
    preview = true,
    previewId = "preui-theme-editor-preview",
    previewSlot,
    actionsSlot,
    exportable = false,
    importable = false,
    onImport,
    shareable = false,
    onSavePreset,
    onDeletePreset,
    onRenamePreset,
    savedValue,
    sections: sectionsProp,
    defaultSample = "web",
    samples: samplesProp = allSamples,
    onExport,
    editingScheme: editingProp,
    defaultEditingScheme,
    onEditingSchemeChange,
    fallbackScheme = "dark",
    minContrast = 4.5,
    variant = "panel",
    layout = "stacked",
    page: pageProp,
    defaultPage = "presets",
    onPageChange,
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
      pages: { ...defaultThemeEditorLabels.pages, ...labelsProp?.pages },
      pageHints: { ...defaultThemeEditorLabels.pageHints, ...labelsProp?.pageHints },
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

  // Undo / redo: every change pushes the previous config; changes ≤ 400 ms apart (a slider or colour drag) are one step.
  const history = useRef<{ past: ThemeConfig[]; future: ThemeConfig[]; last: number }>({ past: [], future: [], last: 0 });
  const [, setHistoryVersion] = useState(0);

  const commit = useCallback(
    (next: ThemeConfig, record = true) => {
      const previous = configRef.current;
      const normalized = normalizeThemeConfig(next, fallbackScheme);
      if (JSON.stringify(normalized) === JSON.stringify(previous)) return previous;
      if (record) {
        const steps = history.current;
        const now = Date.now();
        if (steps.past.length === 0 || now - steps.last > 400) steps.past.push(previous);
        if (steps.past.length > 100) steps.past.shift();
        steps.last = now;
        steps.future = [];
      }
      configRef.current = normalized;
      if (!controlled) setInner(normalized);
      onChangeRef.current?.(normalized);
      setHistoryVersion((version) => version + 1);
      return normalized;
    },
    [controlled, fallbackScheme, configRef, onChangeRef],
  );
  const update = useCallback((recipe: (current: ThemeConfig) => ThemeConfig) => commit(recipe(configRef.current)), [commit, configRef]);
  const undo = useCallback(() => {
    const steps = history.current;
    const previous = steps.past.pop();
    if (!previous) return;
    steps.future.push(configRef.current);
    steps.last = 0;
    commit(previous, false);
  }, [commit, configRef]);
  const redo = useCallback(() => {
    const steps = history.current;
    const next = steps.future.pop();
    if (!next) return;
    steps.past.push(configRef.current);
    steps.last = 0;
    commit(next, false);
  }, [commit, configRef]);

  // Saved state: `savedValue`, else what the editor opened with, then the last `onSave`.
  const [baseline, setBaseline] = useState(() => JSON.stringify(normalizeThemeConfig(savedValue ?? raw, fallbackScheme)));
  useEffect(() => {
    if (savedValue !== undefined) setBaseline(JSON.stringify(normalizeThemeConfig(savedValue, fallbackScheme)));
  }, [savedValue, fallbackScheme]);
  const dirty = JSON.stringify(config) !== baseline;
  const discard = () => commit(JSON.parse(baseline) as ThemeConfig);

  const sections = useMemo(
    () =>
      new Set<ThemeEditorSection>(
        sectionsProp ?? [
          "presets",
          "scheme",
          "colors",
          "contrast",
          "style",
          "font",
          "advanced",
          ...(importable ? (["import"] as const) : []),
          ...(exportable ? (["export"] as const) : []),
          ...(shareable ? (["share"] as const) : []),
        ],
      ),
    [sectionsProp, importable, exportable, shareable],
  );
  const show = (section: ThemeEditorSection) => sections.has(section);
  const samples = samplesProp.length > 0 ? samplesProp : allSamples;
  const [sampleState, setSample] = useState<ThemeEditorSample>(defaultSample);
  // Falls back to the first allowed sample when `samples` doesn't contain the chosen one (also if it changes later).
  const sample = samples.includes(sampleState) ? sampleState : samples[0];

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
    const all = effective.dark as Record<string, string>;
    const shared: Record<string, string> = {
      ...Object.fromEntries(
        ["radius", "font-sans", ...styleTokenKeys.filter((key) => key !== "radius")].map((key) => [`--pui-${key}`, all[`--pui-${key}`]]),
      ),
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
  // Popups opened in the preview (Select, menus, Tooltip, Dialog …) portal into this layer inside the scoped wrapper,
  // so they inherit the edited tokens and `data-scheme` instead of the page's.
  const [portalLayer, setPortalLayer] = useState<HTMLDivElement | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const save = () => {
    const saved = configRef.current;
    const result = onSave?.(saved);
    const markSaved = () => {
      if (mounted.current && savedValue === undefined) setBaseline(JSON.stringify(saved));
    };
    if (result && typeof (result as Promise<unknown>).then === "function") {
      setSaving(true);
      (result as Promise<unknown>).then(
        () => {
          if (mounted.current) setSaving(false);
          markSaved();
        },
        () => mounted.current && setSaving(false),
      );
    } else {
      markSaved();
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.altKey) return;
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, [contenteditable]:not([contenteditable='false'])")) return;
    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) undo();
    else if ((key === "z" && event.shiftKey) || key === "y") redo();
    else return;
    event.preventDefault();
  };
  const reset = () => {
    const next = commit({ ...configRef.current, palette: {}, tokens: undefined });
    onReset?.(next);
  };

  const Check = useIcon("check");
  const Warning = useIcon("warning");
  const UndoIcon = useIcon("undo");
  const RedoIcon = useIcon("redo");
  const id = useId();

  const sidebar = layout === "sidebar";
  // The sidebar layout has the same preview pane as split.
  const split = layout === "split" || sidebar;
  const fontChoices = useMemo(
    () => resolveThemeEditorFonts(fonts ?? defaultThemeEditorFonts, fontSrcBase),
    [fonts, fontSrcBase],
  );
  // See-through panels only show on something busy: the preview then gets a backdrop (see PreviewBackdrop).
  const seeThrough = Number(effective[editing]["--pui-surface-opacity" as PreuiTokenName]) < 1;

  const schemeSummary = (scheme: PreuiScheme) => {
    const count = problemCount(scheme);
    return labels.statusScheme(labels.schemes[scheme], count === 0 ? labels.allReadable : labels.problems(count));
  };

  // ---- pages (layout="sidebar") -------------------------------------------------------------------
  const hasContent = (section: ThemeEditorSection) => {
    if (!show(section)) return false;
    if (section === "presets") return presets.length > 0 || Boolean(onSavePreset);
    if (section === "font") return fontChoices.length > 0;
    return true;
  };
  const pages = allPages.filter((name) => pageSections[name].some(hasContent));
  const [innerPage, setInnerPage] = useState<ThemeEditorPage>(defaultPage);
  const requestedPage = pageProp ?? innerPage;
  const page = pages.includes(requestedPage) ? requestedPage : pages[0];
  const setPage = (next: ThemeEditorPage) => {
    if (pageProp === undefined) setInnerPage(next);
    onPageChange?.(next);
  };

  // ---- fix all ------------------------------------------------------------------------------------
  const fixable = (scheme: PreuiScheme) => hasFixableProblems(config, scheme, contrast[scheme], minContrast);
  const fixAll = (schemes: readonly PreuiScheme[]) => update((current) => fixAllContrast(current, schemes, minContrast));
  const anyFixable = schemeList.some(fixable);

  // ---- sections -----------------------------------------------------------------------------------
  /**
   * Dark / Light tabs bound to the editing scheme (with a warning icon on a scheme with problems), and "Fix all" for
   * the open tab's scheme on the right of the tab row (over its empty end, so nothing moves when it appears).
   */
  const schemeTabs = (content: (scheme: PreuiScheme) => ReactNode) => (
    <Tabs value={editing} onValueChange={(next) => setEditing(next as PreuiScheme)} className="gap-3">
      <div className="relative">
        <TabsList>
          {schemeList.map((scheme) => (
            <TabsTrigger key={scheme} value={scheme} data-problems={problemCount(scheme)}>
              {labels.schemes[scheme]}
              {/* Always in the layout (invisible while readable), so the tab keeps its width. */}
              <Warning className={cn("size-3.5 text-pui-warning", problemCount(scheme) === 0 && "invisible")} aria-hidden="true" />
            </TabsTrigger>
          ))}
        </TabsList>
        {fixable(editing) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => fixAll([editing])}
            aria-label={labels.fixAllScheme(labels.schemes[editing])}
            data-slot="theme-editor-fix-all-scheme"
            className="absolute right-0 top-1/2 h-7 -translate-y-1/2 px-2 text-xs"
          >
            {labels.fixAll}
          </Button>
        )}
      </div>
      {schemeList.map((scheme) => (
        <TabsContent key={scheme} value={scheme} className="flex flex-col gap-5">
          {content(scheme)}
        </TabsContent>
      ))}
    </Tabs>
  );

  const contrastDetails = (scheme: PreuiScheme) => (
    <ContrastDetails scheme={scheme} results={contrast[scheme]} labels={labels} locale={locale} minContrast={minContrast} />
  );

  const presetsSection = hasContent("presets") && (
    <div className="flex flex-col gap-2">
      {presets.length > 0 && (
        <PresetPicker
          presets={presets}
          config={config}
          labels={labels}
          minContrast={minContrast}
          onPick={(preset) => update((current) => applyPreset(current, preset))}
          onDelete={onDeletePreset}
          onRename={onRenamePreset}
        />
      )}
      {onSavePreset && <SavePresetForm config={config} labels={labels} onSave={onSavePreset} />}
    </div>
  );

  const schemeSection = show("scheme") && (
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
  );

  const colorsSection = show("colors") && (
    <section data-slot="theme-editor-colors" className="flex flex-col gap-2">
      <span className={eyebrow}>{labels.colors}</span>
      {schemeTabs((scheme) => (
        <>
          {scheme === "light" && hasDarkAccents(config) && (
            <div data-slot="theme-editor-derive-light" className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => update((current) => deriveLightFromDark(current, minContrast))}
              >
                {labels.deriveLight}
              </Button>
              <span className="min-w-0 text-xs text-pui-muted-foreground">{labels.deriveLightHint}</span>
            </div>
          )}
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
                onFix={
                  hasRawColorToken(config, scheme, key)
                    ? undefined
                    : () => update((current) => fixFieldContrastWithTint(current, scheme, key, minContrast) ?? current)
                }
              />
            ))}
          </ul>
          {/* The sidebar layout shows the contrast details on their own page. */}
          {!sidebar && show("contrast") && contrastDetails(scheme)}
        </>
      ))}
    </section>
  );

  const contrastPage = show("contrast") && (
    <section data-slot="theme-editor-contrast-page" className="flex flex-col gap-2">
      {schemeTabs(contrastDetails)}
    </section>
  );

  const advancedSection = show("advanced") && (
    <AdvancedSection
      config={config}
      scheme={editing}
      effective={effective[editing]}
      labels={labels}
      update={update}
      defaultOpen={sidebar}
    />
  );

  const stackedPreview = !split && previewSlot != null && (
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
        <PortalContainerProvider container={portalLayer}>{previewSlot}</PortalContainerProvider>
        <PreviewPortalLayer ref={setPortalLayer} />
      </div>
    </section>
  );

  // A colour as text on its own tint fails: the accent strength is too high for any lightness (hint at its slider).
  const tintTooStrong = schemeList.some((scheme) =>
    contrast[scheme].some((result) => isOwnTintPair(result) && result.ratio < minContrast),
  );
  const styleSection = show("style") && (
    <StyleSection
      config={config}
      labels={labels}
      locale={locale}
      update={update}
      tintTooStrong={tintTooStrong}
      onFixAll={anyFixable ? () => fixAll(schemeList) : undefined}
    />
  );
  const fontSection = hasContent("font") && <FontSection config={config} fonts={fontChoices} labels={labels} update={update} />;
  const importSection = show("import") && (
    <ImportSection
      fallbackScheme={fallbackScheme}
      labels={labels}
      onApply={(imported, dropped) => {
        commit(imported);
        onImport?.(imported, dropped);
      }}
    />
  );
  const exportSection = show("export") && (
    <ExportSection config={config} resolvedCss={resolved} labels={labels} onExport={onExport} />
  );
  const shareSection = show("share") && (
    <ShareSection
      config={config}
      fallbackScheme={fallbackScheme}
      labels={labels}
      onApply={(imported, dropped) => {
        commit(imported);
        onImport?.(imported, dropped);
      }}
    />
  );

  const controls = sidebar ? (
    <>
      {page === "presets" && presetsSection}
      {page === "colors" && (
        <>
          {schemeSection}
          {colorsSection}
        </>
      )}
      {page === "style" && (
        <>
          {styleSection}
          {fontSection}
        </>
      )}
      {page === "contrast" && contrastPage}
      {page === "share" && shareSection}
      {page === "advanced" && (
        <>
          {advancedSection}
          {importSection}
          {exportSection}
        </>
      )}
    </>
  ) : (
    <>
      {presetsSection}
      {schemeSection}
      {colorsSection}
      {advancedSection}
      {stackedPreview}
      {styleSection}
      {fontSection}
      {importSection}
      {exportSection}
      {shareSection}
    </>
  );

  const totalProblems = problemCount("dark") + problemCount("light");

  // Contrast status of both schemes (pills that switch the edited scheme) and "Fix all" for both.
  const statusItems = (
    <>
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
            {/*
              Stable width: the widest summaries ("all readable", the most problems possible) are stacked invisibly
              in the same grid cell as pseudo-elements (not part of the text content), so the badge doesn't grow
              or shrink while a slider or colour changes the result.
            */}
            <span
              data-reserve-a={labels.statusScheme(labels.schemes[scheme], labels.allReadable)}
              data-reserve-b={labels.statusScheme(labels.schemes[scheme], labels.problems(allPairKeys.length))}
              className={cn(
                "inline-grid tabular-nums",
                "before:invisible before:col-start-1 before:row-start-1 before:content-[attr(data-reserve-a)]",
                "after:invisible after:col-start-1 after:row-start-1 after:content-[attr(data-reserve-b)]",
              )}
            >
              <span aria-live="polite" className="col-start-1 row-start-1">
                {schemeSummary(scheme)}
              </span>
            </span>
          </button>
        );
      })}
      {anyFixable && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fixAll(schemeList)}
          data-slot="theme-editor-fix-all"
          className="h-6 px-2.5 text-xs"
        >
          {labels.fixAll}
        </Button>
      )}
    </>
  );

  // The sidebar layout draws its panels like `variant="panel"` inside the sidebar's inset.
  const framed = variant === "panel" || sidebar;

  const body = (
    <div
      data-slot="theme-editor-body"
      data-layout={layout}
      className={cn("flex min-h-0 flex-1 flex-col", split && ["lg:flex-row", !framed && "gap-4 lg:gap-6"])}
    >
      <ScrollArea
        // A new page starts at the top.
        key={sidebar ? page : undefined}
        data-page={sidebar ? page : undefined}
        // Sidebar: the controls get a bit more room than the preview (6 : 5), so colour names don't truncate next to a
        // contrast badge and its Fix button.
        className={cn("min-h-0 flex-1", sidebar ? "lg:min-w-0 lg:flex-[6_6_0%]" : split && "lg:w-[26rem] lg:flex-none")}
        contentClassName={cn("flex flex-col gap-6", framed ? "p-4" : "py-4")}
      >
        {controls}
      </ScrollArea>

      {split && (
        <section
          data-slot="theme-editor-preview"
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            sidebar && "lg:min-w-0 lg:flex-[5_5_0%]",
            framed
              ? "border-t border-pui-border lg:border-l lg:border-t-0"
              : "mb-4 rounded-pui border border-pui-border lg:my-4",
          )}
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-pui-border px-4 py-2">
            <span id={`${id}-preview`} className={eyebrow}>
              {labels.preview}
            </span>
            {previewSlot == null && samples.length > 1 && (
              <ToggleGroup
                aria-label={labels.preview}
                value={[sample]}
                onValueChange={(next) => next[0] && setSample(next[0] as ThemeEditorSample)}
                data-slot="theme-editor-sample-switch"
                className="ml-auto"
              >
                {samples.map((name) => (
                  <ToggleGroupItem key={name} value={name}>
                    {name === "web" ? labels.sampleWeb : labels.sampleGame}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
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
          <div
            data-scheme={editing}
            style={effective[editing] as CSSProperties}
            className="relative flex min-h-0 flex-1 flex-col font-sans text-pui-foreground"
          >
            {seeThrough && <PreviewBackdrop />}
            <ScrollArea className="relative min-h-0 flex-1 bg-pui-background" contentClassName="p-4 lg:p-6">
              <PortalContainerProvider container={portalLayer}>
                {previewSlot ?? <ThemeEditorPreview labels={labels.sample} sample={sample} />}
              </PortalContainerProvider>
            </ScrollArea>
            <PreviewPortalLayer ref={setPortalLayer} />
          </div>
        </section>
      )}
    </div>
  );

  const actions = (
    <div
      data-slot="theme-editor-actions"
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-pui-border",
        framed ? "px-4 py-3" : "pt-3",
      )}
    >
      {actionsSlot != null && <div className="flex items-center gap-2">{actionsSlot}</div>}
      <div className="mr-auto flex items-center gap-1">
        <IconButton
          label={labels.undo}
          icon={<UndoIcon />}
          size="sm"
          disabled={history.current.past.length === 0}
          onClick={undo}
          data-slot="theme-editor-undo"
        />
        <IconButton
          label={labels.redo}
          icon={<RedoIcon />}
          size="sm"
          disabled={history.current.future.length === 0}
          onClick={redo}
          data-slot="theme-editor-redo"
        />
        {/* Always in the layout (invisible when saved), so nothing shifts when it appears. */}
        <span
          data-slot="theme-editor-unsaved"
          aria-hidden={!dirty}
          className={cn("ml-1 text-xs text-pui-muted-foreground", !dirty && "invisible")}
        >
          {labels.unsaved}
        </span>
      </div>
      <Button variant="ghost" onClick={discard} disabled={!dirty} data-slot="theme-editor-discard">
        {labels.discard}
      </Button>
      <Button variant="ghost" onClick={reset} disabled={!hasOverrides(config)} data-slot="theme-editor-reset">
        {labels.reset}
      </Button>
      {onSave && (
        <Button variant="solid" onClick={save} loading={saving} data-slot="theme-editor-save">
          {labels.save}
        </Button>
      )}
    </div>
  );

  if (sidebar) {
    return (
      <div
        ref={ref}
        data-slot="theme-editor"
        data-variant={variant}
        data-layout={layout}
        className={cn(
          // `relative`: the navigation is positioned inside the editor, not at the viewport edge.
          "relative flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-pui bg-pui-shell text-sm text-pui-foreground",
          variant === "panel" && "border border-pui-border",
          className,
        )}
        {...props}
        onKeyDown={onKeyDown}
      >
        {/* An embedded sidebar: no Ctrl+B, no cookie (the page's own sidebar keeps its state), the page's tooltip delay. */}
        <SidebarProvider keyboardShortcut={false} cookieName={false} tooltipDelay={false} className="min-h-0 flex-1">
          <ThemeEditorNav pages={pages} page={page} onPage={setPage} labels={labels} problems={totalProblems} />
          <SidebarInset render={<div />} data-slot="theme-editor-main" className="min-h-0">
            <header
              data-slot="theme-editor-header"
              className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-pui-border px-3 py-2"
            >
              <SidebarTrigger label={labels.toggleNavigation} />
              <Separator orientation="vertical" className="data-[orientation=vertical]:h-5" />
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 data-slot="theme-editor-page-title" className="truncate text-base font-semibold text-pui-foreground">
                  {labels.pages[page]}
                </h2>
                <span className="truncate text-xs text-pui-muted-foreground">{labels.pageHints[page]}</span>
              </div>
              <div
                data-slot="theme-editor-status"
                role="group"
                aria-label={labels.status}
                className="flex flex-wrap items-center gap-1.5"
              >
                {statusItems}
              </div>
            </header>
            {body}
            {actions}
          </SidebarInset>
        </SidebarProvider>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-slot="theme-editor"
      data-variant={variant}
      data-layout={layout}
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-col text-sm text-pui-foreground",
        variant === "panel" && "rounded-pui border border-pui-border bg-pui-card text-pui-card-foreground",
        className,
      )}
      {...props}
      onKeyDown={onKeyDown}
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
        {statusItems}
      </div>
      {body}
      {actions}
    </div>
  );
});

// ------------------------------------------------------------------------------------------------
// Navigation (layout="sidebar")
// ------------------------------------------------------------------------------------------------

function PageIcon({ name }: { name: ThemeEditorPage }) {
  const Icon = useIcon(pageIcons[name]);
  return <Icon aria-hidden="true" />;
}

/**
 * preUI's `Sidebar` (inset, collapsible to the icon rail; a sheet on small screens) with one entry per page and a
 * collapse button at the bottom. A component of its own because it reads the sidebar state.
 */
function ThemeEditorNav({
  pages,
  page,
  onPage,
  labels,
  problems,
}: {
  pages: readonly ThemeEditorPage[];
  page: ThemeEditorPage;
  onPage: (page: ThemeEditorPage) => void;
  labels: ThemeEditorLabels;
  problems: number;
}) {
  const { open, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const ToggleIcon = useIcon(open ? "panelLeftClose" : "panelLeftOpen");
  return (
    <Sidebar variant="inset" collapsible="icon" mobileTitle={labels.navigation} className="absolute h-full">
      <SidebarContent className="pt-1">
        <nav aria-label={labels.navigation} data-slot="theme-editor-nav">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {pages.map((name) => (
                  <SidebarMenuItem key={name}>
                    <SidebarMenuButton
                      isActive={page === name}
                      tooltip={labels.pages[name]}
                      data-page={name}
                      onClick={() => {
                        onPage(name);
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <PageIcon name={name} />
                      <span>{labels.pages[name]}</span>
                    </SidebarMenuButton>
                    {name === "contrast" && problems > 0 && (
                      <SidebarMenuBadge variant="warning" data-slot="theme-editor-nav-problems">
                        <span aria-hidden="true">{problems}</span>
                        <span className="sr-only">{labels.problems(problems)}</span>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>
      {!isMobile && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={toggleSidebar} tooltip={labels.expand} data-slot="theme-editor-nav-toggle">
                <ToggleIcon aria-hidden="true" />
                <span>{labels.collapse}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <SidebarRail label={labels.toggleNavigation} />
    </Sidebar>
  );
}

/**
 * Stand-in for what lies behind see-through panels (the game in FiveM): flat shapes in the theme's own colours, no
 * gradients. Without it a translucent dark panel on a dark pane looks exactly like an opaque one.
 */
/**
 * Portal target for popups opened in the preview: a child of the scoped wrapper (inherits its tokens, `data-scheme`
 * and font) but `fixed` at the viewport origin with no size, so it sits outside the preview's `overflow` clipping and
 * `fixed`/`absolute` popups position against the viewport as usual. Takes no space and catches no pointer events.
 */
const PreviewPortalLayer = /* @__PURE__ */ forwardRef<HTMLDivElement>(function PreviewPortalLayer(_props, ref) {
  return <div ref={ref} data-slot="theme-editor-portal" className="fixed left-0 top-0 z-50 size-0" />;
});

function PreviewBackdrop() {
  const shape = (token: string) => ({ fill: `hsl(var(--pui-${token}))` });
  return (
    <svg
      aria-hidden="true"
      data-slot="theme-editor-backdrop"
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
    >
      <circle cx="70" cy="70" r="70" style={shape("primary")} />
      <rect x="230" y="20" width="150" height="110" rx="16" style={shape("info")} />
      <circle cx="320" cy="230" r="60" style={shape("warning")} />
      <rect x="40" y="180" width="170" height="90" rx="16" style={shape("positive")} />
      <circle cx="190" cy="150" r="40" style={shape("negative")} />
    </svg>
  );
}

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

function PresetPicker({
  presets,
  config,
  labels,
  minContrast,
  onPick,
  onDelete,
  onRename,
}: {
  presets: readonly ThemePreset[];
  config: ThemeConfig;
  labels: ThemeEditorLabels;
  minContrast: number;
  onPick: (preset: ThemePreset) => void;
  onDelete?: (preset: ThemePreset) => void;
  onRename?: (preset: ThemePreset, label: string) => void;
}) {
  const [pending, setPending] = useState<PendingPresetAction>(null);
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

  // Groups in the order of their first preset; one unnamed group (no headings) when no preset has a `group`.
  const groups = useMemo(() => {
    const out: { name: string | undefined; items: typeof info }[] = [];
    for (const entry of info) {
      const name = entry.preset.group;
      const group = out.find((candidate) => candidate.name === name);
      if (group) group.items.push(entry);
      else out.push({ name, items: [entry] });
    }
    return out;
  }, [info]);
  const grouped = groups.some((group) => group.name !== undefined);

  const item = ({ preset, problems, swatches }: (typeof info)[number]) => {
    const selected = matchesPreset(config, preset);
    const actions = preset.removable === true && Boolean(onDelete || onRename);
    return (
      // The wrapper holds the entry and, for saved presets, the menu button next to (not inside) it.
      <div key={preset.id} data-slot="theme-editor-preset-item" className="relative flex min-w-0">
        <Item
          variant="outline"
          size="sm"
          render={<button type="button" />}
          data-slot="theme-editor-preset"
          data-preset={preset.id}
          data-selected={selected ? "" : undefined}
          data-contrast={problems === 0 ? "pass" : "fail"}
          aria-pressed={selected}
          onClick={() => onPick(preset)}
          className={cn(
            "w-full min-w-0 flex-nowrap gap-3 rounded-pui-md px-2.5 py-2",
            // Room for the menu button, which lies over the right edge.
            actions && "pr-11",
            selected && "border-pui-primary/tint-border bg-pui-primary/tint [button&]:hover:bg-pui-primary/tint",
          )}
        >
          {/* Dark | light: background with the primary as a dot. */}
          <ItemMedia
            aria-hidden="true"
            data-slot="theme-editor-preset-swatch"
            className="h-9 w-14 gap-0 overflow-hidden rounded-pui-sm border border-pui-border"
          >
            {swatches.map((swatch, index) => (
              <span
                key={index}
                className="flex h-full min-w-0 flex-1 basis-0 items-center justify-center"
                style={{ backgroundColor: `hsl(${swatch.background})` }}
              >
                <span className="size-3 rounded-full" style={{ backgroundColor: `hsl(${swatch.primary})` }} />
              </span>
            ))}
          </ItemMedia>
          <ItemContent className="gap-0.5">
            <ItemTitle className="w-full min-w-0">
              <span className="truncate">{preset.label}</span>
            </ItemTitle>
            {preset.description && (
              <ItemDescription className="line-clamp-2 text-xs leading-snug">{preset.description}</ItemDescription>
            )}
          </ItemContent>
          {problems === 0 ? (
            <span data-slot="theme-editor-preset-contrast" className="inline-flex shrink-0 text-pui-positive">
              <Check className="size-4" aria-hidden="true" />
              <span className="sr-only">{labels.presetReadable}</span>
            </span>
          ) : (
            <span
              data-slot="theme-editor-preset-contrast"
              className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-pui-warning/tint-border bg-pui-warning/tint px-2 text-xs font-medium tabular-nums text-pui-warning"
            >
              <Warning className="size-3.5 shrink-0" aria-hidden="true" />
              <span aria-hidden="true">{labels.problems(problems)}</span>
              <span className="sr-only">{labels.presetProblems(problems)}</span>
            </span>
          )}
        </Item>
        {actions && (
          <PresetActionsMenu
            preset={preset}
            labels={labels}
            canRename={Boolean(onRename)}
            canDelete={Boolean(onDelete)}
            onAction={setPending}
          />
        )}
      </div>
    );
  };
  const list = "grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-2";

  return (
    <section
      data-slot="theme-editor-presets"
      aria-labelledby={grouped ? undefined : `${id}-presets`}
      aria-label={grouped ? labels.presets : undefined}
      className="flex flex-col gap-2"
    >
      {grouped ? (
        groups.map((group, index) => (
          <div key={group.name ?? `ungrouped-${index}`} data-slot="theme-editor-preset-group" className="flex flex-col gap-2 [&+&]:mt-3">
            {group.name !== undefined && (
              <span id={`${id}-group-${index}`} className={eyebrow}>
                {group.name}
              </span>
            )}
            <div
              role="group"
              aria-labelledby={group.name !== undefined ? `${id}-group-${index}` : undefined}
              aria-label={group.name === undefined ? labels.presets : undefined}
              className={list}
            >
              {group.items.map(item)}
            </div>
          </div>
        ))
      ) : (
        <>
          <span id={`${id}-presets`} className={eyebrow}>
            {labels.presets}
          </span>
          <div role="group" aria-labelledby={`${id}-presets`} className={list}>
            {info.map(item)}
          </div>
        </>
      )}
      <PresetActionDialogs
        pending={pending}
        labels={labels}
        onClose={() => setPending(null)}
        onDelete={onDelete}
        onRename={onRename}
      />
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
  onFix,
}: {
  fieldKey: ThemeEditorColorKey;
  scheme: PreuiScheme;
  set: string | undefined;
  effective: string;
  problems: TokenContrastResult[];
  labels: ThemeEditorLabels;
  locale: string;
  onValue: (value: string | undefined) => void;
  /** Nudges the colour's lightness until its pairs are readable. */
  /** Missing when the colour can't be fixed here (a raw token overrides it): no Fix button then. */
  onFix?: () => void;
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
        // The failing pair ("Text on primary") as a tooltip.
        <WithTooltip label={labels.pairs[pairKey(worst)]}>
          <ContrastBadge
            ratio={worst.ratio}
            showRatio
            locale={locale}
            labels={labels.contrastBadge}
            data-slot="theme-editor-field-contrast"
            className="shrink-0"
          />
        </WithTooltip>
      )}
      {worst && onFix && (
        <WithTooltip label={labels.fixContrastField(label)}>
          <Button
            variant="outline"
            size="sm"
            onClick={onFix}
            aria-label={labels.fixContrastField(label)}
            data-slot="theme-editor-field-fix"
            className="h-7 shrink-0 px-2 text-xs"
          >
            {labels.fixContrast}
          </Button>
        </WithTooltip>
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
  // A fixed set of rows in a fixed order (never filtered or sorted by the result), so the list keeps its height while
  // a slider or colour changes the contrast and nothing below it jumps. The less important pairs sit in a collapsible
  // group whose header counts their problems.
  const byKey = new Map(results.map((result) => [pairKey(result), result]));
  const fails = (key: string) => (byKey.get(key)?.ratio ?? Infinity) < minContrast;
  const otherProblems = otherPairKeys.filter(fails).length;
  const row = (key: string) => {
    const result = byKey.get(key);
    return (
      <li
        key={key}
        data-slot="theme-editor-contrast-item"
        data-pair={key}
        data-contrast={result ? (result.ratio < minContrast ? "fail" : "pass") : "unknown"}
        className="flex h-5 min-w-0 items-center justify-between gap-2"
      >
        <span className="truncate text-pui-muted-foreground">{labels.pairs[key] ?? key}</span>
        <ContrastBadge ratio={result?.ratio ?? Number.NaN} locale={locale} labels={labels.contrastBadge} className="shrink-0" />
      </li>
    );
  };
  return (
    <div data-slot="theme-editor-contrast" className="flex flex-col gap-2">
      <span id={`${id}-contrast`} className={eyebrow}>
        {labels.contrast(labels.schemes[scheme])}
      </span>
      <ul aria-labelledby={`${id}-contrast`} className="flex flex-col gap-1.5">
        {importantPairs.map(row)}
      </ul>
      <Collapsible data-slot="theme-editor-contrast-other" data-problems={otherProblems}>
        <CollapsibleTrigger className="flex h-6 w-full min-w-0 justify-between gap-2 text-xs font-normal text-pui-muted-foreground hover:text-pui-foreground">
          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <span className="truncate">{labels.otherPairs}</span>
            {/* Always the same element; only colour and text change (tabular numbers). */}
            <span
              data-slot="theme-editor-contrast-other-summary"
              className={cn("shrink-0 tabular-nums", otherProblems > 0 ? "text-pui-warning" : "text-pui-positive")}
            >
              {otherProblems === 0 ? labels.allReadable : labels.problems(otherProblems)}
            </span>
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul aria-label={labels.otherPairs} className="flex flex-col gap-1.5 pt-1.5">
            {otherPairKeys.map(row)}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
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
