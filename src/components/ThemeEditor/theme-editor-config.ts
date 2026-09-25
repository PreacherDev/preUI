// Pure helpers of the ThemeEditor: reading and writing fields of a ThemeConfig, preset matching, contrast per field.
import type { SchemePreference } from "../Theme/theme-script";
import { rgbToHex } from "../ColorPicker/color";
import { parseAnyColor, type TokenContrastResult } from "../../theming/contrast";
import type { DeriveTokensBase } from "../../theming/derive";
import type { ThemeConfig, ThemePalette, ThemePreset } from "../../theming/theme-config";
import type { TokenInput, TokenOverrides } from "../../theming/token-css";
import type { PreuiScheme } from "../../tailwind/tokens";

/** The base colours the editor offers per scheme (`deriveTokens` input). */
export type ThemeEditorColorKey = keyof DeriveTokensBase;

export const themeEditorColorKeys: readonly ThemeEditorColorKey[] = [
  "primary",
  "background",
  "foreground",
  "positive",
  "negative",
  "destructive",
  "warning",
  "info",
];

/** Tokens a base colour feeds; a failing contrast pair with one of them marks the field. */
const fieldTokens: Record<ThemeEditorColorKey, readonly string[]> = {
  primary: ["--pui-primary", "--pui-primary-foreground"],
  background: [
    "--pui-background",
    "--pui-card",
    "--pui-popover",
    "--pui-muted",
    "--pui-secondary",
    "--pui-accent",
    "--pui-tooltip",
  ],
  foreground: [
    "--pui-foreground",
    "--pui-card-foreground",
    "--pui-popover-foreground",
    "--pui-muted-foreground",
    "--pui-secondary-foreground",
    "--pui-accent-foreground",
    "--pui-tooltip-foreground",
  ],
  positive: ["--pui-positive", "--pui-positive-foreground"],
  negative: ["--pui-negative", "--pui-negative-foreground"],
  destructive: ["--pui-destructive", "--pui-destructive-foreground"],
  warning: ["--pui-warning", "--pui-warning-foreground"],
  info: ["--pui-info", "--pui-info-foreground"],
};

/** The failing pairs that involve a field's tokens, worst first. */
export function fieldProblems(
  key: ThemeEditorColorKey,
  results: readonly TokenContrastResult[],
  minContrast: number,
): TokenContrastResult[] {
  const names = fieldTokens[key];
  return results
    .filter((result) => result.ratio < minContrast && (names.includes(result.fg) || names.includes(result.bg)))
    .sort((a, b) => a.ratio - b.ratio);
}

/** `"--pui-muted-foreground"` + `"--pui-card"` → `"muted-foreground/card"` (key of `labels.pairs`). */
export const pairKey = (result: Pick<TokenContrastResult, "fg" | "bg">) =>
  `${result.fg.replace(/^--pui-/, "")}/${result.bg.replace(/^--pui-/, "")}`;

/** The pairs always listed in the contrast details; other pairs appear only while they fail. */
export const importantPairs: readonly string[] = [
  "foreground/background",
  "muted-foreground/background",
  "muted-foreground/card",
  "primary-foreground/primary",
  "primary/background",
  "positive/background",
  "negative/background",
  "warning/background",
  "info/background",
  "destructive-foreground/destructive",
];

/** Any colour string → `#rrggbb` (the ColorPicker value); `null` when it is no colour. */
export function toHex(value: string | undefined): string | null {
  if (!value) return null;
  const rgba = parseAnyColor(value);
  return rgba ? rgbToHex(rgba) : null;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function cleanPalette(palette: unknown): ThemePalette | undefined {
  if (!isObject(palette)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(palette)) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value;
  }
  return Object.keys(out).length > 0 ? (out as ThemePalette) : undefined;
}

function cleanTokens(input: unknown): TokenInput | undefined {
  if (!isObject(input)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value;
  }
  return Object.keys(out).length > 0 ? (out as TokenInput) : undefined;
}

/**
 * The editor's output form: `v: 1`, a `scheme`, a `palette` object (empty schemes dropped) and `tokens` only when
 * something is set. Other fields (`theme`, unknown extras) are kept.
 */
export function normalizeThemeConfig(config: ThemeConfig | null | undefined, fallbackScheme: SchemePreference): ThemeConfig {
  const source: ThemeConfig = isObject(config) ? config : {};
  const { palette, tokens, ...rest } = source;
  const dark = cleanPalette(palette?.dark);
  const light = cleanPalette(palette?.light);
  const out: ThemeConfig = {
    ...rest,
    v: 1,
    scheme: source.scheme === "dark" || source.scheme === "light" || source.scheme === "system" ? source.scheme : fallbackScheme,
    palette: { ...(dark && { dark }), ...(light && { light }) },
  };
  const shared = cleanTokens(tokens?.shared);
  const darkTokens = cleanTokens(tokens?.dark);
  const lightTokens = cleanTokens(tokens?.light);
  if (shared || darkTokens || lightTokens) {
    out.tokens = { ...(shared && { shared }), ...(darkTokens && { dark: darkTokens }), ...(lightTokens && { light: lightTokens }) };
  } else {
    delete out.tokens;
  }
  return out;
}

/** Sets (or with `undefined` removes) one base colour of a scheme. */
export function setPaletteColor(
  config: ThemeConfig,
  scheme: PreuiScheme,
  key: ThemeEditorColorKey,
  value: string | undefined,
): ThemeConfig {
  const current = { ...config.palette?.[scheme] };
  if (value === undefined) delete current[key];
  else current[key] = value;
  return { ...config, palette: { ...config.palette, [scheme]: current } };
}

/** A shared token by short name (`"radius"`), also found under its full name (`"--pui-radius"`). */
export function getSharedToken(config: ThemeConfig, name: string): string | undefined {
  const shared = config.tokens?.shared as Record<string, string | undefined> | undefined;
  return shared?.[name] ?? shared?.[`--pui-${name}`];
}

/** Sets (or with `undefined` removes) a shared token; always written under its short name. */
export function setSharedToken(config: ThemeConfig, name: string, value: string | undefined): ThemeConfig {
  const shared = { ...(config.tokens?.shared as Record<string, string> | undefined) };
  delete shared[name];
  delete shared[`--pui-${name}`];
  if (value !== undefined) shared[name] = value;
  return { ...config, tokens: { ...config.tokens, shared: shared as TokenInput } };
}

/** Whether the config changes anything (palette or tokens). */
export const hasOverrides = (config: ThemeConfig) =>
  Object.keys(config.palette ?? {}).length > 0 || Object.keys(config.tokens ?? {}).length > 0;

/** `"0.75rem"` / `"12px"` → rem as a number; `null` for other values. */
export function parseRem(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(-?\d*\.?\d+)(rem|px)?$/.exec(value.trim());
  if (!match) return null;
  const number = Number(match[1]);
  return match[2] === "px" ? number / 16 : number;
}

// ------------------------------------------------------------------------------------------------
// Presets
// ------------------------------------------------------------------------------------------------

/** Keys without `--pui-`, colours as `#rrggbb`, sorted — for comparing configs. */
function canonicalMap(input: Record<string, unknown> | undefined, only?: Set<string>) {
  const out: Record<string, string> = {};
  if (!input) return out;
  for (const [rawKey, raw] of Object.entries(input)) {
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const key = rawKey.replace(/^--pui-/, "");
    if (only && !only.has(key)) continue;
    out[key] = toHex(raw) ?? raw.trim().toLowerCase();
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

const sharedKeysOf = (config: ThemeConfig) =>
  new Set(Object.keys(config.tokens?.shared ?? {}).map((key) => key.replace(/^--pui-/, "")));

function presetSignature(config: ThemeConfig, sharedKeys: Set<string>) {
  const tokens = config.tokens as TokenOverrides | undefined;
  return JSON.stringify({
    paletteDark: canonicalMap(config.palette?.dark),
    paletteLight: canonicalMap(config.palette?.light),
    dark: canonicalMap(tokens?.dark),
    light: canonicalMap(tokens?.light),
    shared: canonicalMap(tokens?.shared, sharedKeys),
  });
}

/**
 * Whether `config` currently shows `preset`: same palettes and per-scheme tokens, and the shared tokens the preset
 * sets (radius, fonts …) are equal — shared tokens the preset leaves out may differ.
 */
export function matchesPreset(config: ThemeConfig, preset: ThemePreset): boolean {
  const keys = sharedKeysOf(preset.config);
  return presetSignature(config, keys) === presetSignature(preset.config, keys);
}

/** Applies a preset: its palettes and per-scheme tokens replace the current ones, its shared tokens are merged in. */
export function applyPreset(config: ThemeConfig, preset: ThemePreset): ThemeConfig {
  const source = preset.config;
  const next: ThemeConfig = {
    ...config,
    palette: { dark: { ...source.palette?.dark }, light: { ...source.palette?.light } },
    tokens: {
      shared: { ...config.tokens?.shared, ...source.tokens?.shared },
      dark: source.tokens?.dark && { ...source.tokens.dark },
      light: source.tokens?.light && { ...source.tokens.light },
    },
  };
  if (source.scheme) next.scheme = source.scheme;
  if (source.theme !== undefined) next.theme = source.theme;
  return next;
}
