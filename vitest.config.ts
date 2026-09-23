import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // packages/preui-nui imports the library by its package name; tests run against the source.
    alias: { "@pre_scripts/preui": fileURLToPath(new URL("./src/index.ts", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    exclude: ["**/node_modules/**", "**/dist/**", "examples/**"],
  },
});
