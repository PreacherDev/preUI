// Normalising token values given at runtime (hex, rgb(), hsl(), HSL channels, sizes …) and rendering them as the
// override blocks used by `applyTokens` and `tokensToCss({ tokens })`. No DOM access, safe on the server.
import { parseColor, type Rgba } from "../components/ColorPicker/color";
import { lightTokens, sharedTokenNames, tokens, type PreuiTokenName } from "../tailwind/tokens";

/** A token name with or without the `--pui-` prefix: `"--pui-primary"` or `"primary"`. */
export type PreuiTokenKey = PreuiTokenName | (PreuiTokenName extends `--pui-${infer Short}` ? Short : never);

/**
 * Token values to set. Colours may be hex (`"#3b82f6"`, `"#38f"`), `rgb()`, `hsl()` or HSL channels
 * (`"217 91% 60%"`); everything else (`"0.75rem"`, font stacks, durations) is used as given.
 */
export type TokenInput = Partial<Record<PreuiTokenKey, string>>;

/** Runtime overrides: `shared` applies to both schemes, `dark` / `light` only to that scheme. */
export interface TokenOverrides {
  shared?: TokenInput;
  dark?: TokenInput;
  light?: TokenInput;
}

/**
 * How a token's value is written:
 * - `channel`: HSL channels (`"217 91% 60%"`), used by the Tailwind colours as `hsl(var(--pui-x) / <alpha>)`
 * - `color`: a complete CSS colour (the `--pui-syntax-*` tokens)
 * - `value`: anything else (sizes, durations, fonts, shadows, opacities)
 */
export type TokenKind = "channel" | "color" | "value";

/**
 * Selectors of the runtime override blocks. The doubled `:root` raises the specificity above the preset
 * (`[data-scheme="light"]`, 0,1,0) and above theme rules (`[data-theme="x"][data-scheme="light"]`, 0,2,0), so a
 * runtime value wins wherever it is set, independent of the order of the stylesheets. Tokens that are not set keep
 * coming from the theme or scheme. `:not([data-scheme="light"])` keeps dark-only values out of the light scheme; the
 * descendant selectors cover subtrees with their own `data-scheme`.
 */
export const runtimeTokenSelectors = {
  shared: ":root:root",
  dark: ':root:root:not([data-scheme="light"]), :root:root [data-scheme="dark"]',
  light: ':root:root[data-scheme="light"], :root:root [data-scheme="light"]',
} as const;

const CHANNEL_RE = /^(-?\d*\.?\d+)(?:deg)?\s+(\d*\.?\d+)%\s+(\d*\.?\d+)%$/i;
const TOKEN_REF_RE = /^var\(--pui-[a-z0-9-]+\)$/;
const COLOR_REF_RE = /^hsl\(var\(--pui-[a-z0-9-]+\)(?:\s*\/\s*\d*\.?\d+%?)?\)$/;
// Characters that could end the declaration or the <style> block; values containing them are rejected.
const UNSAFE_RE = /[;{}<>\\]|\/\*/;

let kinds: Map<string, TokenKind> | null = null;

function tokenKinds(): Map<string, TokenKind> {
  if (kinds) return kinds;
  const all = tokens as Record<string, string>;
  const light = lightTokens as Record<string, string>;
  const isChannel = (value: string) => CHANNEL_RE.test(value);
  kinds = new Map();
  for (const name of Object.keys(all)) {
    const values = [all[name], light[name]];
    let kind: TokenKind = "value";
    if (values.some(isChannel)) kind = "channel";
    else if (values.some((value) => value.startsWith("hsl("))) kind = "color";
    kinds.set(name, kind);
  }
  // Tokens that reference another colour token (`--pui-scrim: var(--pui-background)`) are channels as well.
  for (const name of Object.keys(all)) {
    const ref = /^var\((--pui-[a-z0-9-]+)\)$/.exec(all[name]);
    if (ref && kinds.get(ref[1]) === "channel") kinds.set(name, "channel");
  }
  return kinds;
}

/** The full token name (`"primary"` → `"--pui-primary"`), or `null` when it is no preUI token. */
export function resolveTokenName(key: string): PreuiTokenName | null {
  const name = key.startsWith("--") ? key : `--pui-${key}`;
  return tokenKinds().has(name) ? (name as PreuiTokenName) : null;
}

/** How a token's value is written (see `TokenKind`); `null` for unknown names. */
export function getTokenKind(key: string): TokenKind | null {
  const name = resolveTokenName(key);
  return name ? tokenKinds().get(name)! : null;
}

const round = (value: number) => Math.round(value);

function rgbToHsl({ r, g, b }: Rgba): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: l * 100 };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

const formatChannels = (h: number, s: number, l: number) =>
  `${round(((h % 360) + 360) % 360) % 360} ${round(Math.min(100, Math.max(0, s)))}% ${round(Math.min(100, Math.max(0, l)))}%`;

/**
 * HSL channels (`"217 91% 60%"`) for any colour string: hex (`#rgb`, `#rrggbb`, with alpha), `rgb()`, `hsl()` or
 * channels. Rounded to whole numbers; alpha is dropped. `null` when it is no colour.
 */
export function toHslChannels(input: string): string | null {
  const value = input.trim();
  const channels = CHANNEL_RE.exec(value);
  if (channels) return formatChannels(Number(channels[1]), Number(channels[2]), Number(channels[3]));
  // Hex needs its `#` here: a bare "123" would otherwise be read as a colour.
  if (!value.startsWith("#") && !/^(rgb|hsl)a?\(/i.test(value)) return null;
  const hslMatch = /^hsla?\(\s*(-?\d*\.?\d+)(?:deg)?[\s,]+(\d*\.?\d+)%[\s,]+(\d*\.?\d+)%/i.exec(value);
  if (hslMatch && parseColor(value)) {
    return formatChannels(Number(hslMatch[1]), Number(hslMatch[2]), Number(hslMatch[3]));
  }
  const rgba = parseColor(value);
  if (!rgba) return null;
  const { h, s, l } = rgbToHsl(rgba);
  return formatChannels(h, s, l);
}

/** Why a value was dropped (for the dev warning). */
export type TokenIssue = "unknown-token" | "invalid-color" | "unsafe-value";

/**
 * Normalises one token value: colours to HSL channels (channel tokens) or `hsl(…)` (syntax tokens), other values as
 * given. Returns the full token name and value, or the reason it was dropped.
 */
export function normalizeTokenValue(
  key: string,
  raw: string,
): { name: PreuiTokenName; value: string } | { issue: TokenIssue } {
  const name = resolveTokenName(key);
  if (!name) return { issue: "unknown-token" };
  const value = String(raw).trim();
  if (value === "" || UNSAFE_RE.test(value)) return { issue: "unsafe-value" };
  const kind = tokenKinds().get(name)!;
  if (kind === "value") return { name, value };
  if (TOKEN_REF_RE.test(value)) return { name, value };
  if (kind === "color" && COLOR_REF_RE.test(value)) return { name, value };
  const channels = toHslChannels(value);
  if (!channels) return { issue: "invalid-color" };
  if (kind === "channel") return { name, value: channels };
  const rgba = CHANNEL_RE.test(value) ? null : parseColor(value);
  const alpha = rgba && rgba.a < 1 ? ` / ${Math.round(rgba.a * 1000) / 1000}` : "";
  return { name, value: `hsl(${channels}${alpha})` };
}

export interface NormalizedTokens {
  /** Normalised values by full token name, in the order given. */
  values: Record<string, string>;
  /** Dropped entries with the reason. */
  issues: { key: string; value: string; issue: TokenIssue }[];
}

/** Normalises a whole `TokenInput`; see `normalizeTokenValue`. */
export function normalizeTokens(input: TokenInput | undefined): NormalizedTokens {
  const values: Record<string, string> = {};
  const issues: NormalizedTokens["issues"] = [];
  if (!input) return { values, issues };
  for (const [key, raw] of Object.entries(input)) {
    if (raw === undefined || raw === null) continue;
    const result = normalizeTokenValue(key, raw as string);
    if ("issue" in result) issues.push({ key, value: String(raw), issue: result.issue });
    else values[result.name] = result.value;
  }
  return { values, issues };
}

function block(selector: string, values: Record<string, string>) {
  const entries = Object.entries(values);
  if (entries.length === 0) return "";
  return `${selector} {\n${entries.map(([name, value]) => `  ${name}: ${value};`).join("\n")}\n}\n`;
}

/** The CSS for runtime overrides (see `runtimeTokenSelectors`) plus everything that was dropped. */
export function renderTokenOverrides(overrides: TokenOverrides): { css: string; issues: NormalizedTokens["issues"] } {
  const shared = normalizeTokens(overrides.shared);
  const dark = normalizeTokens(overrides.dark);
  const light = normalizeTokens(overrides.light);
  const css = [
    block(runtimeTokenSelectors.shared, shared.values),
    block(runtimeTokenSelectors.dark, dark.values),
    block(runtimeTokenSelectors.light, light.values),
  ]
    .filter(Boolean)
    .join("\n");
  return { css, issues: [...shared.issues, ...dark.issues, ...light.issues] };
}

/** The shared (scheme-independent) token names, as a set for lookups. */
export const sharedTokenSet: ReadonlySet<string> = new Set(sharedTokenNames);

declare const process: { env: { NODE_ENV?: string } } | undefined;

/** `true` unless the bundler replaced `process.env.NODE_ENV` with `"production"` (or `process` is missing). */
export function isDevBuild(): boolean {
  try {
    return process!.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

const warned = new Set<string>();

/** Logs dropped token values once each (dev builds only). */
export function warnTokenIssues(source: string, issues: NormalizedTokens["issues"]) {
  if (issues.length === 0 || !isDevBuild()) return;
  for (const { key, value, issue } of issues) {
    const message =
      issue === "unknown-token"
        ? `unknown token "${key}"`
        : issue === "invalid-color"
          ? `"${value}" is no valid colour for "${key}"`
          : `unsafe or empty value for "${key}"`;
    if (warned.has(message)) continue;
    warned.add(message);
    console.warn(`[preUI] ${source}: ignored ${message}.`);
  }
}
