// Loads the font files a ThemeConfig names (`fonts`), so a font chosen in the ThemeEditor shows everywhere without
// being imported in code. Browser only (FontFace API, Chromium 35+); a no-op on the server.
import type { ThemeConfig, ThemeFontSource } from "./theme-config";

const loaded = new Map<string, Promise<boolean>>();

const keyOf = (font: ThemeFontSource) => `${font.family}|${([] as string[]).concat(font.src).join(",")}|${font.weight ?? ""}|${font.style ?? ""}`;

/** `url("…")` list for the FontFace source; quotes and backslashes in the path are escaped. */
const toSrc = (src: string | string[]) =>
  ([] as string[])
    .concat(src)
    .map((path) => `url("${path.replace(/["\\]/g, (char) => `\\${char}`)}")`)
    .join(", ");

/**
 * Registers and loads one font family. Resolves `true` once it can be used, `false` when the file fails (the CSS
 * fallback fonts in `--pui-font-sans` take over). Loading the same source twice is free.
 */
export function loadThemeFont(font: ThemeFontSource, doc: Document | undefined = typeof document === "undefined" ? undefined : document): Promise<boolean> {
  if (!doc?.fonts || typeof FontFace === "undefined" || !font.family || !font.src) return Promise.resolve(false);
  const key = keyOf(font);
  const existing = loaded.get(key);
  if (existing) return existing;
  const face = new FontFace(font.family, toSrc(font.src), {
    weight: font.weight ?? "100 900",
    style: font.style ?? "normal",
    display: "swap",
  });
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

/** Loads every font a ThemeConfig names (`fonts.sans`, `fonts.mono`). Call it where you apply the theme. */
export function loadThemeFonts(config: Pick<ThemeConfig, "fonts"> | null | undefined): Promise<boolean[]> {
  const fonts = [config?.fonts?.sans, config?.fonts?.mono].filter((font): font is ThemeFontSource => Boolean(font));
  return Promise.all(fonts.map((font) => loadThemeFont(font)));
}
