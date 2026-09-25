// The serialisable theme value shared by the ThemeEditor, FiveM's GlobalState.theme / NuiThemeBridge and any app
// that stores a theme (protocol version 1). Pure functions, safe on the server.
import type { SchemePreference } from "../components/Theme/theme-script";
import { lightTokens, tokens, type PreuiScheme, type PreuiTokenName } from "../tailwind/tokens";
import { checkTokenContrast, type TokenContrastResult } from "./contrast";
import { deriveTokens, type DeriveTokensBase } from "./derive";
import { normalizeTokens, sharedTokenSet, type TokenInput, type TokenOverrides } from "./token-css";

/** Current version of the theme protocol (`ThemeConfig.v`). */
export const THEME_CONFIG_VERSION = 1;

/** Base colours of one scheme, expanded with `deriveTokens`. Every key is optional; a missing `primary` keeps the default. */
export type ThemePalette = Partial<DeriveTokensBase>;

/**
 * A complete, serialisable theme (protocol version 1) — what a theme editor stores and what FiveM's
 * `GlobalState.theme` / `NuiThemeBridge` (`@pre_scripts/preui-nui`) exchange, without conversion:
 * - `palette` / `tokens` left out → no runtime overrides (back to the defaults / `data-theme`)
 * - `scheme` / `theme` left out → the receiver keeps its current value (`theme: ""` or `null` removes the theme)
 *
 * Turn it into `applyTokens` input with `resolveThemeConfig`.
 */
export interface ThemeConfig {
  /** Protocol version. @default 1 */
  v?: 1;
  /** Default scheme: `"dark"`, `"light"` or `"system"`. */
  scheme?: SchemePreference;
  /** Named theme (`data-theme`); `""` or `null` removes it. */
  theme?: string | null;
  /** Base colours per scheme, expanded with `deriveTokens` (the small form an editor stores). */
  palette?: { dark?: ThemePalette; light?: ThemePalette };
  /** Explicit token overrides (`applyTokens` format); win over `palette`. `shared` holds radius, fonts … */
  tokens?: TokenOverrides;
}

/** A named theme for pickers (e.g. the `ThemeEditor` presets). */
export interface ThemePreset {
  id: string;
  /** Visible name. */
  label: string;
  description?: string;
  /** Applied as the new palette + tokens (and scheme / theme when set). */
  config: ThemeConfig;
}

const schemeDefaults = (scheme: PreuiScheme) => (scheme === "light" ? lightTokens : tokens) as Record<string, string>;

/** The palette without empty entries (`""`, `null`, non-strings), or `undefined` when nothing is left. */
function cleanPalette(palette: ThemePalette | undefined): ThemePalette | undefined {
  if (!palette || typeof palette !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(palette)) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value.trim();
  }
  return Object.keys(out).length > 0 ? (out as ThemePalette) : undefined;
}

/**
 * The tokens a palette changes in one scheme: `deriveTokens` output minus the shared (scheme-independent) tokens and
 * minus everything that equals the scheme's default — so a palette never pins radius or fonts, and tokens a
 * `data-theme` sets stay in effect unless the palette really changes them. `undefined` for an empty palette.
 */
export function resolveThemePalette(palette: ThemePalette | undefined, scheme: PreuiScheme): TokenInput | undefined {
  const base = cleanPalette(palette);
  if (!base) return undefined;
  const defaults = schemeDefaults(scheme);
  const derived = deriveTokens({ primary: defaults["--pui-primary"], ...base }, scheme) as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(derived)) {
    if (sharedTokenSet.has(name) || defaults[name] === value) continue;
    out[name] = value;
  }
  return Object.keys(out).length > 0 ? (out as TokenInput) : undefined;
}

const nonEmpty = (input: TokenInput | undefined) =>
  input && Object.keys(input).length > 0 ? input : undefined;

/**
 * Turns a `ThemeConfig`'s `palette` + `tokens` into one `applyTokens` / `tokensToCss({ tokens })` input:
 * each scheme's palette is expanded with `deriveTokens` (see `resolveThemePalette`), explicit `tokens` win.
 * `scheme` and `theme` are not part of the result (they belong to `ThemeProvider`).
 */
export function resolveThemeConfig(config: Pick<ThemeConfig, "palette" | "tokens"> | null | undefined): TokenOverrides {
  const scheme = (name: PreuiScheme): TokenInput | undefined => {
    const derived = resolveThemePalette(config?.palette?.[name], name);
    const explicit = nonEmpty(config?.tokens?.[name]);
    return derived || explicit ? { ...derived, ...explicit } : undefined;
  };
  return { shared: nonEmpty(config?.tokens?.shared), dark: scheme("dark"), light: scheme("light") };
}

/**
 * The complete, normalised token set a scheme ends up with for a config (defaults + resolved overrides), e.g. for
 * `checkTokenContrast` or to read a value back. Values are HSL channels like the defaults.
 */
export function resolveThemeConfigTokens(
  config: Pick<ThemeConfig, "palette" | "tokens"> | null | undefined,
  scheme: PreuiScheme,
): Record<PreuiTokenName, string> {
  const derived = resolveThemePalette(config?.palette?.[scheme], scheme);
  return {
    ...schemeDefaults(scheme),
    ...normalizeTokens(config?.tokens?.shared).values,
    ...normalizeTokens({ ...derived, ...config?.tokens?.[scheme] }).values,
  } as Record<PreuiTokenName, string>;
}

/** `checkTokenContrast` of the token set a config produces in one scheme. */
export function checkThemeConfigContrast(
  config: Pick<ThemeConfig, "palette" | "tokens"> | null | undefined,
  scheme: PreuiScheme,
): TokenContrastResult[] {
  return checkTokenContrast(resolveThemeConfigTokens(config, scheme));
}

/**
 * A small set of ready-made themes — each passes `checkTokenContrast` (≥ 4.5:1 for every pair) in both schemes.
 * The first one is preUI's default look (no overrides). Use as `ThemeEditor` presets or in your own picker; map
 * `label` / `description` for other languages.
 */
export const defaultThemePresets: readonly ThemePreset[] = [
  { id: "default", label: "preUI", description: "The default blue accent", config: { v: 1, palette: {} } },
  {
    id: "emerald",
    label: "Emerald",
    description: "Green accent on neutral surfaces",
    config: { v: 1, palette: { dark: { primary: "#34d399" }, light: { primary: "#047857" } } },
  },
  {
    id: "police",
    label: "Police",
    description: "Blue accent on navy surfaces",
    config: {
      v: 1,
      palette: {
        dark: { primary: "#60a5fa", background: "#0b1324" },
        light: { primary: "#1d4ed8", background: "#f8fafc" },
      },
    },
  },
  {
    id: "crimson",
    label: "Crimson",
    description: "Red accent",
    config: { v: 1, palette: { dark: { primary: "#fb7185" }, light: { primary: "#be123c" } } },
  },
  {
    id: "amber",
    label: "Amber",
    description: "Warm yellow accent on warm surfaces",
    config: {
      v: 1,
      palette: {
        dark: { primary: "#fbbf24", background: "#15120d" },
        light: { primary: "#b45309", background: "#fffdf8" },
      },
    },
  },
  {
    id: "violet",
    label: "Violet",
    description: "Purple accent",
    config: { v: 1, palette: { dark: { primary: "#a78bfa" }, light: { primary: "#6d28d9" } } },
  },
  {
    id: "mono",
    label: "Mono",
    description: "Neutral greys, no colour accent",
    config: {
      v: 1,
      palette: {
        dark: { primary: "#e5e5e5", background: "#111111" },
        light: { primary: "#171717", background: "#ffffff" },
      },
    },
  },
];
