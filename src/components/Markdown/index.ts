export { Markdown } from "./Markdown";
export type { MarkdownComponents, MarkdownProps } from "./Markdown";
// Switches on highlighting for Markdown's code blocks without importing the CodeMirror-based `code` entry.
export { registerShikiLanguages } from "../Code/shiki";
export type { ShikiLanguageInfo, ShikiLanguageLoader, ShikiLanguages } from "../Code/shiki";
