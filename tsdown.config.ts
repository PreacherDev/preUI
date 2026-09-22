import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "icons/lucide": "src/icons/adapters/lucide.tsx",
    tailwind: "src/tailwind/preset.ts",
    // Components with heavy third-party dependencies get their own entry (optional peer deps).
    chart: "src/components/Chart/index.ts",
    calendar: "src/components/Calendar/index.ts",
    carousel: "src/components/Carousel/index.ts",
    command: "src/components/Command/index.ts",
    resizable: "src/components/Resizable/index.ts",
    form: "src/components/HookForm/index.ts",
    "data-table": "src/components/DataTable/index.ts",
    code: "src/components/Code/index.ts",
    markdown: "src/components/Markdown/index.ts",
    editor: "src/components/Editor/index.ts",
  },
  format: ["esm", "cjs"],
  platform: "neutral",
  // Syntax is lowered for Chromium 103 (CEF / FiveM NUI) and Node 18 (CJS consumers, SSR).
  target: ["chrome103", "node18"],
  dts: true,
  sourcemap: true,
  clean: true,
  // @tanstack/*: react-table re-exports table-core's types — without this the d.ts bundler would
  // inline a second copy of them, and users' column types would no longer match. The same applies to
  // the multi-package editors (CodeMirror, Lezer, Tiptap) and Shiki's subpath imports.
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "lucide-react",
    "tailwindcss",
    /^@tanstack\//,
    /^@codemirror\//,
    /^@lezer\//,
    /^@tiptap\//,
    /^shiki/,
  ],
  // Plain CSS entry; its @imports are resolved by the consumer's bundler.
  copy: ["src/fonts.css"],
  outputOptions: {
    banner: '"use client";',
  },
});
