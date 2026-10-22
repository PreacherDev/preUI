/// <reference types="vite/client" />
// CSS that breaks in FiveM NUI (CEF on Chromium 103) must never reach a component. backdrop-filter (blur) flickers
// permanently there (open CEF bug) — see-through panels use --pui-surface-opacity instead (e.g. the Glass preset).
// Native `title` tooltips are browser popups CEF never shows — components use Tooltip / WithTooltip / TruncateText.
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

  it("no component relies on a native title tooltip (CEF never shows it)", () => {
    const hits = Object.entries(sources)
      .filter(([file]) => file.startsWith("./components/"))
      .flatMap(([file, code]) =>
        code
          .split("\n")
          .map((line, index) => ({ line, index }))
          // `title={…}` / `title="…"` on an element. Comments and components with a `title` prop
          // (`<ConfirmDialog title=…>` on one line) don't count.
          .filter(({ line }) => /\stitle=[{"]/.test(line))
          .filter(({ line }) => !/^\s*(\*|\/\/)/.test(line) && !/<[A-Z][\w.]*[^>]*\stitle=/.test(line))
          .map(({ index }) => `${file}:${index + 1}`),
      );
    expect(hits).toEqual([]);
  });
});
