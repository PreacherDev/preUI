// WCAG 2.x contrast for colour strings and token sets. Pure functions, safe on the server.
import { parseColor, type Rgba } from "../components/ColorPicker/color";
import type { PreuiTokenName } from "../tailwind/tokens";

export type ContrastLevel = "fail" | "AA-large" | "AA" | "AAA";

/** One checked pair of `checkTokenContrast`. */
export interface TokenContrastResult {
  fg: PreuiTokenName;
  /** The background token. For a tinted pair the tint colour itself (`fg === bg`), see `surface`. */
  bg: PreuiTokenName;
  ratio: number;
  level: ContrastLevel;
  /**
   * Tinted pairs only (`text-pui-x` on `bg-pui-x/tint`): the surface under the tint that gave the lowest ratio
   * (one of `tintContrastSurfaces`).
   */
  surface?: PreuiTokenName;
  /** Tinted pairs only: the tint's opacity, `--pui-tint-rest` × `--pui-tint-scale` of the checked set (max. 1). */
  tint?: number;
}

/** Any colour string preUI understands: hex, `rgb()`, `hsl()` or HSL channels (`"217 91% 60%"`). */
export function parseAnyColor(input: string): Rgba | null {
  const value = input.trim();
  if (/^-?\d*\.?\d+(?:deg)?\s+\d*\.?\d+%\s+\d*\.?\d+%$/i.test(value)) return parseColor(`hsl(${value})`);
  // Hex needs its `#`: a bare "123" is no colour here.
  if (!value.startsWith("#") && !/^(rgb|hsl)a?\(/i.test(value)) return null;
  return parseColor(value);
}

function linear(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance({ r, g, b }: Pick<Rgba, "r" | "g" | "b">): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** Blends a translucent colour over an opaque one. */
function composite(top: Rgba, bottom: Rgba): Rgba {
  const a = top.a;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    a: 1,
  };
}

/** Contrast ratio of two parsed colours; a translucent foreground is blended over the background first. */
export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const top = fg.a < 1 ? composite(fg, bg) : fg;
  const l1 = relativeLuminance(top);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * WCAG 2.x contrast ratio between two colours, 1 (same colour) to 21 (black on white). Accepts hex, `rgb()`,
 * `hsl()` and HSL channels. A translucent foreground is blended over the background. `NaN` when either value is
 * no colour.
 */
export function getContrast(fg: string, bg: string): number {
  const a = parseAnyColor(fg);
  const b = parseAnyColor(bg);
  if (!a || !b) return Number.NaN;
  return contrastRatio(a, { ...b, a: 1 });
}

/** The WCAG level a ratio reaches: AAA ≥ 7, AA ≥ 4.5, AA-large ≥ 3 (large or bold text only), else fail. */
export function getContrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

/**
 * The pairs `checkTokenContrast` checks, as `[foreground, background]`.
 * First group: text on its surface. Second group: status colours used as text colour on the page background
 * (`text-pui-positive`, `text-pui-warning` … — the components use them mostly that way).
 */
export const contrastPairs: readonly (readonly [PreuiTokenName, PreuiTokenName])[] = [
  ["--pui-foreground", "--pui-background"],
  ["--pui-card-foreground", "--pui-card"],
  ["--pui-popover-foreground", "--pui-popover"],
  ["--pui-tooltip-foreground", "--pui-tooltip"],
  ["--pui-primary-foreground", "--pui-primary"],
  ["--pui-secondary-foreground", "--pui-secondary"],
  ["--pui-accent-foreground", "--pui-accent"],
  ["--pui-muted-foreground", "--pui-background"],
  ["--pui-muted-foreground", "--pui-card"],
  ["--pui-muted-foreground", "--pui-muted"],
  ["--pui-positive-foreground", "--pui-positive"],
  ["--pui-negative-foreground", "--pui-negative"],
  ["--pui-destructive-foreground", "--pui-destructive"],
  ["--pui-warning-foreground", "--pui-warning"],
  ["--pui-info-foreground", "--pui-info"],
  ["--pui-primary", "--pui-background"],
  ["--pui-positive", "--pui-background"],
  ["--pui-negative", "--pui-background"],
  ["--pui-warning", "--pui-background"],
  ["--pui-info", "--pui-background"],
];

/**
 * Colours used as text on their own tint — `text-pui-x` on `bg-pui-x/tint`: default and tinted buttons, badges,
 * alert titles, selected items. `checkTokenContrast` checks each over every `tintContrastSurfaces` entry and reports
 * the worst as one pair (`fg` and `bg` = the colour, `surface` = where it was lowest).
 */
export const tintContrastColors: readonly PreuiTokenName[] = [
  "--pui-primary",
  "--pui-positive",
  "--pui-negative",
  "--pui-warning",
  "--pui-info",
];

/** The surfaces tinted elements sit on: page, card, menus, windows (shell) and selected rows / tracks (muted). */
export const tintContrastSurfaces: readonly PreuiTokenName[] = [
  "--pui-background",
  "--pui-card",
  "--pui-popover",
  "--pui-shell",
  "--pui-muted",
];

/** `--pui-tint-rest` × `--pui-tint-scale` of a token set (scale defaults to 1), clamped to 0–1; `null` without a rest value. */
function tintAlpha(values: Record<string, string | undefined>): number | null {
  const rest = Number.parseFloat(values["--pui-tint-rest"] ?? "");
  if (!Number.isFinite(rest)) return null;
  const scale = Number.parseFloat(values["--pui-tint-scale"] ?? "");
  return Math.min(1, Math.max(0, rest * (Number.isFinite(scale) ? scale : 1)));
}

/**
 * The lowest contrast of `colour` as text on its own tint (the set's `--pui-tint-rest` × `--pui-tint-scale`) over the
 * `tintContrastSurfaces` of a token set; `null` when the set has no tint or none of the surfaces.
 */
export function worstTintContrast(
  values: Record<string, string | undefined>,
  colour: Rgba,
): { ratio: number; surface: PreuiTokenName; tint: number } | null {
  const tint = tintAlpha(values);
  if (tint === null) return null;
  let worst: { ratio: number; surface: PreuiTokenName; tint: number } | null = null;
  for (const surface of tintContrastSurfaces) {
    const back = resolveColor(values, surface);
    if (!back) continue;
    const ratio = contrastRatio({ ...colour, a: 1 }, composite({ ...colour, a: tint }, { ...back, a: 1 }));
    if (!worst || ratio < worst.ratio) worst = { ratio, surface, tint };
  }
  return worst;
}

/** Resolves a token's value inside a set, following `var(--pui-x)` references. */
function resolveColor(values: Record<string, string | undefined>, name: string, depth = 0): Rgba | null {
  const value = values[name];
  if (value === undefined || depth > 8) return null;
  const ref = /^var\((--pui-[a-z0-9-]+)\)$/.exec(value.trim());
  if (ref) return resolveColor(values, ref[1], depth + 1);
  return parseAnyColor(value);
}

/**
 * Checks the fixed pair list (`contrastPairs`) of a token set — e.g. `tokens`, `lightTokens`, the output of
 * `deriveTokens` or an editor's state — followed by one tinted pair per `tintContrastColors` entry: the colour as text
 * on its own tint (`--pui-tint-rest` × `--pui-tint-scale` of the set) over the `tintContrastSurfaces`, worst surface
 * reported. Pairs with a missing or unparsable token are skipped. Nothing is blocked; show the result in your editor
 * (e.g. with `ContrastBadge`).
 */
export function checkTokenContrast(
  tokenSet: Partial<Record<PreuiTokenName, string>>,
): TokenContrastResult[] {
  const values = tokenSet as Record<string, string | undefined>;
  const results: TokenContrastResult[] = [];
  for (const [fg, bg] of contrastPairs) {
    const fore = resolveColor(values, fg);
    const back = resolveColor(values, bg);
    if (!fore || !back) continue;
    const ratio = contrastRatio(fore, { ...back, a: 1 });
    results.push({ fg, bg, ratio, level: getContrastLevel(ratio) });
  }
  for (const name of tintContrastColors) {
    const colour = resolveColor(values, name);
    const worst = colour && worstTintContrast(values, colour);
    if (!worst) continue;
    results.push({ fg: name, bg: name, ...worst, level: getContrastLevel(worst.ratio) });
  }
  return results;
}
