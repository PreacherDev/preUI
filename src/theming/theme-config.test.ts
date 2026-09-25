import { describe, expect, it } from "vitest";
import { lightTokens, tokens } from "../tailwind/tokens";
import { checkTokenContrast } from "./contrast";
import { deriveTokens } from "./derive";
import {
  checkThemeConfigContrast,
  defaultThemePresets,
  resolveThemeConfig,
  resolveThemeConfigTokens,
  resolveThemePalette,
} from "./theme-config";

describe("resolveThemeConfig", () => {
  it("returns no overrides for an empty config", () => {
    expect(resolveThemeConfig({})).toEqual({ shared: undefined, dark: undefined, light: undefined });
    expect(resolveThemeConfig(null)).toEqual({ shared: undefined, dark: undefined, light: undefined });
    expect(resolveThemeConfig({ palette: { dark: {}, light: { primary: "" } } }).dark).toBeUndefined();
  });

  it("expands palettes and lets explicit tokens win", () => {
    const resolved = resolveThemeConfig({
      palette: { dark: { primary: "#f97316" } },
      tokens: { dark: { "--pui-ring": "#ffffff" }, shared: { radius: "0px" } },
    });
    expect(resolved.dark?.["--pui-primary"]).toBe("25 95% 53%");
    expect(resolved.dark?.["--pui-ring"]).toBe("#ffffff");
    expect(resolved.light).toBeUndefined();
    expect(resolved.shared).toEqual({ radius: "0px" });
  });

  it("only emits tokens that differ from the defaults and never shared tokens", () => {
    const dark = resolveThemePalette({ primary: "#f97316" }, "dark")!;
    expect(dark["--pui-primary"]).toBe("25 95% 53%");
    // Only the accent family changes; surfaces and text keep coming from the scheme / data-theme.
    for (const name of Object.keys(dark)) expect(["--pui-primary", "--pui-primary-foreground", "--pui-ring"]).toContain(name);
    expect(dark).not.toHaveProperty("--pui-radius");
    expect(dark).not.toHaveProperty("--pui-font-sans");
    const surfaces = resolveThemePalette({ background: "#101820" }, "dark")!;
    expect(surfaces["--pui-background"]).toBeDefined();
    expect(surfaces).not.toHaveProperty("--pui-radius");
    // Default primary when a palette leaves it out.
    expect(surfaces).not.toHaveProperty("--pui-primary");
  });

  it("resolves the complete token set of a scheme", () => {
    expect(resolveThemeConfigTokens({}, "dark")).toEqual(tokens);
    expect(resolveThemeConfigTokens({}, "light")).toEqual(lightTokens);
    const light = resolveThemeConfigTokens({ palette: { light: { primary: "#047857" } }, tokens: { shared: { radius: "0px" } } }, "light");
    expect(light["--pui-primary"]).toBe("163 94% 24%");
    expect(light["--pui-radius"]).toBe("0px");
  });

  it("checks the contrast of a config", () => {
    expect(checkThemeConfigContrast({}, "dark").every((result) => result.ratio >= 4.5)).toBe(true);
    const bad = checkThemeConfigContrast({ palette: { light: { primary: "#fde047" } } }, "light");
    expect(bad.some((result) => result.fg === "--pui-primary" && result.ratio < 4.5)).toBe(true);
  });
});

describe("defaultThemePresets", () => {
  it("has unique ids and starts with the default look", () => {
    const ids = defaultThemePresets.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(resolveThemeConfig(defaultThemePresets[0].config)).toEqual({ shared: undefined, dark: undefined, light: undefined });
  });

  for (const preset of defaultThemePresets) {
    for (const scheme of ["dark", "light"] as const) {
      it(`${preset.id} passes every contrast pair (≥ 4.5:1) in ${scheme}`, () => {
        const results = checkThemeConfigContrast(preset.config, scheme);
        expect(results.length).toBeGreaterThan(15);
        const failing = results.filter((result) => result.ratio < 4.5).map((r) => `${r.fg} on ${r.bg}: ${r.ratio.toFixed(2)}`);
        expect(failing).toEqual([]);
        // Same on the raw deriveTokens output.
        const defaults = scheme === "dark" ? tokens : lightTokens;
        const derived = deriveTokens({ primary: defaults["--pui-primary"], ...preset.config.palette?.[scheme] }, scheme);
        expect(checkTokenContrast(derived).filter((result) => result.ratio < 4.5)).toEqual([]);
      });
    }
  }
});
