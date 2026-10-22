import type { ThemeConfig } from "./theme-config";

/** Start of every theme code (version 1 of the theme protocol). */
export const THEME_CODE_PREFIX = "PUI1.";

/** Fields a code carries, in this order; everything else of the config is left out. */
const CODE_FIELDS = ["v", "scheme", "theme", "palette", "tokens", "fonts"] as const;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let index = 0; index < bytes.length; index++) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): string | null {
  try {
    const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * A theme as one line of text to pass on (chat, Discord, a forum post): `PUI1.` plus the config as base64url JSON.
 * Paste it into the `ThemeEditor`'s share or import field, or read it with `decodeThemeCode`. Contains only the theme
 * fields (`v`, `scheme`, `theme`, `palette`, `tokens`, `fonts`) — no ids or names.
 */
export function encodeThemeCode(config: ThemeConfig): string {
  const source = config as Record<string, unknown>;
  const picked: Record<string, unknown> = { v: 1 };
  for (const field of CODE_FIELDS) if (field !== "v" && source[field] !== undefined) picked[field] = source[field];
  return THEME_CODE_PREFIX + toBase64Url(JSON.stringify(picked));
}

/** Whether `text` looks like a theme code (starts with `PUI1.`, surrounding whitespace ignored). */
export const isThemeCode = (text: string) => text.trim().startsWith(THEME_CODE_PREFIX);

/**
 * The JSON text inside a theme code, or `null` when it isn't one (wrong prefix, broken base64, not UTF-8). The JSON is
 * not checked here — `ThemeEditor` passes it through the same checks as a pasted JSON theme.
 */
export function decodeThemeCode(code: string): string | null {
  const trimmed = code.replace(/\s+/g, "");
  if (!trimmed.startsWith(THEME_CODE_PREFIX)) return null;
  const body = trimmed.slice(THEME_CODE_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(body)) return null;
  return fromBase64Url(body);
}
