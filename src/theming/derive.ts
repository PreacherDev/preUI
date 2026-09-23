// Deriving a complete token set from a few base colours (for theme editors with a handful of controls).
import { lightTokens, tokens, type PreuiScheme, type PreuiTokenName, type PreuiTokens } from "../tailwind/tokens";
import { contrastRatio, parseAnyColor } from "./contrast";
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
 * (lightness offset, saturation ratio, hue offset), re-anchored on the given background. Light uses the tinted
 * surfaces' hue/saturation, because its default background is pure white.
 */
const REFERENCE: Record<PreuiScheme, Hsl> = {
  dark: { h: 225, s: 12, l: 9 },
  light: { h: 225, s: 16, l: 100 },
};

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
 *   default lightness distance to the background; hue and saturation follow the background.
 * - `foreground` (or derived from the background) → all text colours; `muted-foreground` keeps its default
 *   position and is moved towards the foreground until it reaches 4.5:1 on background, card and muted.
 * - Every `*-foreground` keeps its default when it reaches 4.5:1 on its surface, otherwise it becomes pure white or
 *   black (whichever contrasts more — one of them always reaches at least 4.58:1).
 * - Colours you leave out (and quality tiers) keep the scheme's defaults.
 */
export function deriveTokens(base: DeriveTokensBase, scheme: PreuiScheme): PreuiTokens {
  const defaults = (scheme === "light" ? lightTokens : tokens) as Record<string, string>;
  const out: Record<string, string> = { ...defaults };
  const ref = REFERENCE[scheme];

  // Surfaces
  const bg = base.background ? parseHsl(base.background) : null;
  if (bg) {
    out["--pui-background"] = format(bg);
    const reAnchor = (name: PreuiTokenName) => {
      const def = parseHsl(defaults[name]);
      if (!def) return; // references like var(--pui-background) stay
      const inverse = def.l > 50 !== ref.l > 50; // e.g. the dark tooltip in the light scheme
      const s = ref.s > 0 ? def.s * (bg.s / ref.s) : bg.s;
      out[name] = format({
        h: bg.h + (def.h - ref.h),
        s,
        l: inverse ? def.l : bg.l + (def.l - ref.l),
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
      foreground = format({ h: bg!.h + (def.h - ref.h), s: ref.s > 0 ? def.s * (bg!.s / ref.s) : bg!.s, l: def.l });
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
    const sat = bg && ref.s > 0 ? defMuted.s * (bg.s / ref.s) : defMuted.s;
    let muted = format({ h: hue, s: sat, l: start });
    const step = fgHsl.l > start ? 1 : -1;
    for (let l = start; ; l += step) {
      muted = format({ h: hue, s: sat, l });
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

  // Text on filled surfaces: default if readable, else white/black.
  for (const name of ["primary", ...STATUS] as const) {
    const key = `--pui-${name}-foreground`;
    out[key] = pickForeground(defaults[key], out[`--pui-${name}`]);
  }
  out["--pui-tooltip-foreground"] = pickForeground(defaults["--pui-tooltip-foreground"], out["--pui-tooltip"]);

  return out as PreuiTokens;
}
