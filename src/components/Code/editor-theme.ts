import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { syntaxColor } from "./syntax-theme";

const token = (name: string, alpha?: number) =>
  alpha == null ? `hsl(var(--pui-${name}))` : `hsl(var(--pui-${name}) / ${alpha})`;

/** CodeMirror highlighting from the shared syntax palette — the same colours as `CodeBlock`. */
export const preuiHighlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.definitionKeyword, t.operatorKeyword, t.modifier, t.self], color: syntaxColor("keyword") },
  { tag: [t.operator, t.arithmeticOperator, t.logicOperator, t.bitwiseOperator, t.compareOperator, t.updateOperator, t.definitionOperator, t.typeOperator, t.controlOperator], color: syntaxColor("operator") },
  { tag: [t.string, t.special(t.string), t.character, t.docString, t.attributeValue], color: syntaxColor("string") },
  { tag: [t.regexp, t.escape, t.special(t.regexp)], color: syntaxColor("regexp") },
  { tag: [t.number, t.integer, t.float, t.bool, t.null, t.atom, t.unit, t.constant(t.name), t.standard(t.name), t.color], color: syntaxColor("constant") },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.function(t.definition(t.variableName)), t.macroName, t.annotation], color: syntaxColor("function") },
  { tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName), t.standard(t.typeName)], color: syntaxColor("type") },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: syntaxColor("comment"), fontStyle: "italic" },
  { tag: [t.propertyName, t.definition(t.propertyName)], color: syntaxColor("property") },
  { tag: [t.variableName, t.definition(t.variableName), t.labelName, t.name], color: syntaxColor("foreground") },
  { tag: [t.local(t.variableName)], color: syntaxColor("parameter") },
  { tag: [t.tagName, t.special(t.tagName)], color: syntaxColor("tag") },
  { tag: [t.attributeName], color: syntaxColor("attribute") },
  { tag: [t.punctuation, t.separator, t.bracket, t.angleBracket, t.squareBracket, t.paren, t.brace, t.derefOperator], color: syntaxColor("punctuation") },
  { tag: [t.heading, t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], color: syntaxColor("heading"), fontWeight: "600" },
  { tag: [t.link, t.url], color: syntaxColor("link"), textDecoration: "underline" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "600" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: [t.quote, t.monospace], color: syntaxColor("string") },
  { tag: [t.meta, t.processingInstruction, t.documentMeta], color: syntaxColor("comment") },
  { tag: t.inserted, color: syntaxColor("inserted") },
  { tag: t.deleted, color: syntaxColor("deleted") },
  { tag: t.changed, color: syntaxColor("changed") },
  { tag: t.invalid, color: syntaxColor("invalid") },
]);

/** Motion, radii and ring width come from the preUI tokens, so a custom token set restyles the editor chrome too. */
const motion = "var(--pui-duration-fast) var(--pui-ease)";
const radiusMd = "calc(var(--pui-radius) - 2px)"; // rounded-pui-md
const radiusSm = "calc(var(--pui-radius) - 4px)"; // rounded-pui-sm
const radiusXs = "calc(var(--pui-radius) - 6px)"; // 2px bracket/search-match outlines (clamps to 0)

const field = {
  height: "28px",
  padding: "0 8px",
  margin: "0",
  border: `1px solid ${token("input")}`,
  borderRadius: radiusMd,
  backgroundColor: token("background"),
  color: token("foreground"),
  fontFamily: "var(--pui-font-sans)",
  fontSize: "12px",
  outline: "none",
  transition: `border-color ${motion}`,
};

const button = {
  height: "28px",
  padding: "0 10px",
  margin: "0",
  border: `1px solid ${token("border")}`,
  borderRadius: radiusMd,
  backgroundColor: token("secondary"),
  backgroundImage: "none",
  color: token("secondary-foreground"),
  fontFamily: "var(--pui-font-sans)",
  fontSize: "12px",
  fontWeight: "500",
  textTransform: "none",
  cursor: "pointer",
  transition: `background-color ${motion}`,
};

/** Editor chrome in preUI tokens: surfaces, gutter, selection, search panel and autocomplete popup. */
export const preuiEditorTheme = EditorView.theme(
  {
    "&": {
      color: syntaxColor("foreground"),
      backgroundColor: token("background"),
      fontSize: "13px",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-scroller": {
      fontFamily: "var(--pui-font-mono)",
      // Ligatures would turn `--var` into a dash and `=>` into an arrow; code shows what you type.
      fontVariantLigatures: "none",
      lineHeight: "1.625",
      // The editor grows with its content; the surrounding preUI ScrollArea does the scrolling.
      overflow: "visible",
    },
    ".cm-content": {
      padding: "12px 0",
      caretColor: token("foreground"),
    },
    ".cm-line": { padding: "0 16px 0 12px" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: token("foreground"), borderLeftWidth: "1.5px" },
    ".cm-placeholder": { color: token("muted-foreground"), fontStyle: "normal" },

    // Gutter: same surface, 1px separator.
    ".cm-gutters": {
      backgroundColor: token("background"),
      color: token("muted-foreground", 0.7),
      borderRight: `1px solid ${token("border")}`,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 12px 0 14px",
      minWidth: "40px",
      fontVariantNumeric: "tabular-nums",
    },
    ".cm-foldGutter .cm-gutterElement": {
      padding: "0 4px",
      color: token("muted-foreground"),
      cursor: "pointer",
    },
    ".cm-foldGutter .cm-gutterElement:hover": { color: token("foreground") },
    ".cm-pui-foldMarker": {
      display: "inline-block",
      width: "6px",
      height: "6px",
      marginBottom: "2px",
      borderRight: "1.5px solid currentColor",
      borderBottom: "1.5px solid currentColor",
      transform: "rotate(45deg)",
      transition: `transform ${motion}`,
    },
    ".cm-pui-foldMarker[data-open=false]": { transform: "rotate(-45deg)", marginBottom: "0" },
    ".cm-foldPlaceholder": {
      backgroundColor: token("muted"),
      border: `1px solid ${token("border")}`,
      borderRadius: radiusSm,
      color: token("muted-foreground"),
      padding: "0 4px",
      margin: "0 2px",
    },

    // Active line, selection, matches.
    ".cm-activeLine": { backgroundColor: token("accent", 0.4) },
    ".cm-activeLineGutter": { backgroundColor: token("accent", 0.4), color: token("foreground") },
    "&:not(.cm-focused) .cm-activeLine, &:not(.cm-focused) .cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "inherit",
    },
    ".cm-selectionBackground": { backgroundColor: token("primary", 0.18) },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": { backgroundColor: token("primary", 0.25) },
    ".cm-content ::selection": { backgroundColor: token("primary", 0.25) },
    ".cm-selectionMatch": { backgroundColor: token("primary", 0.12) },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "transparent",
      outline: `1px solid ${token("ring")}`,
      borderRadius: radiusXs,
    },
    "&.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "transparent",
      outline: `1px solid ${token("negative")}`,
      borderRadius: radiusXs,
    },
    ".cm-searchMatch": {
      backgroundColor: token("warning", 0.18),
      outline: `1px solid ${token("warning", 0.45)}`,
      borderRadius: radiusXs,
    },
    ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: token("warning", 0.38) },
    ".cm-specialChar": { color: token("negative") },

    // Panels (search) on the popover surface.
    ".cm-panels": {
      backgroundColor: token("popover"),
      color: token("popover-foreground"),
    },
    ".cm-panels.cm-panels-top": { borderBottom: `1px solid ${token("border")}` },
    ".cm-panels.cm-panels-bottom": { borderTop: `1px solid ${token("border")}` },
    ".cm-panel.cm-search": {
      position: "relative",
      padding: "6px 40px 6px 6px",
      fontFamily: "var(--pui-font-sans)",
      fontSize: "12px",
    },
    ".cm-panel.cm-search > *": { margin: "3px 2px", verticalAlign: "middle" },
    ".cm-textfield": field,
    ".cm-textfield:focus": { borderColor: token("ring") },
    ".cm-textfield::placeholder": { color: token("muted-foreground") },
    ".cm-search .cm-textfield": { width: "200px" },
    ".cm-button": button,
    ".cm-button:hover": { backgroundColor: token("accent") },
    ".cm-button:focus-visible": { outline: "none", boxShadow: `0 0 0 var(--pui-ring-width) ${token("ring")}` },
    ".cm-button:active": { backgroundImage: "none", backgroundColor: token("accent") },
    ".cm-panel.cm-search label": {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      margin: "3px 6px",
      fontSize: "12px",
      color: token("muted-foreground"),
      cursor: "pointer",
    },
    ".cm-panel.cm-search label:hover": { color: token("foreground") },
    ".cm-panel.cm-search input[type=checkbox]": {
      margin: "0",
      width: "14px",
      height: "14px",
      accentColor: token("primary"),
    },
    ".cm-panel.cm-search [name=close]": {
      position: "absolute",
      top: "6px",
      right: "6px",
      margin: "3px 2px",
      width: "28px",
      height: "28px",
      padding: "0",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      borderRadius: radiusMd,
      backgroundColor: "transparent",
      color: token("muted-foreground"),
      fontSize: "18px",
      lineHeight: "1",
      cursor: "pointer",
    },
    ".cm-panel.cm-search [name=close]:hover": { backgroundColor: token("accent"), color: token("foreground") },

    // Tooltips + autocomplete like the preUI popover / menu.
    ".cm-tooltip": {
      backgroundColor: token("popover"),
      color: token("popover-foreground"),
      border: `1px solid ${token("border")}`,
      borderRadius: radiusMd,
      boxShadow: "var(--pui-shadow-floating)",
      overflow: "hidden",
    },
    ".cm-tooltip .cm-tooltip-arrow:before, .cm-tooltip .cm-tooltip-arrow:after": { display: "none" },
    ".cm-tooltip.cm-tooltip-autocomplete": { padding: "4px" },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": {
      fontFamily: "var(--pui-font-mono)",
      fontVariantLigatures: "none",
      fontSize: "12px",
      maxHeight: "16rem",
      minWidth: "12rem",
      // CodeMirror owns this list, so it can't be a ScrollArea: a thin scrollbar in the ScrollArea colours.
      scrollbarWidth: "thin",
      scrollbarColor: `${token("muted-foreground", 0.35)} transparent`,
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li": {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "4px 8px",
      borderRadius: radiusSm,
      lineHeight: "1.5",
      color: token("popover-foreground"),
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: token("accent"),
      color: token("accent-foreground"),
    },
    // (No unfocused variant: tooltips live in a container outside the editor, which never carries
    // .cm-focused — and the completion list closes on blur anyway.)
    ".cm-completionLabel": { flex: "1" },
    ".cm-completionMatchedText": { textDecoration: "none", color: token("primary"), fontWeight: "600" },
    ".cm-completionDetail": {
      marginLeft: "auto",
      fontStyle: "normal",
      color: token("muted-foreground"),
    },
    ".cm-tooltip.cm-completionInfo": {
      padding: "8px 10px",
      maxWidth: "20rem",
      fontFamily: "var(--pui-font-sans)",
      fontSize: "12px",
      lineHeight: "1.35",
    },
  },
  { dark: true },
);

/** English defaults for CodeMirror's UI strings (search panel etc.), in sentence case. Override via the `phrases` prop. */
export const defaultEditorPhrases: Record<string, string> = {
  Find: "Find",
  Replace: "Replace",
  next: "Next",
  previous: "Previous",
  all: "All",
  "match case": "Match case",
  regexp: "Regexp",
  "by word": "By word",
  replace: "Replace",
  "replace all": "Replace all",
  close: "Close",
  "Go to line": "Go to line",
  go: "Go",
};
