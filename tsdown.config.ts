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
    // No third-party dependency, but large and usually lazy-loaded (a settings screen): its own entry lets a bundler
    // split it out. Still re-exported from `index` (same shared chunk, so contexts and icons stay one instance).
    "theme-editor": "src/components/ThemeEditor/index.ts",
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
    // The ThemeEditor is re-exported from `index` as well, so without this its modules land in the same chunk as the
    // building blocks it uses (Card, Badge, Field, Slider …). A consumer that imports one of those from the main
    // entry would then get the whole editor in its main bundle, because a module can only live in one chunk — the
    // lazily imported `@pre_scripts/preui/theme-editor` could not be split off (bug, 0.13.0). Its own chunk keeps
    // the editor out of every other chunk.
    codeSplitting: {
      // Only the editor's own modules — its dependencies stay in the chunks every entry shares.
      includeDependenciesRecursively: false,
      groups: [
        {
          name: "theme-editor",
          // Only the JS pass: the .d.ts pass runs through the same options and must keep its own chunking.
          test: (id: string) => /[\\/]src[\\/]components[\\/]ThemeEditor[\\/]/.test(id) && !id.endsWith(".d.ts"),
        },
      ],
    },
  },
});
