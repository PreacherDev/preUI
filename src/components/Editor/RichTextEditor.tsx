import { Extension, type AnyExtension, type Editor } from "@tiptap/core";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { Plugin } from "@tiptap/pm/state";
import { EditorContent, useEditor, useEditorState, type UseEditorOptions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { cn } from "../../utils/cn";
import { guardOutsideCaret } from "../../utils/outside-caret-guard";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import { proseClassName } from "./prose";
import {
  RichTextEditorToolbar,
  defaultRichTextEditorLabels,
  defaultRichTextEditorToolbar,
  type RichTextEditorLabels,
  type RichTextEditorToolbarItem,
} from "./RichTextEditorToolbar";

/** Imperative handle of `RichTextEditor` (via `ref`). */
export interface RichTextEditorHandle {
  /** The Tiptap editor instance (`null` until it is created). */
  editor: Editor | null;
  /** Current content as Markdown. */
  getMarkdown: () => string;
  /** Replaces the content (Markdown) without emitting `onValueChange`. */
  setMarkdown: (markdown: string) => void;
  /** Focuses the editor, by default at the end of the content. */
  focus: (position?: "start" | "end" | "all") => void;
}

export interface RichTextEditorProps {
  /** Markdown content (controlled). */
  value?: string;
  /** Initial Markdown content (uncontrolled). */
  defaultValue?: string;
  /** Called with the Markdown on every content change. */
  onValueChange?: (markdown: string) => void;
  /** Shown while the document is empty. */
  placeholder?: string;
  /** `false` renders the content read-only and hides the toolbar. Default `true`. */
  editable?: boolean;
  /** `false` for a bare editor, or the list of buttons to show (in their fixed order). Default: all. */
  toolbar?: boolean | RichTextEditorToolbarItem[];
  /** Focuses the editor (cursor at the end) after mounting. */
  autoFocus?: boolean;
  /** Minimum height of the content area (number = px). */
  minHeight?: number | string;
  /** Maximum height of the content area; longer content scrolls inside (number = px). */
  maxHeight?: number | string;
  /** Maximum number of characters; also shows a counter in a footer. Read once when the editor is created. */
  characterLimit?: number;
  /** Texts of the toolbar, link popover and counter (English defaults). */
  labels?: Partial<RichTextEditorLabels>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /** Classes of the outer frame. */
  className?: string;
  /** Classes of the editable content element (padding, typography overrides). */
  contentClassName?: string;
  /** Additional Tiptap extensions. Read once when the editor is created. */
  extensions?: AnyExtension[];
  /** Called once the Tiptap editor has been created. */
  onEditorReady?: (editor: Editor) => void;
  id?: string;
}

/** The document as Markdown, without the trailing blank lines of empty closing paragraphs. */
const serialize = (editor: Editor) => editor.getMarkdown().replace(/\s+$/, "");

const toCssSize = (size: number | string | undefined) => (typeof size === "number" ? `${size}px` : size);

/** Classes that only make sense inside the ProseMirror element (placeholder, selected nodes). */
const editorContentClassName = [
  "min-w-0 whitespace-pre-wrap px-3 py-2 outline-none",
  // Placeholder of the empty document (Tiptap's Placeholder extension sets data-placeholder).
  "[&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left",
  "[&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-pui-muted-foreground",
  "[&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
  // Code blocks wrap while editing instead of scrolling sideways in a native scroll container (the prose
  // default); the `.ProseMirror` compound outranks the prose selectors.
  "[&.ProseMirror_pre]:overflow-x-visible [&.ProseMirror_pre]:!whitespace-pre-wrap [&.ProseMirror_pre_code]:!whitespace-pre-wrap",
  // Node selection (e.g. a clicked divider)
  "[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-1 [&_.ProseMirror-selectednode]:outline-offset-2 [&_.ProseMirror-selectednode]:outline-pui-ring",
].join(" ");

/**
 * WYSIWYG editor that reads and writes Markdown (Tiptap 3 + @tiptap/markdown).
 *
 * Supports bold, italic, strike, inline code, headings 1–3, lists, quotes, code blocks,
 * dividers and links. Markdown shortcuts work while typing ("## ", "- ", "> ", "```" …).
 */
export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(
  {
    value,
    defaultValue,
    onValueChange,
    placeholder,
    editable = true,
    toolbar = true,
    autoFocus = false,
    minHeight,
    maxHeight,
    characterLimit,
    labels: labelsProp,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    className,
    contentClassName,
    extensions: extraExtensions,
    onEditorReady,
    id,
  },
  ref,
) {
  const labels = useMemo(() => ({ ...defaultRichTextEditorLabels, ...labelsProp }), [labelsProp]);
  const toolbarItems = toolbar === false ? [] : toolbar === true ? defaultRichTextEditorToolbar : toolbar;
  const showToolbar = editable && toolbarItems.length > 0;

  const [linkOpen, setLinkOpen] = useState(false);

  const attributes = useMemo(() => {
    const result: Record<string, string> = {
      class: cn(proseClassName, editorContentClassName, contentClassName),
      role: "textbox",
      "aria-multiline": "true",
    };
    if (ariaLabel) result["aria-label"] = ariaLabel;
    if (ariaLabelledBy) result["aria-labelledby"] = ariaLabelledBy;
    if (ariaDescribedBy) result["aria-describedby"] = ariaDescribedBy;
    if (!editable) result["aria-readonly"] = "true";
    if (id) result.id = id;
    return result;
  }, [contentClassName, ariaLabel, ariaLabelledBy, ariaDescribedBy, editable, id]);
  const attributesRef = useRef(attributes);
  attributesRef.current = attributes;

  // Latest props for callbacks that are registered once.
  const latest = useRef({ onValueChange, onEditorReady, placeholder, linkEnabled: false });
  latest.current = { onValueChange, onEditorReady, placeholder, linkEnabled: showToolbar && toolbarItems.includes("link") };

  /** The Markdown last emitted or applied, so echoed values don't reset the document. */
  const lastMarkdown = useRef<string | undefined>(undefined);

  // Options are created once; changing props are synced through effects (a new options object on every
  // render would make useEditor re-apply them each time).
  const [options] = useState<UseEditorOptions>(() => {
    const initial = value ?? defaultValue ?? "";
    lastMarkdown.current = initial;

    const linkShortcut = Extension.create({
      name: "preuiLinkShortcut",
      addKeyboardShortcuts() {
        return {
          "Mod-k": () => {
            if (!latest.current.linkEnabled) return false;
            setLinkOpen(true);
            return true;
          },
        };
      },
    });

    // Attributes of the content element as a plugin prop, re-read on every state update.
    const contentAttributes = Extension.create({
      name: "preuiContentAttributes",
      addProseMirrorPlugins() {
        return [new Plugin({ props: { attributes: () => attributesRef.current } })];
      },
    });

    // A press beside the frame (on an ancestor's empty area) must not put the caret into the content;
    // presses inside the frame behave natively.
    const outsideCaretGuard = Extension.create({
      name: "preuiOutsideCaretGuard",
      addProseMirrorPlugins() {
        return [
          new Plugin({
            view: (view) => ({
              destroy: guardOutsideCaret(view.dom, () => view.dom.closest('[data-slot="rich-text-editor"]')),
            }),
          }),
        ];
      },
    });

    return {
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      editable,
      autofocus: autoFocus ? "end" : false,
      content: initial,
      contentType: "markdown",
      extensions: [
        StarterKit.configure({
          // Markdown has no underline (tiptap would store non-standard "++text++"), so it's disabled.
          underline: false,
          // Code isn't prose: no spell-check squiggles.
          code: { HTMLAttributes: { spellcheck: "false" } },
          codeBlock: { HTMLAttributes: { spellcheck: "false" } },
          link: {
            openOnClick: false,
            autolink: true,
            linkOnPaste: true,
            markdownLinks: true,
            defaultProtocol: "https",
            HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
          },
        }),
        Placeholder.configure({ placeholder: () => latest.current.placeholder ?? "" }),
        CharacterCount.configure({ limit: characterLimit ?? null }),
        Markdown,
        linkShortcut,
        contentAttributes,
        outsideCaretGuard,
        ...(extraExtensions ?? []),
      ],
      editorProps: {
        // Links open on Ctrl/Cmd+click while editing (a plain click places the cursor).
        handleClick(view, _pos, event) {
          if (!view.editable || event.button !== 0 || !(event.ctrlKey || event.metaKey)) return false;
          const link = (event.target as HTMLElement | null)?.closest?.("a");
          if (!link || !view.dom.contains(link) || !link.href) return false;
          window.open(link.href, "_blank", "noopener,noreferrer");
          return true;
        },
      },
      onCreate({ editor }) {
        latest.current.onEditorReady?.(editor);
      },
      onUpdate({ editor }) {
        const markdown = serialize(editor);
        if (markdown === lastMarkdown.current) return;
        lastMarkdown.current = markdown;
        latest.current.onValueChange?.(markdown);
      },
    };
  });

  const editor = useEditor(options, []);

  // ProseMirror re-reads the attributes (classes, ARIA) and placeholder decorations on every state
  // update, so an empty transaction applies changed props.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(editor.state.tr.setMeta("addToHistory", false).setMeta("preuiProps", true));
  }, [editor, attributes, placeholder]);

  useEffect(() => {
    // Keep the stored options in line, so useEditor doesn't see changed options on every render.
    options.editable = editable;
    if (!editor || editor.isDestroyed || editor.isEditable === editable) return;
    editor.setEditable(editable, false);
    if (!editable) setLinkOpen(false);
  }, [editor, editable, options]);

  // Controlled value: apply external changes, ignore echoes of what the editor just emitted.
  useEffect(() => {
    if (!editor || editor.isDestroyed || value === undefined) return;
    if (value === lastMarkdown.current) return;
    lastMarkdown.current = value;
    if (value === serialize(editor)) return;
    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [editor, value]);

  useImperativeHandle(
    ref,
    () => ({
      editor,
      getMarkdown: () => (editor && !editor.isDestroyed ? serialize(editor) : (lastMarkdown.current ?? "")),
      setMarkdown: (markdown: string) => {
        if (!editor || editor.isDestroyed) return;
        lastMarkdown.current = markdown;
        editor.commands.setContent(markdown, { contentType: "markdown", emitUpdate: false });
      },
      focus: (position = "end") => {
        editor?.commands.focus(position);
      },
    }),
    [editor],
  );

  const scrollStyle: CSSProperties | undefined = maxHeight !== undefined ? { maxHeight: toCssSize(maxHeight) } : undefined;
  const contentStyle: CSSProperties | undefined = minHeight !== undefined ? { minHeight: toCssSize(minHeight) } : undefined;

  return (
    <div
      data-slot="rich-text-editor"
      data-readonly={editable ? undefined : ""}
      className={cn(
        "flex w-full min-w-0 flex-col rounded-pui-md border border-pui-input bg-pui-background text-pui-foreground",
        "transition-colors duration-pui-fast ease-pui focus-within:border-pui-ring",
        // Read-only content sits in a quieter panel frame.
        "data-[readonly]:border-pui-border data-[readonly]:focus-within:border-pui-border",
        className,
      )}
    >
      {showToolbar && editor && (
        <div
          data-slot="rich-text-editor-toolbar"
          className="sticky top-0 z-10 rounded-t-[inherit] border-b border-pui-border bg-pui-background px-1 py-1"
        >
          <RichTextEditorToolbar
            editor={editor}
            items={toolbarItems}
            labels={labels}
            linkOpen={linkOpen}
            onLinkOpenChange={setLinkOpen}
          />
        </div>
      )}
      {/* The content scrolls in a preUI ScrollArea (max height on its root); ProseMirror scrolls the
          cursor into view through its nearest scrollable ancestor, the ScrollArea viewport. */}
      <ScrollArea
        data-slot="rich-text-editor-scroll"
        className="min-h-0 flex-1"
        style={scrollStyle}
        reserveTrack={false}
        // The editable content is the focus target; the viewport needn't be a tab stop of its own.
        viewportProps={{ tabIndex: -1 }}
        // grid + min-h-full: the editable area fills the whole frame (clicks below the text land in it);
        // !min-w-0: code blocks wrap/scroll inside the content instead of widening it.
        contentClassName="grid min-h-full !min-w-0"
      >
        <EditorContent
          data-slot="rich-text-editor-content"
          editor={editor}
          className="grid min-w-0 [&>.ProseMirror]:min-w-0" style={contentStyle} />
      </ScrollArea>
      {characterLimit !== undefined && editor && (
        <CharacterCounter editor={editor} limit={characterLimit} label={labels.characterCount} />
      )}
    </div>
  );
});

function CharacterCounter({ editor, limit, label }: { editor: Editor; limit: number; label: string }) {
  const count = useEditorState({ editor, selector: ({ editor: e }) => e.storage.characterCount.characters() });
  const ratio = limit > 0 ? count / limit : 0;
  return (
    <div
      data-slot="rich-text-editor-footer"
      className="flex items-center justify-end border-t border-pui-border px-3 py-1.5 text-xs"
    >
      <span
        data-slot="rich-text-editor-character-count"
        aria-label={`${label}: ${count} / ${limit}`}
        className={cn(
          "tabular-nums text-pui-muted-foreground transition-colors duration-pui-fast ease-pui",
          ratio >= 0.9 && "text-pui-warning",
          ratio >= 1 && "text-pui-negative",
        )}
      >
        {count} / {limit}
      </span>
    </div>
  );
}
