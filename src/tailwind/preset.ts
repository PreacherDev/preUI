import type { Config, PluginAPI } from "tailwindcss/types/config";

/** Colors are stored as HSL channels so Tailwind opacity modifiers work (e.g. `bg-pui-primary/50`). */
const color = (name: string) => `hsl(var(--pui-${name}) / <alpha-value>)`;

const lightTokens = {
  "--pui-radius": "0.5rem",
  "--pui-primary": "221 83% 53%",
  "--pui-primary-hover": "224 76% 48%",
  "--pui-primary-foreground": "0 0% 100%",
  "--pui-secondary": "210 40% 96%",
  "--pui-secondary-hover": "214 32% 91%",
  "--pui-secondary-foreground": "222 47% 11%",
  "--pui-destructive": "0 72% 51%",
  "--pui-destructive-hover": "0 74% 42%",
  "--pui-destructive-foreground": "0 0% 100%",
  "--pui-foreground": "222 47% 11%",
  "--pui-border": "213 27% 84%",
  "--pui-accent": "210 40% 96%",
  "--pui-ring": "213 94% 68%",
};

const darkTokens = {
  "--pui-secondary": "217 33% 17%",
  "--pui-secondary-hover": "215 25% 27%",
  "--pui-secondary-foreground": "210 40% 98%",
  "--pui-foreground": "210 40% 98%",
  "--pui-border": "215 25% 27%",
  "--pui-accent": "217 33% 17%",
  "--pui-ring": "224 76% 48%",
};

/**
 * Tailwind v3 preset for preUI.
 *
 * tailwind.config.js:
 *   presets: [require("preui/tailwind")],
 *   content: ["./src/**\/*.{ts,tsx}", "./node_modules/preui/dist/**\/*.{js,cjs}"],
 */
const preuiPreset = {
  content: [],
  theme: {
    extend: {
      colors: {
        pui: {
          primary: {
            DEFAULT: color("primary"),
            hover: color("primary-hover"),
            foreground: color("primary-foreground"),
          },
          secondary: {
            DEFAULT: color("secondary"),
            hover: color("secondary-hover"),
            foreground: color("secondary-foreground"),
          },
          destructive: {
            DEFAULT: color("destructive"),
            hover: color("destructive-hover"),
            foreground: color("destructive-foreground"),
          },
          foreground: color("foreground"),
          border: color("border"),
          accent: color("accent"),
          ring: color("ring"),
        },
      },
      borderRadius: {
        pui: "var(--pui-radius)",
      },
    },
  },
  plugins: [
    // A plain function plugin, so the preset has no runtime import of tailwindcss.
    ({ addBase }: PluginAPI) => {
      addBase({
        ":root": lightTokens,
        '[data-theme="dark"], .dark': darkTokens,
      });
    },
  ],
} satisfies Config;

export default preuiPreset;
