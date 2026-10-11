import type { ThemedToken } from "shiki/core";

/**
 * The bridge between `CodeBlock` and a syntax highlighter.
 *
 * This module has no value import of Shiki on purpose: `CodeBlock` (and `Markdown`, which renders it) only reads
 * the highlighter that the app registered with `registerShikiLanguages`. An app that never registers one never
 * references `./shiki`, so bundlers drop it together with its dynamic Shiki imports — no Shiki file ends up
 * in the build.
 */

export type HighlightToken = Pick<ThemedToken, "content" | "color" | "fontStyle">;

export interface CodeHighlighter {
  /** `true` when a grammar is registered for `language` (id or alias). */
  has(language: string): boolean;
  /** Tokens when the highlighter and the grammar are already loaded, otherwise `null`. */
  highlightSync(code: string, language: string): HighlightToken[][] | null;
  /** Loads the highlighter and the grammar on demand and returns the tokens. */
  highlight(code: string, language: string): Promise<HighlightToken[][]>;
}

let current: CodeHighlighter | null = null;
let version = 0;
const listeners = new Set<() => void>();

/** Installs (or refreshes) the highlighter; mounted CodeBlocks re-render and pick up new languages. */
export function setCodeHighlighter(highlighter: CodeHighlighter | null): void {
  current = highlighter;
  version += 1;
  listeners.forEach((listener) => listener());
}

export function getCodeHighlighter(): CodeHighlighter | null {
  return current;
}

export function subscribeCodeHighlighter(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Changes whenever the highlighter or its languages change (`useSyncExternalStore` snapshot). */
export function getCodeHighlighterVersion(): number {
  return version;
}
