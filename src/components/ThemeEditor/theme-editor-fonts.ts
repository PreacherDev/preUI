// The font choices of the ThemeEditor: the curated list preUI ships and the mapping onto a base URL.
// No font files are bundled — an entry carries the family, the label and the file *names* with their weights; the
// app says where its files are (`fontSrcBase` / `resolveThemeEditorFonts`). Without a base URL an entry degrades to
// just its `font-family` value (for an app that loads the families some other way).
import { tokens } from "../../tailwind/tokens";
import type { ThemeFontFile, ThemeFontSource } from "../../theming/theme-config";

/** One file of a font choice: the file **name** (resolved against the base URL) and the weight it serves. */
export interface ThemeEditorFontFile {
  /** File name or path relative to the base URL, e.g. `"poppins-700.woff2"`. An absolute URL is used as it is. */
  file: string;
  /** `font-weight` this file serves, e.g. `"700"`, or a range for a variable file (`"100 900"`). */
  weight?: string;
  /** @default "normal" */
  style?: string;
}

export interface ThemeEditorFont {
  label: string;
  /** A `font-family` value, e.g. `'"Rajdhani", system-ui, sans-serif'`. */
  value: string;
  /**
   * Ready-made font file source(s): a `.woff2` path or URL (e.g. `"https://cfx-nui-my_lib/fonts/rajdhani.woff2"`), or
   * `{ url, weight }` entries for one file per weight. Use `files` instead when the app supplies the base URL.
   */
  src?: ThemeFontSource["src"];
  /**
   * File **names** with their weights, resolved against the editor's `fontSrcBase` (or
   * `resolveThemeEditorFonts(fonts, srcBase)`). Without a base URL the entry is offered as a plain `font-family`
   * value and no file is loaded.
   */
  files?: readonly ThemeEditorFontFile[];
  /** Family name the file registers as. @default the first family of `value` */
  family?: string;
  /** `font-weight` range of the file, e.g. `"400 700"` for a variable font. */
  weight?: string;
}

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** `srcBase` + `file`, unless the file is already absolute (`https:`, `//…`, `data:`). */
function joinSrc(srcBase: string, file: string): string {
  if (ABSOLUTE.test(file) || file.startsWith("/")) return file;
  return `${srcBase.replace(/\/+$/, "")}/${file.replace(/^\/+/, "")}`;
}

/**
 * The `ThemeFontSource` a font choice loads with (for `loadThemeFont` and the theme's `fonts.sans`), or `undefined`
 * when the choice has no files — or has only `files` and no `srcBase` was given.
 */
export function themeEditorFontSource(font: ThemeEditorFont, srcBase?: string): ThemeFontSource | undefined {
  const family = font.family ?? firstFontFamily(font.value);
  const fromFiles: ThemeFontFile[] =
    srcBase && font.files?.length
      ? font.files.map((entry) => ({
          url: joinSrc(srcBase, entry.file),
          ...(entry.weight ? { weight: entry.weight } : {}),
          ...(entry.style ? { style: entry.style } : {}),
        }))
      : [];
  const src: ThemeFontSource["src"] | undefined = font.src ?? (fromFiles.length > 0 ? fromFiles : undefined);
  if (!src || (Array.isArray(src) && src.length === 0)) return undefined;
  return { family, src, ...(font.weight ? { weight: font.weight } : {}) };
}

/**
 * The font choices with their `files` resolved against `srcBase` (`"https://cfx-nui-pre_lib/theme/fonts/"`,
 * `"/fonts/"` …), so every entry carries a ready `src`. Without a `srcBase`, entries that only have `files` keep
 * their `font-family` value and load no file. Pass the result to `ThemeEditor`'s `fonts` — or just give the editor
 * `fontSrcBase`, which does this for you.
 */
export function resolveThemeEditorFonts(
  fonts: readonly ThemeEditorFont[],
  srcBase?: string,
): readonly ThemeEditorFont[] {
  if (!srcBase) return fonts;
  return fonts.map((font) => {
    if (font.src || !font.files?.length) return font;
    const source = themeEditorFontSource(font, srcBase);
    return source ? { ...font, src: source.src } : font;
  });
}

/** The first family of a `font-family` value (`'"Rajdhani", system-ui'` → `Rajdhani`). */
export function firstFontFamily(value: string): string {
  return (value.split(",")[0] ?? value).trim().replace(/^["']|["']$/g, "");
}

/**
 * The font choices the ThemeEditor offers by default: the two families preUI's own tokens use (Inter — the
 * `fontDefault` option — and JetBrains Mono) plus 18 widely used families, each with the `.woff2` file names and
 * weights of the matching self-hosted set.
 *
 * **No font file ships with preUI.** Give the editor a `fontSrcBase` (the folder your `.woff2` files live in, e.g.
 * `"https://cfx-nui-pre_lib/theme/fonts/"`) to load them; without one every entry is still offered as a plain
 * `font-family` value, which works when the fonts are installed on the system or loaded elsewhere (`@fontsource/*`,
 * your own `@font-face`). The file names follow Google Fonts' family names:
 * `<family-slug>.woff2` for a variable file, `<family-slug>-<weight>.woff2` per static weight.
 */
export const defaultThemeEditorFonts: readonly ThemeEditorFont[] = [
  // Bundled with preUI's own token defaults — no file needed.
  { label: "Inter", value: (tokens as Record<string, string>)["--pui-font-sans"], family: "Inter" },
  { label: "JetBrains Mono", value: (tokens as Record<string, string>)["--pui-font-mono"], family: "JetBrains Mono" },
  // Variable files: one file covers the whole weight range.
  { label: "Roboto", value: '"Roboto", system-ui, sans-serif', files: [{ file: "roboto.woff2", weight: "100 900" }] },
  { label: "Rubik", value: '"Rubik", system-ui, sans-serif', files: [{ file: "rubik.woff2", weight: "300 900" }] },
  {
    label: "Poppins",
    value: '"Poppins", system-ui, sans-serif',
    files: [
      { file: "poppins-400.woff2", weight: "400" },
      { file: "poppins-500.woff2", weight: "500" },
      { file: "poppins-600.woff2", weight: "600" },
      { file: "poppins-700.woff2", weight: "700" },
    ],
  },
  { label: "Nunito Sans", value: '"Nunito Sans", system-ui, sans-serif', files: [{ file: "nunito-sans.woff2", weight: "200 1000" }] },
  {
    label: "Barlow",
    value: '"Barlow", system-ui, sans-serif',
    files: [
      { file: "barlow-400.woff2", weight: "400" },
      { file: "barlow-500.woff2", weight: "500" },
      { file: "barlow-600.woff2", weight: "600" },
      { file: "barlow-700.woff2", weight: "700" },
    ],
  },
  { label: "Manrope", value: '"Manrope", system-ui, sans-serif', files: [{ file: "manrope.woff2", weight: "200 800" }] },
  { label: "Sora", value: '"Sora", system-ui, sans-serif', files: [{ file: "sora.woff2", weight: "100 800" }] },
  { label: "Outfit", value: '"Outfit", system-ui, sans-serif', files: [{ file: "outfit.woff2", weight: "100 900" }] },
  { label: "Space Grotesk", value: '"Space Grotesk", system-ui, sans-serif', files: [{ file: "space-grotesk.woff2", weight: "300 700" }] },
  { label: "IBM Plex Sans", value: '"IBM Plex Sans", system-ui, sans-serif', files: [{ file: "ibm-plex-sans.woff2", weight: "100 700" }] },
  {
    label: "Titillium Web",
    value: '"Titillium Web", system-ui, sans-serif',
    files: [
      { file: "titillium-web-400.woff2", weight: "400" },
      { file: "titillium-web-600.woff2", weight: "600" },
      { file: "titillium-web-700.woff2", weight: "700" },
    ],
  },
  { label: "Saira", value: '"Saira", system-ui, sans-serif', files: [{ file: "saira.woff2", weight: "100 900" }] },
  { label: "Exo 2", value: '"Exo 2", system-ui, sans-serif', files: [{ file: "exo-2.woff2", weight: "100 900" }] },
  {
    label: "Chakra Petch",
    value: '"Chakra Petch", system-ui, sans-serif',
    files: [
      { file: "chakra-petch-400.woff2", weight: "400" },
      { file: "chakra-petch-500.woff2", weight: "500" },
      { file: "chakra-petch-600.woff2", weight: "600" },
      { file: "chakra-petch-700.woff2", weight: "700" },
    ],
  },
  { label: "Oxanium", value: '"Oxanium", system-ui, sans-serif', files: [{ file: "oxanium.woff2", weight: "200 800" }] },
  { label: "Orbitron", value: '"Orbitron", system-ui, sans-serif', files: [{ file: "orbitron.woff2", weight: "400 900" }] },
  { label: "Fira Code", value: '"Fira Code", ui-monospace, monospace', files: [{ file: "fira-code.woff2", weight: "300 700" }] },
  {
    label: "Space Mono",
    value: '"Space Mono", ui-monospace, monospace',
    files: [
      { file: "space-mono-400.woff2", weight: "400" },
      { file: "space-mono-700.woff2", weight: "700" },
    ],
  },
];
