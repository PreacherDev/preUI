/**
 * Shared syntax colours for `CodeBlock` (Shiki) and `CodeEditor` (CodeMirror).
 *
 * The colours are design tokens `--pui-syntax-<role>`, defined by the Tailwind preset (`:root` plus
 * overrides scoped to your own themes, e.g. `[data-theme="brand"]`). Components only read `var(--pui-syntax-<role>)`,
 * so you retune a role globally in your token CSS, per theme, or for a subtree:
 *
 *   :root { --pui-syntax-keyword: hsl(var(--pui-warning)); }
 *   <div style={{ "--pui-syntax-keyword": "hsl(0 100% 50%)" }}>…</div>
 *
 * The values below mirror the preset defaults and serve only as `var()` fallback, for setups that disable
 * token injection and define just some of the syntax tokens themselves.
 */
export const syntaxPalette = {
  /** Plain text, identifiers, variables. */
  foreground: "hsl(var(--pui-foreground))",
  /** Brackets, commas, semicolons. */
  punctuation: "hsl(var(--pui-foreground) / 0.72)",
  /** Comments (rendered italic). */
  comment: "hsl(var(--pui-muted-foreground))",
  /** `const`, `if`, `return`, `local`, `function`, `SELECT` … */
  keyword: "hsl(var(--pui-primary))",
  /** `=`, `=>`, `+`, `&&` … */
  operator: "hsl(var(--pui-primary) / 0.85)",
  /** String literals. */
  string: "hsl(var(--pui-positive))",
  /** Regular expressions and escape sequences. */
  regexp: "hsl(var(--pui-quality-low))",
  /** Numbers, booleans, `null`, language constants. */
  constant: "hsl(var(--pui-warning))",
  /** Function and method names. */
  function: "hsl(var(--pui-info))",
  /** Types, classes, namespaces — a muted accent. */
  type: "hsl(var(--pui-quality-standard))",
  /** Function parameters. */
  parameter: "hsl(var(--pui-foreground))",
  /** Object keys, JSON keys, CSS properties. */
  property: "hsl(var(--pui-foreground))",
  /** HTML/JSX tag names. */
  tag: "hsl(var(--pui-negative))",
  /** HTML/JSX attribute names. */
  attribute: "hsl(var(--pui-warning))",
  /** Markdown headings (bold). */
  heading: "hsl(var(--pui-primary))",
  /** Links and URLs. */
  link: "hsl(var(--pui-info))",
  /** Diff: added / removed / changed. */
  inserted: "hsl(var(--pui-positive))",
  deleted: "hsl(var(--pui-negative))",
  changed: "hsl(var(--pui-warning))",
  /** Invalid / illegal syntax. */
  invalid: "hsl(var(--pui-negative))",
} as const;

export type SyntaxRole = keyof typeof syntaxPalette;

/** CSS colour for a syntax role: `var(--pui-syntax-<role>, <default colour>)`. */
export function syntaxColor(role: SyntaxRole): string {
  return `var(--pui-syntax-${role}, ${syntaxPalette[role]})`;
}
