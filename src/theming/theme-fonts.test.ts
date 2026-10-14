import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadThemeFont, loadThemeFonts, themeFontFaces } from "./theme-fonts";

describe("themeFontFaces", () => {
  it("keeps one face for a single file or a string list (a fallback chain)", () => {
    expect(themeFontFaces({ family: "A", src: "a.woff2" })).toEqual([
      { src: 'url("a.woff2")', weight: "100 900", style: "normal" },
    ]);
    expect(themeFontFaces({ family: "A", src: ["a.woff2", "b.woff2"], weight: "400 700", style: "italic" })).toEqual([
      { src: 'url("a.woff2"), url("b.woff2")', weight: "400 700", style: "italic" },
    ]);
  });

  it("gives every { url, weight } entry its own face", () => {
    expect(
      themeFontFaces({
        family: "Poppins",
        src: [
          { url: "p-400.woff2", weight: "400" },
          { url: "p-700.woff2", weight: "700" },
          { url: "p-italic.woff2", weight: "400", style: "italic" },
        ],
      }),
    ).toEqual([
      { src: 'url("p-400.woff2")', weight: "400", style: "normal" },
      { src: 'url("p-700.woff2")', weight: "700", style: "normal" },
      { src: 'url("p-italic.woff2")', weight: "400", style: "italic" },
    ]);
  });

  it("falls back to the family's weight and escapes quotes in a url", () => {
    expect(themeFontFaces({ family: "A", src: [{ url: 'a".woff2' }], weight: "300" })).toEqual([
      { src: 'url("a\\".woff2")', weight: "300", style: "normal" },
    ]);
  });
});

interface FakeFace {
  family: string;
  source: string;
  weight?: string;
  style?: string;
}

const created: FakeFace[] = [];
const added: FakeFace[] = [];

class FakeFontFace {
  constructor(
    public family: string,
    public source: string,
    public descriptors: { weight?: string; style?: string } = {},
  ) {
    created.push({ family, source, ...descriptors });
  }
  load() {
    return this.source.includes("missing")
      ? Promise.reject(new Error("404"))
      : Promise.resolve(this as unknown as FakeFace);
  }
}

describe("loadThemeFont", () => {
  let doc: Document;

  beforeEach(() => {
    created.length = 0;
    added.length = 0;
    vi.stubGlobal("FontFace", FakeFontFace);
    doc = { fonts: { add: (face: FakeFace) => added.push(face) } } as unknown as Document;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("registers one FontFace per weight and resolves true", async () => {
    await expect(
      loadThemeFont(
        {
          family: "FaceTest1",
          src: [
            { url: "a-400.woff2", weight: "400" },
            { url: "a-700.woff2", weight: "700" },
          ],
        },
        doc,
      ),
    ).resolves.toBe(true);
    expect(created.map((face) => [face.source, face.weight])).toEqual([
      ['url("a-400.woff2")', "400"],
      ['url("a-700.woff2")', "700"],
    ]);
    expect(added).toHaveLength(2);
  });

  it("caches per face and resolves true when at least one file loads", async () => {
    await expect(loadThemeFont({ family: "FaceTest2", src: "b.woff2" }, doc)).resolves.toBe(true);
    await expect(loadThemeFont({ family: "FaceTest2", src: "b.woff2" }, doc)).resolves.toBe(true);
    expect(created).toHaveLength(1);
    await expect(
      loadThemeFont({ family: "FaceTest3", src: [{ url: "c.woff2" }, { url: "missing.woff2" }] }, doc),
    ).resolves.toBe(true);
    await expect(loadThemeFont({ family: "FaceTest4", src: "missing.woff2" }, doc)).resolves.toBe(false);
  });

  it("is a no-op without a family, a file or a document", async () => {
    await expect(loadThemeFont({ family: "", src: "x.woff2" }, doc)).resolves.toBe(false);
    await expect(loadThemeFont({ family: "X", src: [] }, doc)).resolves.toBe(false);
    await expect(loadThemeFont({ family: "X", src: "x.woff2" }, undefined)).resolves.toBe(false);
    expect(created).toHaveLength(0);
  });

  it("loadThemeFonts loads the sans and mono font of a config", async () => {
    await expect(
      loadThemeFonts({ fonts: { sans: { family: "FaceTest5", src: "s.woff2" }, mono: { family: "FaceTest6", src: "m.woff2" } } }),
    ).resolves.toEqual([false, false]); // no document in this environment
    expect(await loadThemeFonts(null)).toEqual([]);
  });
});
