import type { HighlighterCore, LanguageRegistration, ThemeRegistration } from "shiki/core";
import { setCodeHighlighter, type CodeHighlighter, type HighlightToken } from "./highlighter";
import { syntaxColor, type SyntaxRole } from "./syntax-theme";

/**
 * Shiki setup for `CodeBlock`, switched on by the app with `registerShikiLanguages`:
 * - fine-grained core (`shiki/core`) + the JavaScript RegExp engine (no WASM download),
 * - one highlighter per page, created when the first registered language is rendered,
 * - only the grammars the app registered, each imported on demand (its own chunk),
 * - a CSS-variables theme whose colours come from the shared syntax palette.
 *
 * Nothing here touches `window` at import time; Shiki itself is only loaded via dynamic `import()`. Apps that never
 * call `registerShikiLanguages` don't reference this module, so their bundle contains no Shiki at all.
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
function getHighlighter(): Promise<HighlighterCore> {
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

/** A Shiki grammar module, e.g. `() => import("shiki/langs/lua.mjs")`. */
export type ShikiLanguageLoader = () => Promise<{ default: LanguageRegistration[] }>;

/** One entry of a language list, e.g. Shiki's `bundledLanguagesInfo`. */
export interface ShikiLanguageInfo {
  id: string;
  aliases?: readonly string[];
  import: ShikiLanguageLoader;
}

/**
 * The grammars `CodeBlock` may highlight: a map of language name → grammar import
 * (`{ lua: () => import("shiki/langs/lua.mjs") }`) or a list like Shiki's `bundledLanguagesInfo`.
 */
export type ShikiLanguages = Readonly<Record<string, ShikiLanguageLoader>> | readonly ShikiLanguageInfo[];

/** Language name or alias (lower-case) → grammar import. */
const languageLoaders = new Map<string, ShikiLanguageLoader>();
/** Grammar import → the loaded Shiki language id (shared by all names of one grammar). */
const loadedLanguages = new Map<ShikiLanguageLoader, Promise<string>>();
/** Language name or alias (lower-case) → Shiki id, once its grammar is loaded. */
const resolvedLanguages = new Map<string, string>();

const normalize = (language: string) => language.trim().toLowerCase();

function isRegistered(language: string): boolean {
  const name = normalize(language);
  return !PLAIN.has(name) && languageLoaders.has(name);
}

/** Loads the grammar for `name` once; resolves to its Shiki id (the main grammar is the module's last entry). */
function ensureLanguage(highlighter: HighlighterCore, name: string): Promise<string> {
  const load = languageLoaders.get(name);
  if (!load) return Promise.resolve("text");
  let loading = loadedLanguages.get(load);
  if (!loading) {
    loading = load().then(async ({ default: grammars }) => {
      await highlighter.loadLanguage(grammars);
      return grammars[grammars.length - 1]?.name ?? "text";
    });
    loadedLanguages.set(load, loading);
    loading.catch(() => loadedLanguages.delete(load));
  }
  return loading.then((id) => {
    resolvedLanguages.set(name, id);
    return id;
  });
}

function tokenize(highlighter: HighlighterCore, code: string, lang: string): HighlightToken[][] {
  return highlighter.codeToTokens(code, { lang, theme: THEME_NAME }).tokens;
}

const shikiHighlighter: CodeHighlighter = {
  has: isRegistered,
  async highlight(code, language) {
    const highlighter = await getHighlighter();
    let lang = "text";
    try {
      lang = await ensureLanguage(highlighter, normalize(language));
    } catch {
      lang = "text";
    }
    return tokenize(highlighter, code, lang);
  },
  highlightSync(code, language) {
    const highlighter = highlighterInstance;
    const lang = resolvedLanguages.get(normalize(language));
    if (!highlighter || !lang) return null;
    try {
      return tokenize(highlighter, code, lang);
    } catch {
      return null;
    }
  },
};

/**
 * Switches on syntax highlighting in `CodeBlock` (and `Markdown`'s code blocks) for the given languages. Call it
 * once at startup; later calls add languages. Shiki and each grammar load lazily when a block in that language is
 * first rendered, and only the registered grammars end up in your build. Languages that are not registered render as
 * plain code.
 *
 * ```ts
 * registerShikiLanguages({ lua: () => import("shiki/langs/lua.mjs"), ts: () => import("shiki/langs/typescript.mjs") });
 * // every Shiki language (about 10 MB of lazily loaded chunks in your build):
 * import { bundledLanguagesInfo } from "shiki/langs";
 * registerShikiLanguages(bundledLanguagesInfo);
 * ```
 */
export function registerShikiLanguages(languages: ShikiLanguages): void {
  const entries: ShikiLanguageInfo[] = Array.isArray(languages)
    ? (languages as readonly ShikiLanguageInfo[]).slice()
    : Object.keys(languages).map((id) => ({ id, import: (languages as Record<string, ShikiLanguageLoader>)[id]! }));
  for (const { id, aliases, import: load } of entries) {
    for (const name of [id, ...(aliases ?? [])]) {
      const key = normalize(name);
      if (PLAIN.has(key)) continue;
      if (languageLoaders.get(key) !== load) resolvedLanguages.delete(key);
      languageLoaders.set(key, load);
    }
  }
  setCodeHighlighter(shikiHighlighter);
}
