import { describe, expect, it } from "vitest";
import { lightTokens, tokens, type PreuiScheme, type PreuiTokenName } from "../tailwind/tokens";
import { CHART_COLOR_COUNT, chartColor, chartColors } from "./chart-colors";
import { getContrast } from "./contrast";

describe("chartColor", () => {
  it("returns the token colour of a series index and wraps around", () => {
    expect(chartColor(0)).toBe("hsl(var(--pui-chart-1))");
    expect(chartColor(7)).toBe("hsl(var(--pui-chart-8))");
    expect(chartColor(8)).toBe("hsl(var(--pui-chart-1))");
    expect(chartColor(9)).toBe("hsl(var(--pui-chart-2))");
    expect(chartColor(-1)).toBe("hsl(var(--pui-chart-8))");
    expect(chartColor(1.7)).toBe("hsl(var(--pui-chart-2))");
  });

  it("takes an alpha", () => {
    expect(chartColor(2, 0.3)).toBe("hsl(var(--pui-chart-3) / 0.3)");
  });

  it("chartColors lists every colour in order", () => {
    expect(chartColors).toHaveLength(CHART_COLOR_COUNT);
    expect(chartColors.map((_, index) => chartColor(index))).toEqual([...chartColors]);
  });
});

const schemes: Record<PreuiScheme, Record<string, string>> = {
  dark: tokens as Record<string, string>,
  light: lightTokens as Record<string, string>,
};

/** Follows `var(--pui-x)` references like the contrast checker does. */
function value(set: Record<string, string>, name: string, depth = 0): string {
  const raw = set[name];
  const ref = /^var\((--pui-[a-z0-9-]+)\)$/.exec(raw?.trim() ?? "");
  return ref && depth < 8 ? value(set, ref[1], depth + 1) : raw;
}

describe("categorical palette tokens", () => {
  for (const scheme of ["dark", "light"] as PreuiScheme[]) {
    it(`has all eight colours in the ${scheme} scheme, readable as a fill`, () => {
      const set = schemes[scheme];
      const colours: string[] = [];
      for (let index = 1; index <= CHART_COLOR_COUNT; index += 1) {
        const name = `--pui-chart-${index}` as PreuiTokenName;
        expect(set[name]).toBeDefined();
        const resolved = value(set, name);
        // Fills and strokes, not text: WCAG's 3:1 for graphical objects.
        expect(getContrast(resolved, value(set, "--pui-background"))).toBeGreaterThanOrEqual(3);
        expect(getContrast(resolved, value(set, "--pui-card"))).toBeGreaterThanOrEqual(3);
        colours.push(resolved);
      }
      expect(new Set(colours).size).toBe(CHART_COLOR_COUNT);
    });
  }

  it("the first colour follows the accent and the palette is scheme-dependent", () => {
    expect((tokens as Record<string, string>)["--pui-chart-1"]).toBe("var(--pui-chart-primary)");
    expect((lightTokens as Record<string, string>)["--pui-chart-1"]).toBe("var(--pui-chart-primary)");
    expect((tokens as Record<string, string>)["--pui-chart-5"]).not.toBe(
      (lightTokens as Record<string, string>)["--pui-chart-5"],
    );
  });
});
