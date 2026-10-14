import { describe, expect, it } from "vitest";
import { tokens } from "../../tailwind/tokens";
import {
  defaultThemeEditorFonts,
  firstFontFamily,
  resolveThemeEditorFonts,
  themeEditorFontSource,
  type ThemeEditorFont,
} from "./theme-editor-fonts";

describe("default font list", () => {
  it("ships the curated families with unique labels and values, and no font file", () => {
    expect(defaultThemeEditorFonts).toHaveLength(20);
    const labels = defaultThemeEditorFonts.map((font) => font.label);
    const values = defaultThemeEditorFonts.map((font) => font.value);
    expect(new Set(labels).size).toBe(labels.length);
    expect(new Set(values).size).toBe(values.length);
    // The two families preUI's own tokens use need no file, every other entry carries file names only.
    const bundled = defaultThemeEditorFonts.filter((font) => !font.files);
    expect(bundled.map((font) => font.label)).toEqual(["Inter", "JetBrains Mono"]);
    expect(bundled.map((font) => font.value)).toEqual([
      (tokens as Record<string, string>)["--pui-font-sans"],
      (tokens as Record<string, string>)["--pui-font-mono"],
    ]);
    for (const font of defaultThemeEditorFonts) {
      expect(font.src).toBeUndefined();
      for (const file of font.files ?? []) {
        expect(file.file).toMatch(/^[a-z0-9-]+\.woff2$/);
        expect(file.weight).toMatch(/^\d{3}( \d{3,4})?$/);
      }
    }
  });

  it("the family a file registers as is the label", () => {
    for (const font of defaultThemeEditorFonts) {
      expect(font.family ?? firstFontFamily(font.value)).toBe(font.label);
    }
  });
});

const poppins: ThemeEditorFont = {
  label: "Poppins",
  value: '"Poppins", system-ui, sans-serif',
  files: [
    { file: "poppins-400.woff2", weight: "400" },
    { file: "poppins-700.woff2", weight: "700" },
  ],
};

describe("themeEditorFontSource", () => {
  it("resolves file names against the base URL, one entry per weight", () => {
    expect(themeEditorFontSource(poppins, "https://cfx-nui-pre_lib/theme/fonts/")).toEqual({
      family: "Poppins",
      src: [
        { url: "https://cfx-nui-pre_lib/theme/fonts/poppins-400.woff2", weight: "400" },
        { url: "https://cfx-nui-pre_lib/theme/fonts/poppins-700.woff2", weight: "700" },
      ],
    });
  });

  it("adds the missing slash and keeps absolute file names", () => {
    expect(themeEditorFontSource({ ...poppins, files: [{ file: "a.woff2" }] }, "/fonts")?.src).toEqual([
      { url: "/fonts/a.woff2" },
    ]);
    expect(
      themeEditorFontSource({ ...poppins, files: [{ file: "https://cdn.example/a.woff2" }] }, "/fonts/")?.src,
    ).toEqual([{ url: "https://cdn.example/a.woff2" }]);
  });

  it("degrades to no source without a base URL, and keeps a ready `src`", () => {
    expect(themeEditorFontSource(poppins)).toBeUndefined();
    expect(themeEditorFontSource({ label: "Inter", value: '"Inter", sans-serif' })).toBeUndefined();
    expect(themeEditorFontSource({ label: "R", value: '"Rajdhani", sans-serif', src: "r.woff2", weight: "400 700" })).toEqual({
      family: "Rajdhani",
      src: "r.woff2",
      weight: "400 700",
    });
  });
});

describe("resolveThemeEditorFonts", () => {
  it("fills in `src` from the base URL and leaves the list alone without one", () => {
    expect(resolveThemeEditorFonts([poppins])).toEqual([poppins]);
    const resolved = resolveThemeEditorFonts(defaultThemeEditorFonts, "https://cfx-nui-pre_lib/theme/fonts/");
    expect(resolved).toHaveLength(defaultThemeEditorFonts.length);
    const roboto = resolved.find((font) => font.label === "Roboto");
    expect(roboto?.src).toEqual([{ url: "https://cfx-nui-pre_lib/theme/fonts/roboto.woff2", weight: "100 900" }]);
    // Bundled families stay file-less.
    expect(resolved.find((font) => font.label === "Inter")?.src).toBeUndefined();
  });
});
