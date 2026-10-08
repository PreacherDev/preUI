// Deriving a complete token set from a few base colours (for theme editors with a handful of controls).
import { lightTokens, tokens, type PreuiScheme, type PreuiTokenName, type PreuiTokens } from "../tailwind/tokens";
import { contrastRatio, parseAnyColor, relativeLuminance, worstTintContrast } from "./contrast";
import { toHslChannels } from "./token-css";

/** The base colours `deriveTokens` builds a palette from. Any colour format `applyTokens` accepts. */
export interface DeriveTokensBase {
  /** Accent colour: primary, ring, charts, syntax keywords. */
  primary: string;
  /** Page background: every surface, border and text colour is derived from it. */
  background?: string;
  /** Main text colour; derived from the background when omitted. */
  foreground?: string;
  positive?: string;
  negative?: string;
  destructive?: string;
  warning?: string;
  info?: string;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function parseHsl(value: string): Hsl | null {
  const channels = toHslChannels(value);
  if (!channels) return null;
  const [h, s, l] = channels.replace(/%/g, "").split(" ").map(Number);
  return { h, s, l };
}

const format = ({ h, s, l }: Hsl) =>
  `${Math.round(((h % 360) + 360) % 360) % 360} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`;

const WHITE = "0 0% 100%";
const BLACK = "0 0% 0%";
const MIN_TEXT_CONTRAST = 4.5;

function ratio(a: string, b: string) {
  const fg = parseAnyColor(a);
  const bg = parseAnyColor(b);
  return fg && bg ? contrastRatio(fg, bg) : 0;
}

/** Keeps `preferred` when it reaches 4.5:1 on `surface`, else pure white or black, whichever is higher. */
export function pickForeground(preferred: string, surface: string): string {
  if (ratio(preferred, surface) >= MIN_TEXT_CONTRAST) return preferred;
  return ratio(WHITE, surface) >= ratio(BLACK, surface) ? WHITE : BLACK;
}

/**
 * The tint of the default surfaces per scheme. Derived surfaces keep their default distance to this reference
 * (lightness offset, chroma ratio, hue offset), re-anchored on the given background. Light uses the tinted
 * surfaces' hue, because its default background is pure white.
 */
const REFERENCE: Record<PreuiScheme, Hsl> = {
  dark: { h: 225, s: 12, l: 9 },
  light: { h: 225, s: 16, l: 100 },
};

/** How much colour HSL saturation can carry at a lightness: 1 at 50 %, 0 at black and white. */
const chromaRange = (l: number) => 1 - Math.abs((2 * clamp(l, 0, 100)) / 100 - 1);

/** HSL chroma (0–1): how colourful a colour really is. Saturation is not — near white or black, 100 % is almost grey. */
const chroma = ({ s, l }: Pick<Hsl, "s" | "l">) => chromaRange(l) * (s / 100);

/**
 * The background chroma that keeps the default tint (factor 1). Dark: the default background. Light: its background
 * is white, so the reference is the default muted surface (225 16% 94%).
 */
const REFERENCE_CHROMA: Record<PreuiScheme, number> = {
  dark: chroma(REFERENCE.dark),
  light: chroma({ s: 16, l: 94 }),
};

/**
 * Text follows the background's tint at most this much more strongly than the defaults: a navy or cream page gets
 * slightly tinted text, not blue or brown text.
 */
const MAX_TEXT_TINT = 1.5;

/**
 * The saturation that gives a colour at lightness `l` the default's chroma × `factor` (but at least `minChroma`).
 * Chroma, not saturation, is scaled: `#fffdf8` has 100 % saturation but hardly any colour, and scaling the
 * saturation by it turned surfaces yellow and text brown.
 */
function scaledSaturation(def: Hsl, factor: number, l: number, minChroma = 0): number {
  const range = chromaRange(l);
  if (range <= 0) return 0;
  // Written as a saturation ratio, so the same lightness and factor 1 return the default saturation exactly.
  return Math.max(def.s * factor * (chromaRange(def.l) / range), (minChroma / range) * 100);
}

/** Tokens placed relative to the background. */
const SURFACES: PreuiTokenName[] = [
  "--pui-backdrop",
  "--pui-shell",
  "--pui-card",
  "--pui-popover",
  "--pui-rail-active",
  "--pui-tooltip",
  "--pui-scrim",
  "--pui-secondary",
  "--pui-muted",
  "--pui-accent",
  "--pui-border",
  "--pui-input",
  "--pui-chart-grid",
];

/** Text tokens that follow the main foreground. */
const TEXT_ON_SURFACE: [PreuiTokenName, PreuiTokenName][] = [
  ["--pui-card-foreground", "--pui-card"],
  ["--pui-popover-foreground", "--pui-popover"],
  ["--pui-secondary-foreground", "--pui-secondary"],
  ["--pui-accent-foreground", "--pui-accent"],
];

const STATUS = ["positive", "negative", "destructive", "warning", "info"] as const;

/**
 * A complete token set for one scheme from 1–8 base colours — same keys as `tokens` / `lightTokens`, ready for
 * `applyTokens({ dark: deriveTokens(base, "dark") })`.
 *
 * - `primary` → `--pui-primary` and `--pui-ring` (charts and syntax keywords reference primary already).
 * - `background` → every surface (card, popover, shell, muted, secondary, accent, rail, border, input …) keeps its
 *   default lightness distance to the background; hue and colourfulness (chroma) follow the background, and no
 *   surface is less colourful than the background. Text follows the background's tint at most 1.5× as strongly as
 *   the defaults.
 * - `foreground` (or derived from the background) → all text colours; `muted-foreground` keeps its default
 *   position and is moved towards the foreground until it reaches 4.5:1 on background, card and muted.
 * - Every `*-foreground` keeps its default when it reaches 4.5:1 on its surface, otherwise it becomes pure white or
 *   black (whichever contrasts more — one of them always reaches at least 4.58:1).
 * - Colours you leave out (and quality tiers) keep the scheme's defaults — with a `background` of your own, the status
 *   colours move in lightness just enough to stay readable as text on their own tint over the derived surfaces.
 */
export function deriveTokens(base: DeriveTokensBase, scheme: PreuiScheme): PreuiTokens {
  const defaults = (scheme === "light" ? lightTokens : tokens) as Record<string, string>;
  const out: Record<string, string> = { ...defaults };
  const ref = REFERENCE[scheme];

  // Surfaces
  const bg = base.background ? parseHsl(base.background) : null;
  // How much more (or less) colourful the background is than the default one. Text follows it only up to MAX_TEXT_TINT.
  const tint = bg ? chroma(bg) / REFERENCE_CHROMA[scheme] : 1;
  const textTint = Math.min(tint, MAX_TEXT_TINT);
  if (bg) {
    out["--pui-background"] = format(bg);
    const bgChroma = chroma(bg);
    const reAnchor = (name: PreuiTokenName) => {
      const def = parseHsl(defaults[name]);
      if (!def) return; // references like var(--pui-background) stay
      const inverse = def.l > 50 !== ref.l > 50; // e.g. the dark tooltip in the light scheme
      const l = inverse ? def.l : bg.l + (def.l - ref.l);
      out[name] = format({
        // A grey default (light card and popover: white) has no hue of its own and takes the background's.
        h: def.s > 0 ? bg.h + (def.h - ref.h) : bg.h,
        // An inverse surface (the light scheme's dark tooltip) is tinted like text. The others are at least as
        // colourful as the background (light card and popover are white by default, on a cream page they are cream).
        s: inverse ? scaledSaturation(def, textTint, l) : scaledSaturation(def, tint, l, bgChroma),
        l,
      });
    };
    for (const name of SURFACES) reAnchor(name);
  }

  // Text
  const fg = base.foreground ? parseHsl(base.foreground) : null;
  if (fg || bg) {
    let foreground: string;
    if (fg) foreground = format(fg);
    else {
      const def = parseHsl(defaults["--pui-foreground"])!;
      foreground = format({ h: bg!.h + (def.h - ref.h), s: def.s * textTint, l: def.l });
    }
    foreground = pickForeground(foreground, out["--pui-background"]);
    out["--pui-foreground"] = foreground;
    // Same hue/saturation as the foreground, with each token's default lightness offset (accent text is a touch brighter).
    const fgParts = parseHsl(foreground)!;
    const defFg = parseHsl(defaults["--pui-foreground"])!;
    for (const [text, surface] of TEXT_ON_SURFACE) {
      const def = parseHsl(defaults[text])!;
      out[text] = pickForeground(format({ ...fgParts, l: fgParts.l + (def.l - defFg.l) }), out[surface]);
    }

    // muted-foreground: default position, pushed towards the foreground until it is readable everywhere.
    const fgHsl = fgParts;
    const defMuted = parseHsl(defaults["--pui-muted-foreground"])!;
    const surfaces = ["--pui-background", "--pui-card", "--pui-muted"].map((name) => out[name]);
    const bgHsl = parseHsl(out["--pui-background"])!;
    const start = bg ? bgHsl.l + (defMuted.l - ref.l) : defMuted.l;
    const hue = bg ? bg.h + (defMuted.h - ref.h) : defMuted.h;
    // Keeps its default chroma (× the text tint) while the lightness moves.
    const sat = (l: number) => (bg ? scaledSaturation(defMuted, textTint, l) : defMuted.s);
    let muted = format({ h: hue, s: sat(start), l: start });
    const step = fgHsl.l > start ? 1 : -1;
    for (let l = start; ; l += step) {
      muted = format({ h: hue, s: sat(l), l });
      if (surfaces.every((surface) => ratio(muted, surface) >= MIN_TEXT_CONTRAST)) break;
      if (l < 0 || l > 100) {
        muted = foreground;
        break;
      }
    }
    out["--pui-muted-foreground"] = muted;
    const axis = parseHsl(defaults["--pui-chart-axis"]);
    if (axis && bg) out["--pui-chart-axis"] = format({ ...parseHsl(muted)!, l: parseHsl(muted)!.l + (axis.l - defMuted.l) });
  }

  // Accent + status colours
  const primary = parseHsl(base.primary);
  if (primary) {
    out["--pui-primary"] = format(primary);
    out["--pui-ring"] = format(primary);
  }
  for (const name of STATUS) {
    const value = base[name] ? parseHsl(base[name]!) : null;
    if (!value) continue;
    out[`--pui-${name}`] = format(value);
    if (name === "positive" || name === "negative") {
      // Charts use the status colour directly when it is customised.
      out[`--pui-chart-${name}`] = format(value);
    }
  }

  // Status colours you left out, on a background of your own: their lightness moves (away from the background) just
  // enough to stay readable as text on their own tint over the derived surfaces (badges, alerts, tinted buttons).
  if (bg) {
    const page = parseAnyColor(out["--pui-background"]);
    // Destructive is a solid fill (destructive-foreground on it), never text on its tint.
    for (const name of STATUS) {
      const key = `--pui-${name}`;
      if (name === "destructive" || base[name] || !page) continue;
      const start = parseHsl(out[key]);
      if (!start) continue;
      const lighter = relativeLuminance(parseAnyColor(out[key])!) > relativeLuminance(page);
      // No lightness works (a mid-grey page): the default stays, and checkTokenContrast reports it.
      for (let l = start.l; l >= 0 && l <= 100; l += lighter ? 1 : -1) {
        const candidate = format({ ...start, l });
        if ((worstTintContrast(out, parseAnyColor(candidate)!)?.ratio ?? Infinity) < MIN_TEXT_CONTRAST) continue;
        out[key] = candidate;
        break;
      }
    }
  }

  // Text on filled surfaces: default if readable, else white/black.
  for (const name of ["primary", ...STATUS] as const) {
    const key = `--pui-${name}-foreground`;
    out[key] = pickForeground(defaults[key], out[`--pui-${name}`]);
  }
  out["--pui-tooltip-foreground"] = pickForeground(defaults["--pui-tooltip-foreground"], out["--pui-tooltip"]);

  return out as PreuiTokens;
}
