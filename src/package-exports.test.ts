/// <reference types="vite/client" />
// Every build entry (tsdown.config.ts) is reachable through package.json `exports`, with ESM + CJS and their types.
import { describe, expect, it } from "vitest";
import config from "../tsdown.config";

const raw = import.meta.glob("../package.json", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const pkg = JSON.parse(raw["../package.json"]) as {
  exports: Record<string, string | { import: { types: string; default: string }; require: { types: string; default: string } }>;
};
const entries = (config as { entry: Record<string, string> }).entry;
const indexSource = (import.meta.glob("./index.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>)["./index.ts"];

describe("package exports", () => {
  it("exposes every build entry with import / require and types", () => {
    for (const name of Object.keys(entries)) {
      const subpath = name === "index" ? "." : `./${name}`;
      expect(pkg.exports[subpath], subpath).toEqual({
        import: { types: `./dist/${name}.d.ts`, default: `./dist/${name}.js` },
        require: { types: `./dist/${name}.d.cts`, default: `./dist/${name}.cjs` },
      });
    }
  });

  it("has the ThemeEditor entry and exposes package.json", () => {
    expect(entries["theme-editor"]).toBe("src/components/ThemeEditor/index.ts");
    expect(pkg.exports["./package.json"]).toBe("./package.json");
  });

  it("keeps the ThemeEditor out of the main entry, so a lazy import splits it off", () => {
    // Re-exporting it from `index` made every bundle that imports the main entry load the whole editor (bug 0.12-0.14).
    expect(indexSource).not.toMatch(/components\/ThemeEditor/);
  });
});
