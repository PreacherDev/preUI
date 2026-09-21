import type { Config, PluginAPI } from "tailwindcss/types/config";

/** Colors are stored as HSL channels so Tailwind opacity modifiers work (e.g. `bg-pui-primary/15`). */
const color = (name: string) => `hsl(var(--pui-${name}) / <alpha-value>)`;

/** Default look: dark surfaces, blue accent. Values from the design handoff (`tokens/colors.css`). */
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
 * All design tokens with their default values — the source for the preset, `tokens.css` and `npx preui init`.
 * There are no built-in alternative themes: create your own by overriding tokens, globally in `:root` or
 * scoped under any selector (e.g. `[data-theme="brand"] { --pui-primary: … }`).
 */
export const tokens = baseTokens;

export type PreuiTokens = typeof tokens;

/** Explanatory comment placed at the top of generated token files (`tokens.css`, `npx preui init`). */
export const tokensHeader = `/*
 * preUI design tokens — edit freely, this file is yours (like shadcn/ui's globals.css).
 * Use it with createPreuiPreset({ injectTokens: false }) so this file is the only source.
 * Colours are HSL channels ("217 91% 60%") so Tailwind opacity modifiers keep working (bg-pui-primary/tint).
 * Create your own theme by overriding tokens — globally here, or scoped: [data-theme="brand"] { --pui-primary: 262 83% 58%; }
 */
`;

/** Renders all tokens as a `:root { … }` block (optionally with the explanatory header comment). */
export function tokensToCss({ header = false }: { header?: boolean } = {}): string {
  const block = (selector: string, values: Record<string, string>) => {
    const lines = Object.entries(values).map(([name, value]) => `  ${name}: ${value};`);
    return [`${selector} {`, ...lines, "}", ""].join("\n");
  };
  const css = block(":root", { ...baseTokens, "color-scheme": "dark" });
  return header ? `${tokensHeader}\n${css}` : css;
}

export interface PreuiPresetOptions {
  /**
   * Inject the token defaults (`:root`) into Tailwind's base layer.
   * Set `false` when your own CSS defines all tokens (e.g. the file from `npx preui init`).
   * @default true
   */
  injectTokens?: boolean;
}

const withForeground = (name: string) => ({
  DEFAULT: color(name),
  foreground: color(`${name}-foreground`),
});

/**
 * Tailwind v3 preset for preUI.
 *
 * tailwind.config.js:
 *   presets: [require("@pre_scripts/preui/tailwind")],           // token defaults injected
 *   presets: [createPreuiPreset({ injectTokens: false })],       // tokens come from your own CSS
 *   content: ["./src/**\/*.{ts,tsx}", "./node_modules/@pre_scripts/preui/dist/**\/*.{js,cjs}"],
 */
export function createPreuiPreset({ injectTokens = true }: PreuiPresetOptions = {}) {
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
    },
  },
  plugins: [
    // A plain function plugin, so the preset has no runtime import of tailwindcss.
    ({ addBase }: PluginAPI) => {
      if (injectTokens) addBase({ ":root": { ...baseTokens, colorScheme: "dark" } });
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
