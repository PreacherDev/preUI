import type { Config, PluginAPI } from "tailwindcss/types/config";

/** Colors are stored as HSL channels so Tailwind opacity modifiers work (e.g. `bg-pui-primary/15`). */
const color = (name: string) => `hsl(var(--pui-${name}) / <alpha-value>)`;
import { renderTokenOverrides, tokenOverridesHeader, type TokenOverrides } from "../theming/token-css";
import { schemeSelectors, schemes, schemeTokens, tokens, type PreuiScheme } from "./tokens";

export * from "./tokens";
export { runtimeTokenSelectors, toHslChannels } from "../theming/token-css";
export { checkTokenContrast, contrastPairs, getContrast, getContrastLevel } from "../theming/contrast";
export type { ContrastLevel, TokenContrastResult } from "../theming/contrast";
export { deriveTokens } from "../theming/derive";
export type { DeriveTokensBase } from "../theming/derive";
export type { PreuiTokenKey, TokenInput, TokenOverrides } from "../theming/token-css";
export {
  checkThemeConfigContrast,
  defaultThemePresets,
  resolveThemeConfig,
  resolveThemeConfigTokens,
  resolveThemePalette,
} from "../theming/theme-config";
export type { ThemeConfig, ThemePalette, ThemePreset } from "../theming/theme-config";

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
  /**
   * Write CSS `color-scheme` (dark/light) with the tokens, so native scrollbars and form controls follow the scheme.
   * Set `false` for pages rendered in a transparent iframe — **FiveM NUI**: Chromium paints an iframe whose
   * color-scheme differs from its parent's with an opaque background, which would cover the game.
   * @default true
   */
  colorScheme?: boolean;
  /**
   * Render only these overrides instead of the full token set: `{ shared, dark, light }`, the same object
   * `applyTokens` and `<ThemeProvider tokens>` take. Colours are normalised to HSL channels, invalid entries are
   * dropped, and the blocks use the runtime selectors (`runtimeTokenSelectors`), so the file behaves exactly like
   * `applyTokens` — e.g. to export a theme from an editor or to ship it at build time. `scheme` is ignored.
   */
  tokens?: TokenOverrides;
}

/** `{ [property]: scheme }`, or nothing when `color-scheme` is switched off. */
const withColorScheme = (enabled: boolean, property: string, scheme: PreuiScheme): Record<string, string> =>
  enabled ? { [property]: scheme } : {};

function cssBlock(selector: string, values: Record<string, string>) {
  const lines = Object.entries(values).map(([name, value]) => `  ${name}: ${value};`);
  return [`${selector} {`, ...lines, "}", ""].join("\n");
}

/** Renders the tokens as CSS blocks (optionally with the explanatory header comment). */
export function tokensToCss({
  header = false,
  scheme = "both",
  colorScheme = true,
  tokens: overrides,
}: TokensToCssOptions = {}): string {
  if (overrides) {
    const { css } = renderTokenOverrides(overrides);
    return header ? `${tokenOverridesHeader}
${css}` : css;
  }
  const css =
    scheme === "both"
      ? [
          cssBlock(schemeSelectors.dark, { ...tokens, ...withColorScheme(colorScheme, "color-scheme", "dark") }),
          cssBlock(schemeSelectors.light, {
            ...schemeTokens("light"),
            ...withColorScheme(colorScheme, "color-scheme", "light"),
          }),
        ].join("\n")
      : cssBlock(":root", { ...schemes[scheme], ...withColorScheme(colorScheme, "color-scheme", scheme) });
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
  /**
   * Write CSS `color-scheme` (dark/light) with the tokens, so native scrollbars and form controls follow the scheme.
   * Set `false` for pages rendered in a transparent iframe — **FiveM NUI**: Chromium paints an iframe whose
   * color-scheme differs from its parent's with an opaque background, which would cover the game.
   * @default true
   */
  colorScheme?: boolean;
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
export function createPreuiPreset({ injectTokens = true, scheme = "both", colorScheme = true }: PreuiPresetOptions = {}) {
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
            [schemeSelectors.dark]: { ...tokens, ...withColorScheme(colorScheme, "colorScheme", "dark") },
            [schemeSelectors.light]: { ...schemeTokens("light"), ...withColorScheme(colorScheme, "colorScheme", "light") },
          });
        } else {
          addBase({ ":root": { ...schemes[scheme], ...withColorScheme(colorScheme, "colorScheme", scheme) } });
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
