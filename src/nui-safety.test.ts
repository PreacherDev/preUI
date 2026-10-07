/// <reference types="vite/client" />
// CSS that breaks in FiveM NUI (CEF on Chromium 103) must never reach a component. backdrop-filter (blur) flickers
// permanently there (open CEF bug) — see-through panels use --pui-surface-opacity instead (e.g. the Glass preset).
import { describe, expect, it } from "vitest";

const sources = import.meta.glob(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}", "!./**/*.d.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const FORBIDDEN = [/backdrop-blur/, /backdrop-filter/, /backdropFilter/, /backdrop-saturate/, /backdrop-brightness/];

describe("NUI safety", () => {
  it("no component uses backdrop-filter (flickers in CEF 103)", () => {
    const hits = Object.entries(sources).flatMap(([file, code]) =>
      FORBIDDEN.filter((pattern) => pattern.test(code)).map((pattern) => `${file}: ${pattern.source}`),
    );
    expect(hits).toEqual([]);
  });
});
