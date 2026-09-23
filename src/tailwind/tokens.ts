// The design token values (both schemes) and their selectors. Kept apart from the Tailwind preset so the runtime
// theming helpers (applyTokens, deriveTokens, contrast) can use them without importing the preset.

/** Default look (dark scheme): dark surfaces, blue accent. Values from the design handoff (`tokens/colors.css`). */
const baseTokens = {
  // Surfaces
  "--pui-backdrop": "220 14% 22%",
  "--pui-shell": "225 11% 11%",
  "--pui-background": "225 12% 9%",
  "--pui-foreground": "225 12% 92%",
  "--pui-card": "225 11% 12%",
  "--pui-card-foreground": "225 12% 92%",
  "--pui-popover": "225 11% 13%",
  "--pui-popover-foreground": "225 12% 92%",
  "--pui-rail-active": "225 10% 17%",
  "--pui-tooltip": "225 9% 22%",
  "--pui-tooltip-foreground": "225 12% 96%",
  // Dialog/sheet/drawer backdrop colour (strength: --pui-overlay-opacity)
  "--pui-scrim": "var(--pui-background)",

  // Interactive
  "--pui-primary": "217 91% 63%",
  "--pui-primary-foreground": "225 12% 9%",
  "--pui-secondary": "225 10% 16%",
  "--pui-secondary-foreground": "225 12% 92%",
  "--pui-muted": "225 10% 15%",
  "--pui-muted-foreground": "223 7% 58%",
  "--pui-accent": "225 10% 17%",
  "--pui-accent-foreground": "225 12% 96%",
  "--pui-border": "225 10% 18%",
  "--pui-input": "225 10% 20%",
  "--pui-ring": "217 91% 63%",
  // Switch / slider thumb
  "--pui-thumb": "var(--pui-foreground)",

  // Semantic
  "--pui-positive": "157 68% 45%",
  "--pui-positive-foreground": "225 12% 9%",
  "--pui-negative": "0 78% 65%",
  "--pui-negative-foreground": "225 12% 9%",
  "--pui-destructive": "0 72% 51%",
  "--pui-destructive-foreground": "225 12% 98%",
  "--pui-warning": "38 92% 55%",
  "--pui-warning-foreground": "225 12% 9%",
  "--pui-info": "199 89% 60%",
  "--pui-info-foreground": "225 12% 9%",

  // Quality tiers
  "--pui-quality-low": "24 75% 56%",
  "--pui-quality-standard": "214 20% 70%",
  "--pui-quality-premium": "45 93% 58%",

  // Charts
  "--pui-chart-primary": "var(--pui-primary)",
  "--pui-chart-positive": "157 68% 38%",
  "--pui-chart-negative": "0 78% 62%",
  "--pui-chart-grid": "225 10% 17%",
  "--pui-chart-axis": "223 7% 50%",

  // Syntax highlighting (CodeBlock + CodeEditor)
  "--pui-syntax-foreground": "hsl(var(--pui-foreground))",
  "--pui-syntax-punctuation": "hsl(var(--pui-foreground) / 0.72)",
  "--pui-syntax-comment": "hsl(var(--pui-muted-foreground))",
  "--pui-syntax-keyword": "hsl(var(--pui-primary))",
  "--pui-syntax-operator": "hsl(var(--pui-primary) / 0.85)",
  "--pui-syntax-string": "hsl(var(--pui-positive))",
  "--pui-syntax-regexp": "hsl(var(--pui-quality-low))",
  "--pui-syntax-constant": "hsl(var(--pui-warning))",
  "--pui-syntax-function": "hsl(var(--pui-info))",
  "--pui-syntax-type": "hsl(var(--pui-quality-standard))",
  "--pui-syntax-parameter": "hsl(var(--pui-foreground))",
  "--pui-syntax-property": "hsl(var(--pui-foreground))",
  "--pui-syntax-tag": "hsl(var(--pui-negative))",
  "--pui-syntax-attribute": "hsl(var(--pui-warning))",
  "--pui-syntax-heading": "hsl(var(--pui-primary))",
  "--pui-syntax-link": "hsl(var(--pui-info))",
  "--pui-syntax-inserted": "hsl(var(--pui-positive))",
  "--pui-syntax-deleted": "hsl(var(--pui-negative))",
  "--pui-syntax-changed": "hsl(var(--pui-warning))",
  "--pui-syntax-invalid": "hsl(var(--pui-negative))",

  // Tint strengths: accents are tinted, never solid (buttons, badges, alerts …)
  "--pui-tint-rest": "0.15",
  "--pui-tint-hover": "0.25",
  "--pui-tint-border": "0.3",

  // Sizes
  "--pui-control-h-sm": "2rem",
  "--pui-control-h": "2.25rem",
  "--pui-control-h-lg": "2.5rem",
  "--pui-ring-width": "1px",
  // Gap between a filled control and its focus ring (checkbox, switch, solid button)
  "--pui-ring-offset": "1px",
  // Dialog/sheet/drawer backdrop strength (over --pui-background)
  "--pui-overlay-opacity": "0.7",

  // Elevation (floating layers only — panels use borders)
  "--pui-shadow-window": "0 25px 50px -12px rgb(0 0 0 / 0.5)",
  "--pui-shadow-floating": "0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)",
  "--pui-shadow-tooltip":
    "0 4px 16px -4px hsl(var(--pui-background) / 0.9), 0 2px 6px -2px hsl(var(--pui-background) / 0.7)",
  "--pui-shadow-thumb": "0 2px 4px rgb(0 0 0 / 0.4)",

  // Motion
  "--pui-duration-fast": "150ms",
  "--pui-duration-base": "200ms",
  "--pui-duration-slow": "500ms",
  "--pui-ease": "cubic-bezier(0, 0, 0.2, 1)",

  // Shape & type
  "--pui-radius": "0.5rem",
  "--pui-font-sans": '"Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  "--pui-font-mono": '"JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
};

/**
 * All design tokens with their default values for the **dark** scheme (the default) — the source for the
 * preset, `tokens.css` and `npx preui init`. The light scheme is `lightTokens`. Brand/style themes are your
 * own selectors that override only what they change (e.g. `[data-theme="brand"] { --pui-primary: … }`).
 */
export const tokens = baseTokens;

export type PreuiTokens = typeof tokens;
export type PreuiTokenName = keyof PreuiTokens;

/** The two colour schemes preUI ships base values for. */
export type PreuiScheme = "dark" | "light";

/**
 * Tokens that don't depend on the scheme (sizes, motion, radius, fonts). They are defined once on `:root`
 * and not repeated in the light block, so changing them once applies to both schemes.
 */
export const sharedTokenNames = [
  "--pui-control-h-sm",
  "--pui-control-h",
  "--pui-control-h-lg",
  "--pui-ring-width",
  "--pui-ring-offset",
  "--pui-duration-fast",
  "--pui-duration-base",
  "--pui-duration-slow",
  "--pui-ease",
  "--pui-radius",
  "--pui-font-sans",
  "--pui-font-mono",
] as const satisfies readonly PreuiTokenName[];

type SharedTokenName = (typeof sharedTokenNames)[number];

const SHARED = new Set<string>(sharedTokenNames);

/** Light-scheme values for the scheme-dependent tokens (same keys as `tokens`, minus the shared ones). */
const lightSchemeTokens: Record<Exclude<PreuiTokenName, SharedTokenName>, string> = {
  // Surfaces
  "--pui-backdrop": "225 14% 88%",
  "--pui-shell": "225 22% 97%",
  "--pui-background": "0 0% 100%",
  "--pui-foreground": "225 18% 12%",
  "--pui-card": "0 0% 100%",
  "--pui-card-foreground": "225 18% 12%",
  "--pui-popover": "0 0% 100%",
  "--pui-popover-foreground": "225 18% 12%",
  "--pui-rail-active": "225 16% 92%",
  "--pui-tooltip": "225 14% 16%",
  "--pui-tooltip-foreground": "225 12% 96%",
  "--pui-scrim": "225 20% 10%",

  // Interactive
  "--pui-primary": "221 83% 53%",
  "--pui-primary-foreground": "0 0% 100%",
  "--pui-secondary": "225 16% 94%",
  "--pui-secondary-foreground": "225 18% 12%",
  "--pui-muted": "225 16% 94%",
  "--pui-muted-foreground": "224 9% 42%",
  "--pui-accent": "225 16% 94%",
  "--pui-accent-foreground": "225 18% 10%",
  "--pui-border": "225 14% 89%",
  "--pui-input": "225 12% 82%",
  "--pui-ring": "221 83% 53%",
  "--pui-thumb": "0 0% 100%",

  // Semantic
  "--pui-positive": "158 82% 26%",
  "--pui-positive-foreground": "0 0% 100%",
  "--pui-negative": "0 72% 47%",
  "--pui-negative-foreground": "0 0% 100%",
  "--pui-destructive": "0 72% 46%",
  "--pui-destructive-foreground": "0 0% 100%",
  "--pui-warning": "32 95% 33%",
  "--pui-warning-foreground": "0 0% 100%",
  "--pui-info": "200 92% 34%",
  "--pui-info-foreground": "0 0% 100%",

  // Quality tiers
  "--pui-quality-low": "22 82% 44%",
  "--pui-quality-standard": "215 16% 45%",
  "--pui-quality-premium": "40 92% 40%",

  // Charts
  "--pui-chart-primary": "var(--pui-primary)",
  "--pui-chart-positive": "158 72% 36%",
  "--pui-chart-negative": "0 72% 55%",
  "--pui-chart-grid": "225 14% 91%",
  "--pui-chart-axis": "224 8% 46%",

  // Syntax highlighting (CodeBlock + CodeEditor) — a readable light theme
  "--pui-syntax-foreground": "hsl(var(--pui-foreground))",
  "--pui-syntax-punctuation": "hsl(var(--pui-foreground) / 0.68)",
  "--pui-syntax-comment": "hsl(224 8% 48%)",
  "--pui-syntax-keyword": "hsl(var(--pui-primary))",
  "--pui-syntax-operator": "hsl(var(--pui-primary) / 0.85)",
  "--pui-syntax-string": "hsl(158 78% 27%)",
  "--pui-syntax-regexp": "hsl(22 85% 40%)",
  "--pui-syntax-constant": "hsl(30 92% 34%)",
  "--pui-syntax-function": "hsl(262 60% 50%)",
  "--pui-syntax-type": "hsl(199 90% 32%)",
  "--pui-syntax-parameter": "hsl(var(--pui-foreground))",
  "--pui-syntax-property": "hsl(var(--pui-foreground))",
  "--pui-syntax-tag": "hsl(0 70% 45%)",
  "--pui-syntax-attribute": "hsl(30 92% 34%)",
  "--pui-syntax-heading": "hsl(var(--pui-primary))",
  "--pui-syntax-link": "hsl(199 90% 32%)",
  "--pui-syntax-inserted": "hsl(158 78% 27%)",
  "--pui-syntax-deleted": "hsl(0 70% 45%)",
  "--pui-syntax-changed": "hsl(30 92% 34%)",
  "--pui-syntax-invalid": "hsl(0 70% 45%)",

  // Tint strengths: light surfaces need a bit less colour for the same visual weight
  "--pui-tint-rest": "0.1",
  "--pui-tint-hover": "0.16",
  "--pui-tint-border": "0.3",

  // Backdrop strength (over --pui-scrim)
  "--pui-overlay-opacity": "0.4",

  // Elevation: lighter, softer shadows
  "--pui-shadow-window": "0 24px 48px -12px rgb(16 24 40 / 0.18), 0 2px 6px -2px rgb(16 24 40 / 0.06)",
  "--pui-shadow-floating": "0 12px 24px -6px rgb(16 24 40 / 0.12), 0 4px 8px -4px rgb(16 24 40 / 0.08)",
  "--pui-shadow-tooltip": "0 4px 12px -2px rgb(16 24 40 / 0.2), 0 1px 3px rgb(16 24 40 / 0.1)",
  "--pui-shadow-thumb": "0 1px 3px rgb(16 24 40 / 0.25), 0 0 0 0.5px rgb(16 24 40 / 0.08)",
};

const TOKEN_NAMES = Object.keys(baseTokens) as PreuiTokenName[];

/** Orders values like `tokens` (so both blocks read the same) and drops keys not in `names`. */
function ordered(values: Record<string, string>, names: readonly string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of names) if (name in values) result[name] = values[name];
  return result;
}

/**
 * All tokens for the **light** scheme: the light colours, tints, overlay and shadows plus the shared
 * (scheme-independent) tokens — the same key set as `tokens`.
 */
export const lightTokens = ordered({ ...baseTokens, ...lightSchemeTokens }, TOKEN_NAMES) as PreuiTokens;

/** Both schemes' complete token sets. */
export const schemes: Record<PreuiScheme, PreuiTokens> = { dark: tokens, light: lightTokens };

/** The tokens a scheme block sets (every token except the shared, scheme-independent ones). */
export function schemeTokens(scheme: PreuiScheme): Record<string, string> {
  return ordered(
    schemes[scheme],
    TOKEN_NAMES.filter((name) => !SHARED.has(name)),
  );
}

/**
 * Selectors of the generated blocks when both schemes are emitted: dark is the default on `:root`
 * (and on any `[data-scheme="dark"]` subtree), light applies under `[data-scheme="light"]`.
 */
export const schemeSelectors: Record<PreuiScheme, string> = {
  dark: ':root, [data-scheme="dark"]',
  light: '[data-scheme="light"]',
};

