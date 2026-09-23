// Setting tokens at runtime (theme editors, NUI messages): one <style> element with the override blocks.
import { renderTokenOverrides, warnTokenIssues, type TokenOverrides } from "./token-css";

export interface ApplyTokensOptions {
  /** id of the `<style>` element; each id is one set of overrides (reused, never duplicated). @default "preui-runtime-tokens" */
  id?: string;
  /** Document to write into (e.g. an iframe's). @default document */
  target?: Document;
}

export const DEFAULT_RUNTIME_TOKENS_ID = "preui-runtime-tokens";

/**
 * Sets tokens at runtime: `shared` for both schemes, `dark` / `light` per scheme. Colours may be hex, `rgb()`,
 * `hsl()` or HSL channels and are stored as channels, so opacity classes (`bg-pui-primary/20`) keep working; other
 * values (radius, fonts, durations) are used as given. Unknown tokens and invalid colours are dropped (with a
 * `console.warn` in development).
 *
 * Writes one `<style id="preui-runtime-tokens">` into `<head>` (reused on every call, only rewritten when the CSS
 * changes — cheap enough for a slider at 60 fps). Its selectors outrank the preset and `[data-theme]` rules, but
 * only for the tokens given; everything else still comes from the theme and scheme. Each call replaces the previous
 * overrides of the same `id`.
 *
 * Returns a cleanup that removes the element again (unless a later call has changed it since). No-op on the server.
 */
export function applyTokens(input: TokenOverrides, options: ApplyTokensOptions = {}): () => void {
  const doc = options.target ?? (typeof document === "undefined" ? undefined : document);
  if (!doc) return () => {};
  const id = options.id ?? DEFAULT_RUNTIME_TOKENS_ID;
  const { css, issues } = renderTokenOverrides(input ?? {});
  warnTokenIssues("applyTokens", issues);

  let element = doc.getElementById(id) as HTMLStyleElement | null;
  if (!element) {
    element = doc.createElement("style");
    element.id = id;
    element.setAttribute("data-preui-runtime-tokens", "");
    (doc.head ?? doc.documentElement).appendChild(element);
  }
  // Rewriting identical text would still trigger a style recalculation.
  if (element.textContent !== css) element.textContent = css;

  const written = element;
  return () => {
    if (written.textContent === css) written.remove();
  };
}

/** Removes the runtime overrides of `id` (default `"preui-runtime-tokens"`). */
export function clearTokens(options: ApplyTokensOptions = {}): void {
  const doc = options.target ?? (typeof document === "undefined" ? undefined : document);
  doc?.getElementById(options.id ?? DEFAULT_RUNTIME_TOKENS_ID)?.remove();
}
