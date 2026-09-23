import { createPreuiPreset } from "@pre_scripts/preui/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
  // colorScheme: false — FiveM shows NUI pages in a transparent iframe; a `color-scheme` that differs from the
  // parent page makes Chromium paint an opaque background over the game.
  presets: [createPreuiPreset({ colorScheme: false })],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./node_modules/@pre_scripts/preui/dist/**/*.{js,cjs}"],
};
