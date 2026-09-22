import type { Config, PluginAPI } from "tailwindcss/types/config";

/** Colors are stored as HSL channels so Tailwind opacity modifiers work (e.g. `bg-pui-primary/15`). */
const color = (name: string) => `hsl(var(--pui-${name}) / <alpha-value>)`;

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
  "--pui-primary": "217 91% 60%",
  "--pui-primary-foreground": "225 12% 98%",
  "--pui-secondary": "225 10% 16%",
  "--pui-secondary-foreground": "225 12% 92%",
  "--pui-muted": "225 10% 15%",
  "--pui-muted-foreground": "223 7% 58%",
  "--pui-accent": "225 10% 17%",
  "--pui-accent-foreground": "225 12% 96%",
  "--pui-border": "225 10% 18%",
  "--pui-input": "225 10% 20%",
  "--pui-ring": "217 91% 60%",
  // Switch / slider thumb
  "--pui-thumb": "var(--pui-foreground)",

  // Semantic
  "--pui-positive": "157 68% 45%",
  "--pui-positive-foreground": "225 12% 98%",
  "--pui-negative": "0 78% 62%",
  "--pui-negative-foreground": "225 12% 98%",
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
  "--pui-positive": "158 82% 30%",
  "--pui-positive-foreground": "0 0% 100%",
  "--pui-negative": "0 72% 50%",
  "--pui-negative-foreground": "0 0% 100%",
  "--pui-destructive": "0 72% 46%",
  "--pui-destructive-foreground": "0 0% 100%",
  "--pui-warning": "32 95% 40%",
  "--pui-warning-foreground": "0 0% 100%",
  "--pui-info": "200 92% 36%",
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

/** Explanatory comment placed at the top of generated token files (`tokens.css`, `npx preui init`). */
export const tokensHeader = `/*
 * preUI design tokens — edit freely, this file is yours (like shadcn/ui's globals.css).
 * Use it with createPreuiPreset({ injectTokens: false }) so this file is the only source.
 * Colours are HSL channels ("217 91% 60%") so Tailwind opacity modifiers keep working (bg-pui-primary/tint).
 *
 * Two independent axes on <html>, set by <ThemeProvider> (and by <ThemeScript> before the first paint):
 *   data-scheme="dark" | "light"  The colour scheme. Dark is the default (:root); the light block overrides the
 *                                 scheme-dependent tokens. Sizes, motion, radius and fonts are shared (:root only).
 *   data-theme="<name>"           Your own brand/style theme: override only what it changes, the rest comes from
 *                                 the scheme. Put theme rules after these blocks:
 *     [data-theme="brand"] { --pui-primary: 262 83% 58%; --pui-ring: 262 83% 58%; }
 *     [data-theme="brand"][data-scheme="light"] { --pui-primary: 262 70% 48%; }  (optional light fine-tuning)
 *     [data-theme="paper"] { color-scheme: light; --pui-background: 40 30% 98%; }  (light-only theme — declare it
 *                                 as <ThemeProvider themes={{ paper: "light" }}> so the light base applies)
 */
`;

export interface TokensToCssOptions {
  /** Prepend the explanatory header comment. @default false */
  header?: boolean;
  /**
   * Which scheme(s) to emit. `"both"`: dark on `:root, [data-scheme="dark"]` plus the light block under
   * `[data-scheme="light"]`. `"dark"` / `"light"`: that scheme's complete token set on `:root` (single-scheme apps).
   * @default "both"
   */
  scheme?: PreuiScheme | "both";
}

function cssBlock(selector: string, values: Record<string, string>) {
  const lines = Object.entries(values).map(([name, value]) => `  ${name}: ${value};`);
  return [`${selector} {`, ...lines, "}", ""].join("\n");
}

/** Renders the tokens as CSS blocks (optionally with the explanatory header comment). */
export function tokensToCss({ header = false, scheme = "both" }: TokensToCssOptions = {}): string {
  const css =
    scheme === "both"
      ? [
          cssBlock(schemeSelectors.dark, { ...tokens, "color-scheme": "dark" }),
          cssBlock(schemeSelectors.light, { ...schemeTokens("light"), "color-scheme": "light" }),
        ].join("\n")
      : cssBlock(":root", { ...schemes[scheme], "color-scheme": scheme });
  return header ? `${tokensHeader}\n${css}` : css;
}

export interface PreuiPresetOptions {
  /**
   * Inject the token defaults into Tailwind's base layer.
   * Set `false` when your own CSS defines all tokens (e.g. the file from `npx preui init`).
   * @default true
   */
  injectTokens?: boolean;
  /**
   * Which scheme(s) to inject: `"both"` (dark on `:root`, light under `[data-scheme="light"]`), or a single
   * scheme's complete token set on `:root` for apps that only use one.
   * @default "both"
   */
  scheme?: PreuiScheme | "both";
}

const withForeground = (name: string) => ({
  DEFAULT: color(name),
  foreground: color(`${name}-foreground`),
});

/**
 * Tailwind v3 preset for preUI.
 *
 * tailwind.config.js (CommonJS):
 *   const { createPreuiPreset } = require("@pre_scripts/preui/tailwind");
 *   module.exports = {
 *     presets: [createPreuiPreset()],                              // token defaults injected
 *     // presets: [createPreuiPreset({ injectTokens: false })],    // tokens come from your own CSS
 *     content: ["./src/**\/*.{ts,tsx}", "./node_modules/@pre_scripts/preui/dist/**\/*.{js,cjs}"],
 *   };
 *
 * ESM (tailwind.config.mjs / .ts): `import { createPreuiPreset } from "@pre_scripts/preui/tailwind"`.
 */
export function createPreuiPreset({ injectTokens = true, scheme = "both" }: PreuiPresetOptions = {}) {
  return {
  content: [],
  theme: {
    extend: {
      colors: {
        pui: {
          backdrop: color("backdrop"),
          shell: color("shell"),
          background: color("background"),
          foreground: color("foreground"),
          card: withForeground("card"),
          popover: withForeground("popover"),
          "rail-active": color("rail-active"),
          tooltip: withForeground("tooltip"),
          scrim: color("scrim"),
          thumb: color("thumb"),
          primary: withForeground("primary"),
          secondary: withForeground("secondary"),
          muted: withForeground("muted"),
          accent: withForeground("accent"),
          border: color("border"),
          input: color("input"),
          ring: color("ring"),
          positive: withForeground("positive"),
          negative: withForeground("negative"),
          destructive: withForeground("destructive"),
          warning: withForeground("warning"),
          info: withForeground("info"),
          quality: {
            low: color("quality-low"),
            standard: color("quality-standard"),
            premium: color("quality-premium"),
          },
          chart: {
            primary: color("chart-primary"),
            positive: color("chart-positive"),
            negative: color("chart-negative"),
            grid: color("chart-grid"),
            axis: color("chart-axis"),
          },
        },
      },
      borderRadius: {
        "pui-window": "calc(var(--pui-radius) + 4px)", // 12px — windows
        pui: "var(--pui-radius)", // 8px — panels, tables, dialogs
        // max(0px, …) keeps the derived radii valid when --pui-radius is set below 4px.
        "pui-md": "max(0px, calc(var(--pui-radius) - 2px))", // 6px — buttons, inputs, badges
        "pui-sm": "max(0px, calc(var(--pui-radius) - 4px))", // 4px — menu items, checkbox
      },
      boxShadow: {
        "pui-window": "var(--pui-shadow-window)",
        "pui-floating": "var(--pui-shadow-floating)",
        "pui-tooltip": "var(--pui-shadow-tooltip)",
        "pui-thumb": "var(--pui-shadow-thumb)",
      },
      // Control heights: h-pui-control, size-pui-control-sm, min-h-pui-control-lg …
      spacing: {
        "pui-control-sm": "var(--pui-control-h-sm)",
        "pui-control": "var(--pui-control-h)",
        "pui-control-lg": "var(--pui-control-h-lg)",
      },
      // Tint strengths as opacity modifiers: bg-pui-primary/tint, hover:bg-pui-primary/tint-hover …
      opacity: {
        tint: "var(--pui-tint-rest)",
        "tint-hover": "var(--pui-tint-hover)",
        "tint-border": "var(--pui-tint-border)",
        scrim: "var(--pui-overlay-opacity)",
      },
      ringWidth: {
        pui: "var(--pui-ring-width)",
      },
      ringOffsetWidth: {
        pui: "var(--pui-ring-offset)",
      },
      transitionDuration: {
        "pui-fast": "var(--pui-duration-fast)",
        "pui-base": "var(--pui-duration-base)",
        "pui-slow": "var(--pui-duration-slow)",
      },
      transitionTimingFunction: {
        pui: "var(--pui-ease)",
      },
      fontFamily: {
        sans: "var(--pui-font-sans)",
        mono: "var(--pui-font-mono)",
      },
      // Handoff line heights: tight 1.15 (headings, two-line menu rows), snug 1.35 (tooltip, textarea).
      lineHeight: {
        tight: "1.15",
        snug: "1.35",
      },
      fontSize: {
        "pui-2xs": ["0.625rem", { lineHeight: "0.875rem" }], // 10px — counter badges
        "pui-eyebrow": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.12em" }], // 11px — uppercase labels
      },
      // Indeterminate Progress: a 40%-wide bar sliding across the track (animate-pui-progress-indeterminate).
      keyframes: {
        "pui-progress-indeterminate": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
      },
      animation: {
        "pui-progress-indeterminate": "pui-progress-indeterminate 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [
    // A plain function plugin, so the preset has no runtime import of tailwindcss.
    ({ addBase }: PluginAPI) => {
      if (injectTokens) {
        if (scheme === "both") {
          addBase({
            [schemeSelectors.dark]: { ...tokens, colorScheme: "dark" },
            [schemeSelectors.light]: { ...schemeTokens("light"), colorScheme: "light" },
          });
        } else {
          addBase({ ":root": { ...schemes[scheme], colorScheme: scheme } });
        }
      }
      addBase({
        // Tabular figures everywhere, so live numbers never jump.
        html: { fontFeatureSettings: '"tnum" 1, "cv11" 1' },

        // Scrollbars reserve their 10px track and show the thumb only while the container is hovered,
        // so nothing ever shifts. WebKit/Blink get the exact look; the standard properties are limited
        // to Firefox, because Chrome ignores ::-webkit-scrollbar once scrollbar-color/-width are set.
        "::-webkit-scrollbar": { width: "10px", height: "10px" },
        "::-webkit-scrollbar-track, ::-webkit-scrollbar-corner": { background: "transparent" },
        "::-webkit-scrollbar-thumb": {
          border: "3px solid transparent",
          backgroundClip: "content-box",
          backgroundColor: "transparent",
          borderRadius: "9999px",
        },
        "*:hover::-webkit-scrollbar-thumb": { backgroundColor: "hsl(var(--pui-muted-foreground) / 0.35)" },
        "*:hover::-webkit-scrollbar-thumb:hover": { backgroundColor: "hsl(var(--pui-muted-foreground) / 0.6)" },
        // Small-viewport height for full-height layouts (Sidebar); browsers without svh units (Chromium < 108,
        // e.g. CEF / FiveM) fall back to 100vh via var(--pui-viewport-height, 100vh).
        "@supports (height: 100svh)": { ":root": { "--pui-viewport-height": "100svh" } },
        "@supports (-moz-appearance: none)": {
          "*": { scrollbarWidth: "thin", scrollbarColor: "transparent transparent" },
          "*:hover": { scrollbarColor: "hsl(var(--pui-muted-foreground) / 0.35) transparent" },
        },
      });
    },
  ],
  } satisfies Config;
}

/** The preset with token defaults injected. */
const preuiPreset = createPreuiPreset();

export default preuiPreset;
