// Loads the font files a ThemeConfig names (`fonts`), so a font chosen in the ThemeEditor shows everywhere without
// being imported in code. Browser only (FontFace API, Chromium 35+); a no-op on the server.
import type { ThemeConfig, ThemeFontFile, ThemeFontSource } from "./theme-config";

const loaded = new Map<string, Promise<boolean>>();

/** `url("…")` list for the FontFace source; quotes and backslashes in the path are escaped. */
const toSrc = (urls: readonly string[]) =>
  urls.map((path) => `url("${path.replace(/["\\]/g, (char) => `\\${char}`)}")`).join(", ");

interface FontFaceSpec {
  src: string;
  weight: string;
  style: string;
}

const isFile = (entry: unknown): entry is ThemeFontFile =>
  typeof entry === "object" && entry !== null && typeof (entry as ThemeFontFile).url === "string";

/**
 * The `@font-face` descriptors one source needs: every `{ url, weight }` entry gets its own face (so each file
 * serves its own weight), while plain string sources share one face whose urls are a fallback chain.
 */
export function themeFontFaces(font: ThemeFontSource): FontFaceSpec[] {
  const entries: (string | ThemeFontFile)[] = Array.isArray(font.src) ? [...font.src] : [font.src];
  const weight = font.weight ?? "100 900";
  const style = font.style ?? "normal";
  const urls = entries.filter((entry): entry is string => typeof entry === "string" && entry !== "");
  const faces: FontFaceSpec[] = [];
  if (urls.length > 0) faces.push({ src: toSrc(urls), weight, style });
  for (const file of entries.filter(isFile)) {
    if (!file.url) continue;
    faces.push({ src: toSrc([file.url]), weight: file.weight ?? weight, style: file.style ?? style });
  }
  return faces;
}

function loadFace(family: string, spec: FontFaceSpec, doc: Document): Promise<boolean> {
  const key = `${family}|${spec.src}|${spec.weight}|${spec.style}`;
  const existing = loaded.get(key);
  if (existing) return existing;
  const face = new FontFace(family, spec.src, { weight: spec.weight, style: spec.style, display: "swap" });
  const promise = face.load().then(
    (ready) => {
      doc.fonts.add(ready);
      return true;
    },
    () => {
      loaded.delete(key); // allow a retry (e.g. after the resource that serves it started)
      return false;
    },
  );
  loaded.set(key, promise);
  return promise;
}

/**
 * Registers and loads one font family — one `@font-face` per `{ url, weight }` entry of `src`, so several files each
 * serve their own weight. Resolves `true` once the family can be used (at least one file loaded), `false` when every
 * file fails (the CSS fallback fonts in `--pui-font-sans` take over). Loading the same source twice is free.
 */
export function loadThemeFont(font: ThemeFontSource, doc: Document | undefined = typeof document === "undefined" ? undefined : document): Promise<boolean> {
  if (!doc?.fonts || typeof FontFace === "undefined" || !font.family || !font.src) return Promise.resolve(false);
  const faces = themeFontFaces(font);
  if (faces.length === 0) return Promise.resolve(false);
  return Promise.all(faces.map((spec) => loadFace(font.family, spec, doc))).then((results) => results.some(Boolean));
}

/** Loads every font a ThemeConfig names (`fonts.sans`, `fonts.mono`). Call it where you apply the theme. */
export function loadThemeFonts(config: Pick<ThemeConfig, "fonts"> | null | undefined): Promise<boolean[]> {
  const fonts = [config?.fonts?.sans, config?.fonts?.mono].filter((font): font is ThemeFontSource => Boolean(font));
  return Promise.all(fonts.map((font) => loadThemeFont(font)));
}
