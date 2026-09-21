import type { BundledLanguageInfo, HighlighterCore, ThemedToken, ThemeRegistration } from "shiki/core";
import { syntaxColor, type SyntaxRole } from "./syntax-theme";

/**
 * Shiki setup for `CodeBlock`:
 * - fine-grained core (`shiki/core`) + the JavaScript RegExp engine (no WASM download),
 * - one highlighter per page, created on first use,
 * - languages are imported on demand from `shiki/langs` (each grammar is its own chunk),
 * - a CSS-variables theme whose colours come from the shared syntax palette.
 *
 * Nothing here touches `window` at import time; Shiki itself is only loaded via dynamic `import()`.
 */

const THEME_NAME = "preui";

/** Language ids that render as plain text without loading a grammar. */
const PLAIN = new Set(["", "text", "txt", "plain", "plaintext"]);

/** Shiki's css-variables names → our syntax roles. */
const SHIKI_VARIABLES: Record<string, SyntaxRole> = {
  foreground: "foreground",
  background: "foreground",
  "token-keyword": "keyword",
  "token-string": "string",
  "token-string-expression": "string",
  "token-constant": "constant",
  "token-function": "function",
  "token-parameter": "parameter",
  "token-punctuation": "punctuation",
  "token-comment": "comment",
  "token-link": "link",
  "token-inserted": "inserted",
  "token-deleted": "deleted",
  "token-changed": "changed",
};

/** Extra scopes on top of Shiki's css-variables theme (later rules win over equal selectors). */
const EXTRA_RULES: { scope: string[]; role: SyntaxRole; fontStyle?: string }[] = [
  { scope: ["comment", "punctuation.definition.comment", "string.quoted.docstring.multi"], role: "comment", fontStyle: "italic" },
  { scope: ["keyword.operator", "keyword.operator.assignment", "keyword.operator.arithmetic", "keyword.operator.logical", "keyword.operator.comparison", "keyword.operator.relational"], role: "operator" },
  { scope: ["keyword.operator.new", "keyword.operator.expression", "keyword.operator.typeof", "keyword.operator.instanceof", "keyword.operator.word", "keyword.operator.logical.lua", "keyword.operator.sql"], role: "keyword" },
  { scope: ["constant.numeric", "constant.language", "constant.character.escape.sequence"], role: "constant" },
  { scope: ["string.regexp", "constant.character.escape", "constant.other.character-class.regexp"], role: "regexp" },
  { scope: ["entity.name.type", "entity.name.class", "entity.name.namespace", "entity.other.inherited-class", "support.type", "support.class", "storage.type.primitive", "entity.name.type.module"], role: "type" },
  { scope: ["entity.name.function", "support.function", "meta.function-call entity.name.function", "variable.function"], role: "function" },
  { scope: ["variable.parameter", "variable.parameter.function"], role: "parameter" },
  { scope: ["support.type.property-name", "meta.object-literal.key", "variable.other.property", "variable.other.object.property", "meta.property-name", "entity.name.tag.yaml"], role: "property" },
  { scope: ["support.type.property-name.json", "support.type.property-name.css"], role: "property" },
  { scope: ["support.constant.property-value", "support.constant.color", "constant.other.color"], role: "constant" },
  { scope: ["variable", "variable.other.readwrite", "meta.definition.variable", "variable.other.constant"], role: "foreground" },
  { scope: ["entity.name.tag", "support.class.component"], role: "tag" },
  { scope: ["entity.other.attribute-name"], role: "attribute" },
  { scope: ["punctuation", "meta.brace", "punctuation.definition.tag", "meta.tag punctuation"], role: "punctuation" },
  { scope: ["punctuation.definition.string"], role: "string" },
  { scope: ["punctuation.definition.template-expression", "punctuation.section.embedded"], role: "keyword" },
  { scope: ["markup.heading", "entity.name.section"], role: "heading", fontStyle: "bold" },
  { scope: ["markup.underline.link", "string.other.link"], role: "link" },
  { scope: ["invalid", "invalid.illegal"], role: "invalid" },
];

let themePromise: Promise<ThemeRegistration> | null = null;

async function createTheme(): Promise<ThemeRegistration> {
  const { createCssVariablesTheme } = await import("shiki/core");
  const base = createCssVariablesTheme({ name: THEME_NAME, variablePrefix: "--shiki-", fontStyle: true });
  // Point Shiki's variables at the shared palette, so CodeBlock and CodeEditor colour code identically.
  const json = JSON.stringify(base).replace(/var\(--shiki-([\w-]+)\)/g, (_match, name: string) => {
    const role = SHIKI_VARIABLES[name];
    return role ? syntaxColor(role) : syntaxColor("foreground");
  });
  const theme = JSON.parse(json) as ThemeRegistration;
  theme.tokenColors = [
    ...(theme.tokenColors ?? []),
    ...EXTRA_RULES.map(({ scope, role, fontStyle }) => ({
      scope,
      settings: { foreground: syntaxColor(role), ...(fontStyle ? { fontStyle } : {}) },
    })),
  ];
  return theme;
}

let highlighterPromise: Promise<HighlighterCore> | null = null;
let highlighterInstance: HighlighterCore | null = null;

/** The shared Shiki highlighter (created once, on first call). */
export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    themePromise ??= createTheme();
    highlighterPromise = Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
      themePromise,
    ]).then(async ([{ createHighlighterCore }, { createJavaScriptRegexEngine }, theme]) => {
      const highlighter = await createHighlighterCore({
        themes: [theme],
        langs: [],
        // `forgiving` skips the rare Oniguruma patterns JS RegExp can't express instead of throwing.
        engine: createJavaScriptRegexEngine({ forgiving: true }),
      });
      highlighterInstance = highlighter;
      return highlighter;
    });
    highlighterPromise.catch(() => {
      highlighterPromise = null;
    });
  }
  return highlighterPromise;
}

let languageIndexPromise: Promise<Map<string, BundledLanguageInfo>> | null = null;

/** id and alias (lower-case) → language info, from Shiki's bundled language list (lazy grammar imports). */
function getLanguageIndex(): Promise<Map<string, BundledLanguageInfo>> {
  languageIndexPromise ??= import("shiki/langs").then(({ bundledLanguagesInfo }) => {
    const index = new Map<string, BundledLanguageInfo>();
    for (const info of bundledLanguagesInfo) {
      index.set(info.id.toLowerCase(), info);
      for (const alias of info.aliases ?? []) index.set(alias.toLowerCase(), info);
    }
    return index;
  });
  return languageIndexPromise;
}

const loadingLanguages = new Map<string, Promise<void>>();

/** Loads the grammar for `language` (id or alias). Resolves to the Shiki id, or `"text"` when unknown. */
async function ensureLanguage(highlighter: HighlighterCore, language: string): Promise<string> {
  const name = language.trim().toLowerCase();
  if (PLAIN.has(name)) return "text";
  const info = (await getLanguageIndex()).get(name);
  if (!info) return "text";
  if (!highlighter.getLoadedLanguages().includes(info.id)) {
    let loading = loadingLanguages.get(info.id);
    if (!loading) {
      loading = highlighter.loadLanguage(info.import);
      loadingLanguages.set(info.id, loading);
      loading.catch(() => loadingLanguages.delete(info.id));
    }
    await loading;
  }
  return info.id;
}

function tokenize(highlighter: HighlighterCore, code: string, lang: string): ThemedToken[][] {
  return highlighter.codeToTokens(code, { lang, theme: THEME_NAME }).tokens;
}

/** Highlights `code` asynchronously (loads Shiki and the grammar on demand). Unknown languages → plain text. */
export async function highlightCode(code: string, language: string): Promise<ThemedToken[][]> {
  const highlighter = await getHighlighter();
  let lang = "text";
  try {
    lang = await ensureLanguage(highlighter, language);
  } catch {
    lang = "text";
  }
  return tokenize(highlighter, code, lang);
}

/**
 * Synchronous fast path: returns tokens when the highlighter and the grammar are already loaded
 * (e.g. the second CodeBlock with the same language), otherwise `null`.
 */
export function highlightCodeSync(code: string, language: string): ThemedToken[][] | null {
  const highlighter = highlighterInstance;
  if (!highlighter) return null;
  const name = language.trim().toLowerCase();
  if (PLAIN.has(name)) return null;
  const loaded = highlighter.getLoadedLanguages();
  if (!loaded.includes(name)) return null;
  try {
    return tokenize(highlighter, code, name);
  } catch {
    return null;
  }
}
