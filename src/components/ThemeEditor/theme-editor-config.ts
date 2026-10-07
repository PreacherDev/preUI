// Pure helpers of the ThemeEditor: reading and writing fields of a ThemeConfig, preset matching, contrast per field.
import type { SchemePreference } from "../Theme/theme-script";
import { rgbToHex } from "../ColorPicker/color";
import { checkTokenContrast, parseAnyColor, type TokenContrastResult } from "../../theming/contrast";
import type { DeriveTokensBase } from "../../theming/derive";
import { resolveThemeConfigTokens, type ThemeConfig, type ThemePalette, type ThemePreset } from "../../theming/theme-config";
import { normalizeTokens, type TokenInput, type TokenOverrides } from "../../theming/token-css";
import { lightTokens, tokens as defaultTokens, type PreuiScheme, type PreuiTokenName } from "../../tailwind/tokens";

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
// Style values (shared tokens the "Style" section edits)
// ------------------------------------------------------------------------------------------------

/** Shared tokens that make up the look besides the colours. A preset sets all of them (missing = default). */
export const styleTokenKeys = ["radius", "surface-opacity", "tint-scale", "border-opacity", "shadow-scale"] as const;
export type StyleTokenKey = (typeof styleTokenKeys)[number];

/** The default value of a style token (`"0.5rem"`, `"1"` …). */
export const styleDefault = (key: StyleTokenKey) => (defaultTokens as Record<string, string>)[`--pui-${key}`];

/** A style token's value, or its default when unset. */
export const getStyleToken = (config: ThemeConfig, key: StyleTokenKey) => getSharedToken(config, key) ?? styleDefault(key);

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

// The preset's own shared keys plus every style key (a preset always defines the whole look).
const sharedKeysOf = (config: ThemeConfig) =>
  new Set([...Object.keys(config.tokens?.shared ?? {}).map((key) => key.replace(/^--pui-/, "")), ...styleTokenKeys]);

/** Shared tokens with the style defaults filled in, so "unset" and "set to the default" compare equal. */
function withStyleDefaults(shared: Record<string, unknown> | undefined) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(shared ?? {})) out[key.replace(/^--pui-/, "")] = value;
  for (const key of styleTokenKeys) if (typeof out[key] !== "string" || out[key] === "") out[key] = styleDefault(key);
  return out;
}

function presetSignature(config: ThemeConfig, sharedKeys: Set<string>) {
  const tokens = config.tokens as TokenOverrides | undefined;
  return JSON.stringify({
    paletteDark: canonicalMap(config.palette?.dark),
    paletteLight: canonicalMap(config.palette?.light),
    dark: canonicalMap(tokens?.dark),
    light: canonicalMap(tokens?.light),
    shared: canonicalMap(withStyleDefaults(tokens?.shared), sharedKeys),
  });
}

/**
 * Whether `config` currently shows `preset`: same palettes and per-scheme tokens, the same style values (radius,
 * transparency … — unset counts as the default) and the other shared tokens the preset sets (e.g. a font) are equal.
 * Shared tokens the preset leaves out (except the style values) may differ.
 */
export function matchesPreset(config: ThemeConfig, preset: ThemePreset): boolean {
  const keys = sharedKeysOf(preset.config);
  return presetSignature(config, keys) === presetSignature(preset.config, keys);
}

/**
 * Applies a preset: its palettes and per-scheme tokens replace the current ones; the style values (radius,
 * transparency, accent, borders, shadows) become the preset's (its defaults where it sets none); other shared
 * tokens it sets (a font) are merged in, the rest (your font) stays.
 */
export function applyPreset(config: ThemeConfig, preset: ThemePreset): ThemeConfig {
  const source = preset.config;
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries((config.tokens?.shared ?? {}) as Record<string, string>)) {
    if (!(styleTokenKeys as readonly string[]).includes(key.replace(/^--pui-/, ""))) kept[key] = value;
  }
  const next: ThemeConfig = {
    ...config,
    palette: { dark: { ...source.palette?.dark }, light: { ...source.palette?.light } },
    tokens: {
      shared: { ...kept, ...source.tokens?.shared } as TokenInput,
      dark: source.tokens?.dark && { ...source.tokens.dark },
      light: source.tokens?.light && { ...source.tokens.light },
    },
  };
  if (source.scheme) next.scheme = source.scheme;
  if (source.theme !== undefined) next.theme = source.theme;
  return next;
}

// ------------------------------------------------------------------------------------------------
// Contrast repair, light-from-dark, import
// ------------------------------------------------------------------------------------------------

/** `"217 91% 63%"` → { h, s, l }; null for anything else. */
function parseChannels(value: string | undefined): { h: number; s: number; l: number } | null {
  const match = /^\s*(-?\d*\.?\d+)\s+(\d*\.?\d+)%\s+(\d*\.?\d+)%\s*$/.exec(value ?? "");
  return match ? { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) } : null;
}

const hslHex = (h: number, s: number, l: number) => toHex(`hsl(${h} ${s}% ${Math.min(100, Math.max(0, l))}%)`);

/**
 * The smallest lightness change of one base colour that clears all contrast problems of its field in a scheme:
 * tries ±1, ±2 … percentage points (hue and saturation stay). Returns the changed config, or `null` when no
 * lightness works (e.g. a background between two text colours that both need the opposite direction).
 */
export function fixFieldContrast(
  config: ThemeConfig,
  scheme: PreuiScheme,
  key: ThemeEditorColorKey,
  minContrast: number,
): ThemeConfig | null {
  const current = parseChannels(resolveThemeConfigTokens(config, scheme)[`--pui-${key}` as PreuiTokenName]);
  if (!current) return null;
  if (fieldProblems(key, checkTokenContrast(resolveThemeConfigTokens(config, scheme)), minContrast).length === 0) return config;
  for (let step = 1; step <= 100; step++) {
    for (const direction of [1, -1]) {
      const l = current.l + direction * step;
      if (l < 0 || l > 100) continue;
      const hex = hslHex(current.h, current.s, l);
      if (!hex) continue;
      const candidate = setPaletteColor(config, scheme, key, hex);
      if (fieldProblems(key, checkTokenContrast(resolveThemeConfigTokens(candidate, scheme)), minContrast).length === 0) {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * Fills the light scheme from the dark one: every accent / status colour set for dark gets a light counterpart with
 * the same hue and saturation at the light default's lightness, then nudged until it is readable on the light
 * background. Background and text of the light scheme are kept (dark surfaces don't translate to light ones).
 */
export function deriveLightFromDark(config: ThemeConfig, minContrast: number): ThemeConfig {
  const dark = config.palette?.dark ?? {};
  let next: ThemeConfig = config;
  for (const key of themeEditorColorKeys) {
    if (key === "background" || key === "foreground") continue;
    const value = dark[key];
    if (!value) continue;
    const source = parseChannels(toHex(value) ? resolveThemeConfigTokens({ palette: { dark: { [key]: value } } }, "dark")[`--pui-${key}` as PreuiTokenName] : undefined);
    const lightDefault = parseChannels((lightTokens as Record<string, string>)[`--pui-${key}`]);
    if (!source || !lightDefault) continue;
    const hex = hslHex(source.h, source.s, lightDefault.l);
    if (!hex) continue;
    const candidate = setPaletteColor(next, "light", key, hex);
    next = fixFieldContrast(candidate, "light", key, minContrast) ?? candidate;
  }
  return next;
}

/** Result of reading a pasted theme. */
export type ThemeImportResult =
  | { ok: true; config: ThemeConfig; warnings: string[] }
  | { ok: false; error: "json" | "shape" | "version" | "size" };

const IMPORT_KEYS = new Set(["v", "scheme", "theme", "palette", "tokens", "fonts"]);
const MAX_IMPORT_LENGTH = 64 * 1024;

/**
 * Reads a pasted theme (JSON of a `ThemeConfig`, protocol v1): checks size, shape and version, keeps only known
 * fields, and lists what will be dropped (unknown tokens, invalid colours, unknown fields) as warnings.
 */
export function parseThemeImport(text: string, fallbackScheme: SchemePreference): ThemeImportResult {
  if (text.length > MAX_IMPORT_LENGTH) return { ok: false, error: "size" };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "json" };
  }
  if (!isObject(data)) return { ok: false, error: "shape" };
  if (data.v !== undefined && data.v !== 1) return { ok: false, error: "version" };
  const warnings: string[] = [];
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (IMPORT_KEYS.has(key)) picked[key] = value;
    else warnings.push(key);
  }
  const palette = isObject(picked.palette) ? picked.palette : {};
  for (const scheme of ["dark", "light"] as const) {
    const colors = isObject(palette[scheme]) ? (palette[scheme] as Record<string, unknown>) : {};
    for (const [key, value] of Object.entries(colors)) {
      if (!(themeEditorColorKeys as readonly string[]).includes(key) || typeof value !== "string" || !toHex(value)) {
        warnings.push(`palette.${scheme}.${key}`);
        delete colors[key];
      }
    }
  }
  const tokens = isObject(picked.tokens) ? (picked.tokens as Record<string, unknown>) : undefined;
  if (tokens) {
    for (const part of ["shared", "dark", "light"] as const) {
      const input = isObject(tokens[part]) ? (tokens[part] as Record<string, string>) : undefined;
      if (!input) continue;
      const { issues } = normalizeTokens(input as TokenInput);
      for (const issue of issues) {
        warnings.push(`tokens.${part}.${issue.key}`);
        delete input[issue.key];
      }
    }
  }
  return { ok: true, config: normalizeThemeConfig(picked as ThemeConfig, fallbackScheme), warnings };
}
