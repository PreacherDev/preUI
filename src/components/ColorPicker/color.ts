/**
 * Small, pure colour helpers used by `ColorPicker` (and exported for apps).
 *
 * Ranges: `r`/`g`/`b` 0–255, `h` 0–360, `s`/`v`/`l` 0–100, `a` (alpha) 0–1.
 * Hex strings are `#rrggbb` or `#rrggbbaa` (lower case) on output; on input `#rgb`, `#rgba`, `#rrggbb` and
 * `#rrggbbaa` are accepted, with or without `#`.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

export interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const HEX_RE = /^#?([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

function parseHex(input: string): Rgba | null {
  const match = HEX_RE.exec(input.trim());
  if (!match) return null;
  let raw = match[1];
  if (raw.length <= 4) raw = raw.replace(/./g, (c) => c + c);
  const int = (i: number) => parseInt(raw.slice(i, i + 2), 16);
  return { r: int(0), g: int(2), b: int(4), a: raw.length === 8 ? Math.round((int(6) / 255) * 1000) / 1000 : 1 };
}

/** A number or percentage; `scale` is what 100 % maps to. */
function parseComponent(token: string, scale: number): number | null {
  const percent = token.endsWith("%");
  const number = Number(percent ? token.slice(0, -1) : token);
  if (token === "" || Number.isNaN(number)) return null;
  return percent ? (number / 100) * scale : number;
}

function parseFunction(input: string): Rgba | null {
  const match = /^(rgba?|hsla?)\(\s*([^)]*)\)$/i.exec(input.trim());
  if (!match) return null;
  const kind = match[1].toLowerCase().startsWith("rgb") ? "rgb" : "hsl";
  // Both syntaxes: "r, g, b[, a]" and "r g b[ / a]".
  const parts = match[2]
    .replace(/\s*\/\s*/, " / ")
    .split(/\s*,\s*|\s+/)
    .filter((part) => part !== "" && part !== "/");
  if (parts.length !== 3 && parts.length !== 4) return null;
  const alpha = parts.length === 4 ? parseComponent(parts[3], 1) : 1;
  if (alpha === null) return null;
  const a = clamp(alpha, 0, 1);

  if (kind === "rgb") {
    const [r, g, b] = parts.slice(0, 3).map((part) => parseComponent(part, 255));
    if (r === null || g === null || b === null) return null;
    return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255), a };
  }
  const h = Number(parts[0].replace(/deg$/i, ""));
  const s = parseComponent(parts[1].endsWith("%") ? parts[1] : `${parts[1]}%`, 100);
  const l = parseComponent(parts[2].endsWith("%") ? parts[2] : `${parts[2]}%`, 100);
  if (Number.isNaN(h) || s === null || l === null) return null;
  return { ...hslToRgb({ h, s: clamp(s, 0, 100), l: clamp(l, 0, 100) }), a };
}

/**
 * Parses `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` (the `#` is optional), `rgb()`/`rgba()` and `hsl()`/`hsla()`
 * (comma or space syntax). Returns `null` for anything else. Channels from `rgb()`/`hsl()` are not rounded, so
 * `hexToHsv("hsl(200 50% 50%)")` is exact (`rgbToHex` rounds when formatting).
 */
export function parseColor(input: string): Rgba | null {
  return parseHex(input) ?? parseFunction(input);
}

const toHexByte = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");

/** `#rrggbb`, or `#rrggbbaa` when `withAlpha` is set. */
export function rgbToHex({ r, g, b, a = 1 }: Omit<Rgba, "a"> & { a?: number }, withAlpha = false): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}${withAlpha ? toHexByte(clamp(a, 0, 1) * 255) : ""}`;
}

/** Normalises any colour `parseColor` understands to `#rrggbb` (or `#rrggbbaa`); `null` when invalid. */
export function normalizeHex(input: string, withAlpha = false): string | null {
  const rgba = parseColor(input);
  return rgba ? rgbToHex(rgba, withAlpha) : null;
}

function rgbToHsv({ r, g, b }: Omit<Rgba, "a">): Omit<Hsva, "a"> {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const delta = max - Math.min(rn, gn, bn);
  let h = 0;
  if (delta > 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

function hsvToRgb({ h, s, v }: Omit<Hsva, "a">): Omit<Rgba, "a"> {
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const hn = (((h % 360) + 360) % 360) / 60;
  const channel = (n: number) => {
    const k = (n + hn) % 6;
    return (vn - vn * sn * Math.max(0, Math.min(k, 4 - k, 1))) * 255;
  };
  return { r: channel(5), g: channel(3), b: channel(1) };
}

function hslToRgb({ h, s, l }: Omit<Hsla, "a">): Omit<Rgba, "a"> {
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const hn = ((h % 360) + 360) % 360;
  const a = sn * Math.min(ln, 1 - ln);
  const channel = (n: number) => {
    const k = (n + hn / 30) % 12;
    return (ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255;
  };
  return { r: channel(0), g: channel(8), b: channel(4) };
}

/** HSV (saturation × value) → HSL, both with `s`/`v`/`l` in 0–100. */
export function hsvToHsl({ h, s, v, a = 1 }: Omit<Hsva, "a"> & { a?: number }): Hsla {
  const sn = s / 100;
  const vn = v / 100;
  const l = vn * (1 - sn / 2);
  const sl = l === 0 || l === 1 ? 0 : (vn - l) / Math.min(l, 1 - l);
  return { h, s: sl * 100, l: l * 100, a };
}

/** HSL → HSV, both with `s`/`l`/`v` in 0–100. */
export function hslToHsv({ h, s, l, a = 1 }: Omit<Hsla, "a"> & { a?: number }): Hsva {
  const sn = s / 100;
  const ln = l / 100;
  const v = ln + sn * Math.min(ln, 1 - ln);
  return { h, s: v === 0 ? 0 : 2 * (1 - ln / v) * 100, v: v * 100, a };
}

/** Hex (or any `parseColor` input) → HSV. Achromatic colours get `h: 0`; `null` when invalid. */
export function hexToHsv(hex: string): Hsva | null {
  const rgba = parseColor(hex);
  return rgba ? { ...rgbToHsv(rgba), a: rgba.a } : null;
}

/** HSV → `#rrggbb` (or `#rrggbbaa` with `withAlpha`). */
export function hsvToHex(hsv: Omit<Hsva, "a"> & { a?: number }, withAlpha = false): string {
  return rgbToHex({ ...hsvToRgb(hsv), a: hsv.a ?? 1 }, withAlpha);
}

/** Hex (or any `parseColor` input) → HSL. Achromatic colours get `h: 0`; `null` when invalid. */
export function hexToHsl(hex: string): Hsla | null {
  const hsv = hexToHsv(hex);
  return hsv ? hsvToHsl(hsv) : null;
}

/** HSL → `#rrggbb` (or `#rrggbbaa` with `withAlpha`). */
export function hslToHex(hsl: Omit<Hsla, "a"> & { a?: number }, withAlpha = false): string {
  return rgbToHex({ ...hslToRgb(hsl), a: hsl.a ?? 1 }, withAlpha);
}
