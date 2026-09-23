/// <reference types="vite/client" />
// Keeps preUI tree-shakable for bundlers that don't analyse React calls (Rollup, i.e. Vite ≤ 7, webpack): every
// module-level component / variant / context must be marked pure, and nothing may run at module level otherwise.
import { describe, expect, it } from "vitest";

const sources = import.meta.glob(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}", "!./**/*.d.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const PURE_CALLS = ["forwardRef", "memo", "cva", "createContext", "extendTailwindMerge"];

const lineOf = (code: string, index: number) => code.slice(0, index).split("\n").length;

describe("tree-shaking", () => {
  it("scans the sources", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
  });

  it("marks module-level forwardRef / memo / cva / createContext calls as pure", () => {
    const missing: string[] = [];
    const pattern = new RegExp(`^(?:export )?const \\w+ = (?!/\\* @__PURE__ \\*/ )(${PURE_CALLS.join("|")})[<(]`, "gm");
    for (const [path, code] of Object.entries(sources)) {
      for (const match of code.matchAll(pattern)) missing.push(`${path}:${lineOf(code, match.index ?? 0)} ${match[0]}`);
    }
    // Fix: write `= /* @__PURE__ */ forwardRef<…>(…)` (same for memo, cva, createContext).
    expect(missing).toEqual([]);
  });

  it("has no module-level property assignments (e.g. `Component.displayName = …`)", () => {
    const offenders: string[] = [];
    for (const [path, code] of Object.entries(sources)) {
      for (const match of code.matchAll(/^[A-Za-z_$][\w$]*\.[\w$.]+ = /gm)) {
        offenders.push(`${path}:${lineOf(code, match.index ?? 0)} ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
