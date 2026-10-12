// Images and GFM tables for the RichTextEditor: Tiptap nodes with Markdown parse/render hooks for @tiptap/markdown,
// built on @tiptap/core and prosemirror-tables (re-exported by @tiptap/pm), so no extra package is needed.
import { Extension, Node, mergeAttributes, type Editor, type JSONContent } from "@tiptap/core";
import type { Command, EditorState, Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  goToNextCell,
  isInTable,
  tableEditing,
} from "@tiptap/pm/tables";

// ------------------------------------------------------------------------------------------------
// Image
// ------------------------------------------------------------------------------------------------

/** Escapes what would end the alt text / title of `![alt](src "title")`. */
const escapeAlt = (text: string) => text.replace(/([\\[\]])/g, "\\$1");
const escapeTitle = (text: string) => text.replace(/(["\\])/g, "\\$1");
/** URLs with spaces or parentheses go in angle brackets, which CommonMark allows for link destinations. */
const formatSrc = (src: string) => (/[\s()<>]/.test(src) ? `<${src.replace(/[<>]/g, encodeURIComponent)}>` : src);

/** Inline image (`![alt](src "title")`). Markdown images are inline, so the node is too. */
export const RichTextImage = /* @__PURE__ */ Node.create({
  name: "image",
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes({ "data-slot": "rich-text-editor-image" }, HTMLAttributes)];
  },

  markdownTokenName: "image",

  parseMarkdown: (token, helpers) =>
    helpers.createNode("image", { src: token.href ?? "", alt: token.text || null, title: token.title || null }),

  renderMarkdown: (node) => {
    const attrs = (node.attrs ?? {}) as { src?: string | null; alt?: string | null; title?: string | null };
    if (!attrs.src) return "";
    const title = attrs.title ? ` "${escapeTitle(attrs.title)}"` : "";
    const image = `![${escapeAlt(attrs.alt ?? "")}](${formatSrc(attrs.src)}${title})`;
    // @tiptap/markdown writes marks around text only: a linked image writes its link itself.
    const link = (node as JSONContent).marks?.find((mark) => mark.type === "link")?.attrs as
      | { href?: string; title?: string | null }
      | undefined;
    if (!link?.href) return image;
    return link.title ? `[${image}](${link.href} "${escapeTitle(link.title)}")` : `[${image}](${link.href})`;
  },
});

/**
 * Keeps a paragraph that holds nothing but an image (`![alt](src)` on its own line) a paragraph. Tiptap's paragraph
 * unwraps it for block images, which this inline node isn't. Runs before the paragraph's handler (priority 1000) and
 * leaves every other paragraph to it.
 */
const ImageParagraph = /* @__PURE__ */ Extension.create({
  name: "preuiImageParagraph",
  priority: 1001,
  markdownTokenName: "paragraph",
  parseMarkdown: (token, helpers) => {
    const tokens = token.tokens ?? [];
    if (tokens.length !== 1 || tokens[0].type !== "image") return [];
    return helpers.createNode("paragraph", undefined, helpers.parseInline(tokens));
  },
  // @tiptap/markdown renders a node with the first handler registered for its name — this one, since it parses
  // "paragraph" tokens first. Same output as Tiptap's paragraph: its inline content; an empty paragraph after
  // another empty one as `&nbsp;`, so blank lines survive.
  renderMarkdown: (node, helpers, context) => {
    const content = Array.isArray(node.content) ? node.content : [];
    if (content.length > 0) return helpers.renderChildren(content);
    const previous = context?.previousNode;
    const previousEmpty = previous?.type === "paragraph" && !(Array.isArray(previous.content) && previous.content.length > 0);
    return previousEmpty ? "&nbsp;" : "";
  },
});

/**
 * Links with images inside (`[![alt](src)](href)`): Tiptap applies the link mark to text only, so the image would
 * lose it. Inline tokens only go to the first handler of their type, so this one (before the link's, priority 1000)
 * parses every link: the mark goes on text and images alike, with the attributes Tiptap's link uses.
 */
const ImageLink = /* @__PURE__ */ Extension.create({
  name: "preuiImageLink",
  priority: 1001,
  markdownTokenName: "link",
  parseMarkdown: (token, helpers) => {
    const mark = { type: "link", attrs: { href: token.href, title: token.title || null } };
    const addMark = (node: JSONContent): JSONContent =>
      node.type === "text" || node.type === "image"
        ? { ...node, marks: [...(node.marks ?? []), mark] }
        : { ...node, content: node.content?.map(addMark) };
    return helpers.parseInline(token.tokens ?? []).map(addMark);
  },
});

// ------------------------------------------------------------------------------------------------
// Table
// ------------------------------------------------------------------------------------------------

type CellAlign = "left" | "center" | "right" | null;

const tableRoles: Record<string, string> = {
  table: "table",
  tableRow: "row",
  tableCell: "cell",
  tableHeader: "header_cell",
};

/** Attributes prosemirror-tables expects on cells, plus the GFM column alignment. */
const cellAttributes = () => ({
  colspan: { default: 1 },
  rowspan: { default: 1 },
  colwidth: { default: null },
  align: {
    default: null,
    parseHTML: (element: HTMLElement) => {
      const align = element.style.textAlign || element.getAttribute("align");
      return align === "left" || align === "center" || align === "right" ? align : null;
    },
    renderHTML: (attributes: { align?: CellAlign }) =>
      attributes.align ? { style: `text-align: ${attributes.align}` } : {},
  },
});

export const RichTextTableCell = /* @__PURE__ */ Node.create({
  name: "tableCell",
  // One paragraph: a GFM cell holds a single line of inline content.
  content: "paragraph",
  isolating: true,
  addAttributes: cellAttributes,
  parseHTML: () => [{ tag: "td" }],
  renderHTML: ({ HTMLAttributes }) => ["td", mergeAttributes(HTMLAttributes), 0],
});

export const RichTextTableHeader = /* @__PURE__ */ Node.create({
  name: "tableHeader",
  content: "paragraph",
  isolating: true,
  addAttributes: cellAttributes,
  parseHTML: () => [{ tag: "th" }],
  renderHTML: ({ HTMLAttributes }) => ["th", mergeAttributes(HTMLAttributes), 0],
});

export const RichTextTableRow = /* @__PURE__ */ Node.create({
  name: "tableRow",
  content: "(tableCell | tableHeader)*",
  parseHTML: () => [{ tag: "tr" }],
  renderHTML: ({ HTMLAttributes }) => ["tr", mergeAttributes(HTMLAttributes), 0],
});

/** Inline Markdown of one cell: one line, `|` escaped, hard breaks as `<br>`. */
function cellMarkdown(cell: JSONContent, render: (nodes: JSONContent[]) => string) {
  const markdown = render(cell.content ?? []).trim();
  return markdown
    .replace(/(?: {2,}|\\)?\r?\n\s*/g, "<br>")
    .replace(/(^|[^\\])\|/g, "$1\\|")
    .replace(/(^|[^\\])\|/g, "$1\\|");
}

const alignRule = (align: CellAlign) =>
  align === "center" ? ":---:" : align === "right" ? "---:" : align === "left" ? ":---" : "---";

/** GFM table (`| a | b |` with a header row). Cell contents are inline; alignment per column survives a round trip. */
export const RichTextTable = /* @__PURE__ */ Node.create({
  name: "table",
  group: "block",
  content: "tableRow+",
  isolating: true,

  // prosemirror-tables finds the table node types by `tableRole` in their specs.
  extendNodeSchema(extension) {
    const role = tableRoles[extension.name];
    return role ? { tableRole: role } : {};
  },

  parseHTML() {
    return [{ tag: "table" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["table", mergeAttributes({ "data-slot": "rich-text-editor-table" }, HTMLAttributes), ["tbody", 0]];
  },

  markdownTokenName: "table",

  parseMarkdown: (token, helpers) => {
    const align = (token.align ?? []) as CellAlign[];
    const cell = (type: string, source: { tokens?: unknown[] }, index: number) =>
      helpers.createNode(type, { align: align[index] ?? null }, [
        helpers.createNode("paragraph", undefined, helpers.parseInline((source.tokens ?? []) as never[])),
      ]);
    const header = (token.header ?? []) as { tokens?: unknown[] }[];
    const rows = (token.rows ?? []) as { tokens?: unknown[] }[][];
    return helpers.createNode("table", undefined, [
      helpers.createNode("tableRow", undefined, header.map((source, index) => cell("tableHeader", source, index))),
      ...rows.map((row) => helpers.createNode("tableRow", undefined, row.map((source, index) => cell("tableCell", source, index)))),
    ]);
  },

  renderMarkdown: (node, helpers) => {
    const rows = ((node as JSONContent).content ?? []).map((row) => row.content ?? []);
    if (rows.length === 0) return "";
    const columns = Math.max(...rows.map((row) => row.length), 1);
    const render = (nodes: JSONContent[]) => helpers.renderChildren(nodes);
    const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
    const texts = rows.map((row) =>
      Array.from({ length: columns }, (_, index) => (row[index] ? cellMarkdown(row[index], render) : "")),
    );
    const aligns = Array.from(
      { length: columns },
      (_, index) => ((rows[0][index]?.attrs?.align as CellAlign | undefined) ?? null),
    );
    return [line(texts[0]), line(aligns.map(alignRule)), ...texts.slice(1).map(line)].join("\n");
  },

  addProseMirrorPlugins() {
    return [tableEditing({ allowTableNodeSelection: true })];
  },

  addKeyboardShortcuts() {
    return {
      // Tab / Shift+Tab move between cells; Tab in the last cell adds a row.
      Tab: () => {
        const { editor } = this;
        if (!isInTable(editor.state)) return false;
        if (runTableCommand(editor, goToNextCell(1))) return true;
        return runTableCommand(editor, addRowAfter) && runTableCommand(editor, goToNextCell(1));
      },
      "Shift-Tab": () => isInTable(this.editor.state) && (runTableCommand(this.editor, goToNextCell(-1)) || true),
    };
  },
});

/** Image + GFM table nodes for `RichTextEditor` (always on, so Markdown with images and tables survives). */
export const RichTextMediaKit = /* @__PURE__ */ Extension.create({
  name: "preuiMediaKit",
  addExtensions() {
    return [ImageParagraph, ImageLink, RichTextImage, RichTextTable, RichTextTableRow, RichTextTableHeader, RichTextTableCell];
  },
});

// ------------------------------------------------------------------------------------------------
// Commands (used by the toolbar)
// ------------------------------------------------------------------------------------------------

/** Runs a ProseMirror command in a focused Tiptap chain; without `dispatch` it only checks whether it can run. */
export function runTableCommand(editor: Editor, command: Command, dispatch = true): boolean {
  if (!dispatch) return editor.can().command(({ state }) => command(state as EditorState));
  return editor
    .chain()
    .focus()
    .command(({ state, dispatch: run }) => command(state as EditorState, run ? (tr: Transaction) => run(tr) : undefined))
    .run();
}

/** Inserts an empty `rows` × `columns` table (first row = header) and puts the cursor into its first cell. */
export const insertTable =
  (rows = 3, columns = 3): Command =>
  (state, dispatch) => {
    if (isInTable(state)) return false;
    const { schema } = state;
    const types = ["table", "tableRow", "tableHeader", "tableCell", "paragraph"].map((name) => schema.nodes[name]);
    if (types.some((type) => !type)) return false;
    const [table, row, header, cell] = types;
    const makeRow = (type: typeof cell) =>
      row.create(null, Array.from({ length: columns }, () => type.createAndFill()!));
    const node = table.create(null, [makeRow(header), ...Array.from({ length: rows - 1 }, () => makeRow(cell))]);
    if (dispatch) {
      const tr = state.tr.replaceSelectionWith(node);
      // Cursor into the first cell: table > row > cell > paragraph, so its text starts 4 positions in.
      let tablePos = -1;
      tr.doc.descendants((child, pos) => {
        if (child === node) tablePos = pos;
        return tablePos < 0 && !child.isTextblock;
      });
      if (tablePos >= 0) tr.setSelection(TextSelection.create(tr.doc, tablePos + 4));
      dispatch(tr.scrollIntoView());
    }
    return true;
  };

export const tableCommands = {
  addRowBefore,
  addRowAfter,
  addColumnBefore,
  addColumnAfter,
  deleteRow,
  deleteColumn,
  deleteTable,
} as const;

export { isInTable };
