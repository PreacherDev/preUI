import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "icons/lucide": "src/icons/adapters/lucide.tsx",
    tailwind: "src/tailwind/preset.ts",
  },
  format: ["esm", "cjs"],
  // tsup sets `baseUrl` internally, which TypeScript 6 flags as deprecated.
  dts: { compilerOptions: { ignoreDeprecations: "6.0" } },
  sourcemap: true,
  clean: true,
  // Lets `require("preui/tailwind")` return the preset directly instead of `{ default }`.
  cjsInterop: true,
  splitting: true,
  external: ["react", "react-dom", "lucide-react", "tailwindcss"],
  banner: { js: '"use client";' },
});
