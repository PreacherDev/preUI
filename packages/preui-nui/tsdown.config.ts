import { defineConfig } from "tsdown";

export default defineConfig({
  // vite: build-time plugin (Node), kept out of the browser entry. loadscreen: only for loading screen pages.
  entry: { index: "src/index.ts", vite: "src/vite.ts", loadscreen: "src/loadscreen.ts" },
  format: ["esm", "cjs"],
  platform: "neutral",
  // FiveM NUI runs Chromium 103.
  target: ["chrome103", "node18"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react/jsx-runtime", "@pre_scripts/preui", /^node:/],
  outputOptions: {
    banner: '"use client";',
  },
});
