import { describe, expect, it } from "vitest";
import { checkThemeConfigContrast, defaultThemePresets, resolveThemeConfigTokens, type ThemeConfig } from "../../theming/theme-config";
import {
  applyPreset,
  deriveLightFromDark,
  fieldProblems,
  fixFieldContrast,
  fixFieldContrastWithTint,
  getStyleToken,
  matchesPreset,
  parseThemeImport,
} from "./theme-editor-config";

const problems = (config: ThemeConfig, scheme: "dark" | "light", key: Parameters<typeof fieldProblems>[0]) =>
  fieldProblems(key, checkThemeConfigContrast(config, scheme), 4.5);

describe("presets set the whole look", () => {
  const mono = defaultThemePresets.find((preset) => preset.id === "mono")!;
  const preui = defaultThemePresets.find((preset) => preset.id === "default")!;

  it("applying a preset replaces the style values and keeps the font", () => {
    const edited: ThemeConfig = { v: 1, tokens: { shared: { radius: "1rem", "surface-opacity": "0.7", "font-sans": "Rajdhani" } } };
    const withMono = applyPreset(edited, mono);
    expect(withMono.tokens?.shared).toEqual({ "font-sans": "Rajdhani", radius: "0.25rem", "tint-scale": "0.8" });
    // The default preset has no style values: back to the defaults, the font stays.
    expect(applyPreset(withMono, preui).tokens?.shared).toEqual({ "font-sans": "Rajdhani" });
  });

  it("matches only with the preset's style values (unset = default)", () => {
    expect(matchesPreset({ v: 1, palette: {} }, preui)).toBe(true);
    expect(matchesPreset({ v: 1, palette: {}, tokens: { shared: { radius: "0.5rem" } } }, preui)).toBe(true);
    expect(matchesPreset({ v: 1, palette: {}, tokens: { shared: { radius: "1rem" } } }, preui)).toBe(false);
    expect(matchesPreset(applyPreset({ v: 1 }, mono), mono)).toBe(true);
  });
});

describe("fixFieldContrast", () => {
  it("gives up when a raw token overrides the colour (the palette can't change it)", () => {
    const config = { v: 1, tokens: { light: { primary: "#d21459" } }, palette: { light: { background: "#fff4d6" } } } as const;
    expect(fixFieldContrast(config as never, "light", "primary", 4.5)).toBeNull();
  });

  it("finds the smallest lightness change that makes a field readable", () => {
    const unreadable: ThemeConfig = { v: 1, palette: { light: { primary: "#fde68a" } } }; // pale yellow on white
    expect(problems(unreadable, "light", "primary").length).toBeGreaterThan(0);
    const fixed = fixFieldContrast(unreadable, "light", "primary", 4.5)!;
    expect(fixed).not.toBeNull();
    expect(problems(fixed, "light", "primary")).toEqual([]);
    expect(fixed.palette?.light?.primary).not.toBe("#fde68a");
  });

  it("returns the config unchanged when nothing fails", () => {
    const fine: ThemeConfig = { v: 1, palette: {} };
    expect(fixFieldContrast(fine, "dark", "primary", 4.5)).toBe(fine);
  });
});

describe("fixFieldContrastWithTint", () => {
  // The highest accent strength: in the dark scheme no lightness makes a colour readable on its own tint.
  const strong: ThemeConfig = { v: 1, palette: {}, tokens: { shared: { "tint-scale": "3" } } };
  const withTint = (scale: number): ThemeConfig => ({ ...strong, tokens: { shared: { "tint-scale": String(scale) } } });

  const lightness = (config: ThemeConfig, key: "primary" | "positive" | "negative" | "warning" | "info") =>
    Number(resolveThemeConfigTokens(config, "dark")[`--pui-${key}`].split(" ")[2].replace("%", ""));

  it("lowers the accent strength just enough to keep the colour recognisable", () => {
    for (const key of ["primary", "positive", "negative", "warning", "info"] as const) {
      expect(problems(strong, "dark", key).length).toBeGreaterThan(0);
      expect(fixFieldContrast(strong, "dark", key, 4.5)).toBeNull();
      const fixed = fixFieldContrastWithTint(strong, "dark", key, 4.5)!;
      expect(problems(fixed, "dark", key)).toEqual([]);
      const scale = Number(getStyleToken(fixed, "tint-scale"));
      expect(scale).toBeLessThan(3);
      expect(scale).toBeGreaterThanOrEqual(0.5);
      // The colour moved by at most 12 lightness points (not to near-white).
      expect(Math.abs(lightness(fixed, key) - lightness(strong, key))).toBeLessThanOrEqual(12.5);
      // Just enough: one slider step stronger, a small lightness change no longer works.
      expect(fixFieldContrast(withTint(Math.round(scale * 10 + 1) / 10), "dark", key, 4.5, 12)).toBeNull();
    }
  });

  it("keeps the accent strength when a lightness change is enough", () => {
    const unreadable: ThemeConfig = { v: 1, palette: { light: { primary: "#fde68a" } } };
    const fixed = fixFieldContrastWithTint(unreadable, "light", "primary", 4.5)!;
    expect(problems(fixed, "light", "primary")).toEqual([]);
    expect(fixed.tokens?.shared).toBeUndefined();
  });
});

describe("deriveLightFromDark", () => {
  it("gives every dark accent a readable light counterpart with the same hue, keeps light surfaces", () => {
    const config: ThemeConfig = {
      v: 1,
      palette: { dark: { primary: "#34d399", warning: "#fbbf24", background: "#0b1324" }, light: { background: "#fffdf8" } },
    };
    const next = deriveLightFromDark(config, 4.5);
    expect(next.palette?.light?.background).toBe("#fffdf8");
    expect(next.palette?.light?.primary).toBeDefined();
    expect(next.palette?.light?.warning).toBeDefined();
    expect(next.palette?.light?.foreground).toBeUndefined();
    expect(problems(next, "light", "primary")).toEqual([]);
    expect(problems(next, "light", "warning")).toEqual([]);
  });
});

describe("parseThemeImport", () => {
  it("reads a theme, keeps known fields and lists what it drops", () => {
    const result = parseThemeImport(
      JSON.stringify({
        v: 1,
        scheme: "light",
        palette: { dark: { primary: "#a78bfa", nope: "#fff", info: "not a colour" } },
        tokens: { shared: { radius: "0.75rem", "made-up": "1" } },
        extra: true,
      }),
      "dark",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.scheme).toBe("light");
    expect(result.config.palette?.dark).toEqual({ primary: "#a78bfa" });
    expect(result.config.tokens?.shared).toEqual({ radius: "0.75rem" });
    expect(result.warnings.sort()).toEqual(["extra", "palette.dark.info", "palette.dark.nope", "tokens.shared.made-up"]);
  });

  it.each([
    ["not json", "json"],
    ["[1,2]", "shape"],
    ['{"v":2}', "version"],
    [`{"x":"${"a".repeat(70_000)}"}`, "size"],
  ])("rejects %s", (text, error) => {
    expect(parseThemeImport(text, "dark")).toEqual({ ok: false, error });
  });
});
