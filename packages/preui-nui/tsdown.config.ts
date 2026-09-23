import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  platform: "neutral",
  // FiveM NUI runs Chromium 103.
  target: ["chrome103", "node18"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react/jsx-runtime", "@pre_scripts/preui"],
  outputOptions: {
    banner: '"use client";',
  },
});
