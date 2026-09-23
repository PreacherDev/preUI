import { EditorSelection, Prec, type ChangeSpec, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
  forwardRef,
  Fragment,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactElement,
} from "react";
import { useIcon, type IconName } from "../../icons";
import { cn } from "../../utils/cn";
import { useElementWidth } from "../../utils/use-element-width";
import { CodeEditor, type CodeEditorHandle, type CodeEditorProps } from "../Code/CodeEditor";
import { Markdown, type MarkdownProps } from "../Markdown/Markdown";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs/Tabs";
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from "../Toolbar/Toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../Tooltip/Tooltip";

/* ------------------------------------------------------------------------------------------------
 * Markdown commands (operate on the CodeMirror view)
 * ----------------------------------------------------------------------------------------------*/

/** Wraps every selection in `before`/`after`, or removes the markers when they are already there. */
function toggleWrap(view: EditorView, before: string, after = before): boolean {
  const { state } = view;
  if (state.readOnly) return false;
  const transaction = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to);
    const outerBefore = state.sliceDoc(range.from - before.length, range.from);
    const outerAfter = state.sliceDoc(range.to, range.to + after.length);
    // Markers right around the selection → unwrap.
    if (outerBefore === before && outerAfter === after) {
      return {
        changes: [
          { from: range.from - before.length, to: range.from },
          { from: range.to, to: range.to + after.length },
        ],
        range: EditorSelection.range(range.from - before.length, range.to - before.length),
      };
    }
    // Markers inside the selection → unwrap.
    if (text.length >= before.length + after.length && text.startsWith(before) && text.endsWith(after)) {
      const inner = text.slice(before.length, text.length - after.length);
      return {
        changes: { from: range.from, to: range.to, insert: inner },
        range: EditorSelection.range(range.from, range.from + inner.length),
      };
    }
    return {
      changes: { from: range.from, to: range.to, insert: before + text + after },
      range: EditorSelection.range(range.from + before.length, range.from + before.length + text.length),
    };
  });
  view.dispatch(state.update(transaction, { scrollIntoView: true, userEvent: "input.format" }));
  view.focus();
  return true;
}

/** `[selection]()` with the cursor in the parentheses; a selected URL becomes `[](url)` with the cursor in the brackets. */
function insertLink(view: EditorView): boolean {
  const { state } = view;
  if (state.readOnly) return false;
  const transaction = state.changeByRange((range) => {
    const text = state.sliceDoc(range.from, range.to);
    if (/^(https?:\/\/|www\.)\S+$/i.test(text)) {
      return {
        changes: { from: range.from, to: range.to, insert: `[](${text})` },
        range: EditorSelection.cursor(range.from + 1),
      };
    }
    const cursor = text ? range.from + text.length + 3 : range.from + 1;
    return {
      changes: { from: range.from, to: range.to, insert: `[${text}]()` },
      range: EditorSelection.cursor(cursor),
    };
  });
  view.dispatch(state.update(transaction, { scrollIntoView: true, userEvent: "input.format" }));
  view.focus();
  return true;
}

type LinePrefix = "heading" | "bullet" | "ordered" | "quote";

const prefixPatterns: Record<LinePrefix, RegExp> = {
  heading: /^#{1,6}[ \t]+/,
  bullet: /^[-*+][ \t]+/,
  ordered: /^\d+[.)][ \t]+/,
  quote: /^>[ \t]?/,
};

/** Toggles a block prefix (`# `, `- `, `1. `, `> `) on every line touched by the selection. */
function toggleLinePrefix(view: EditorView, kind: LinePrefix): boolean {
  const { state } = view;
  if (state.readOnly) return false;
  const lineNumbers = new Set<number>();
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number;
    const last = state.doc.lineAt(range.to).number;
    for (let n = first; n <= last; n++) lineNumbers.add(n);
  }
  let lines = [...lineNumbers].sort((a, b) => a - b).map((n) => state.doc.line(n));
  // In multi-line selections, blank lines stay untouched.
  if (lines.length > 1) lines = lines.filter((line) => line.text.trim() !== "");
  if (lines.length === 0) return false;

  const pattern = prefixPatterns[kind];
  const remove = lines.every((line) => pattern.test(line.text));
  const changes: ChangeSpec[] = [];
  lines.forEach((line, index) => {
    const existing = pattern.exec(line.text);
    if (remove) {
      if (existing) changes.push({ from: line.from, to: line.from + existing[0].length });
      return;
    }
    // Replace a competing list marker (bullet ↔ numbered) or heading level.
    const competing =
      kind === "bullet" ? prefixPatterns.ordered : kind === "ordered" ? prefixPatterns.bullet : null;
    const replaced = existing ?? (competing ? competing.exec(line.text) : null);
    const insert = kind === "heading" ? "# " : kind === "bullet" ? "- " : kind === "ordered" ? `${index + 1}. ` : "> ";
    changes.push({ from: line.from, to: line.from + (replaced?.[0].length ?? 0), insert });
  });

  const changeSet = state.changes(changes);
  view.dispatch({
    changes: changeSet,
    // assoc 1: a cursor at the line start ends up after the inserted marker.
    selection: state.selection.map(changeSet, 1),
    scrollIntoView: true,
    userEvent: "input.format",
  });
  view.focus();
  return true;
}

/** Puts the selected lines (or the current line) into a ``` fence; on an empty line inserts an empty fence. */
function insertCodeFence(view: EditorView): boolean {
  const { state } = view;
  if (state.readOnly) return false;
  const transaction = state.changeByRange((range) => {
    const first = state.doc.lineAt(range.from);
    const last = state.doc.lineAt(range.to);
    if (range.empty && first.text.trim() === "") {
      return {
        changes: { from: first.from, to: first.to, insert: "```\n\n```" },
        range: EditorSelection.cursor(first.from + 4),
      };
    }
    return {
      changes: [
        { from: first.from, insert: "```\n" },
        { from: last.to, insert: "\n```" },
      ],
      range: EditorSelection.range(first.from + 4, last.to + 4),
    };
  });
  view.dispatch(state.update(transaction, { scrollIntoView: true, userEvent: "input.format" }));
  view.focus();
  return true;
}

/* ------------------------------------------------------------------------------------------------
 * Toolbar
 * ----------------------------------------------------------------------------------------------*/

/** One button of the Markdown toolbar. */
export type MarkdownEditorToolbarItem =
  | "heading"
  | "bold"
  | "italic"
  | "strikethrough"
  | "code"
  | "codeBlock"
  | "link"
  | "quote"
  | "bulletList"
  | "orderedList";

/** Visible and accessible texts. English defaults, override any subset via `labels`. */
export interface MarkdownEditorLabels {
  write: string;
  preview: string;
  /** Accessible label of the source editor. */
  editor: string;
  toolbar: string;
  heading: string;
  bold: string;
  italic: string;
  strikethrough: string;
  code: string;
  codeBlock: string;
  link: string;
  quote: string;
  bulletList: string;
  orderedList: string;
  /** Shown in the preview while the document is empty. */
  emptyPreview: string;
}

export const defaultMarkdownEditorLabels: MarkdownEditorLabels = {
  write: "Write",
  preview: "Preview",
  editor: "Markdown",
  toolbar: "Formatting",
  heading: "Heading",
  bold: "Bold",
  italic: "Italic",
  strikethrough: "Strikethrough",
  code: "Inline code",
  codeBlock: "Code block",
  link: "Link",
  quote: "Quote",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  emptyPreview: "Nothing to preview",
};

/** Toolbar buttons in display order; a separator is drawn between non-empty groups. */
export const markdownEditorToolbarGroups: MarkdownEditorToolbarItem[][] = [
  ["heading", "bold", "italic", "strikethrough"],
  ["code", "codeBlock", "link"],
  ["quote", "bulletList", "orderedList"],
];

interface ItemSpec {
  icon: IconName;
  /** CodeMirror key, `Mod` = Ctrl / Cmd. */
  key?: string;
  run: (view: EditorView) => boolean;
}

const itemSpecs: Record<MarkdownEditorToolbarItem, ItemSpec> = {
  heading: { icon: "heading1", run: (view) => toggleLinePrefix(view, "heading") },
  bold: { icon: "bold", key: "Mod-b", run: (view) => toggleWrap(view, "**") },
  italic: { icon: "italic", key: "Mod-i", run: (view) => toggleWrap(view, "_") },
  strikethrough: { icon: "strikethrough", key: "Mod-Shift-x", run: (view) => toggleWrap(view, "~~") },
  code: { icon: "code", key: "Mod-e", run: (view) => toggleWrap(view, "`") },
  codeBlock: { icon: "codeBlock", run: insertCodeFence },
  link: { icon: "link", key: "Mod-k", run: insertLink },
  quote: { icon: "quote", run: (view) => toggleLinePrefix(view, "quote") },
  bulletList: { icon: "list", run: (view) => toggleLinePrefix(view, "bullet") },
  orderedList: { icon: "listOrdered", run: (view) => toggleLinePrefix(view, "ordered") },
};

/** Keyboard shortcuts of the formatting commands, above CodeMirror's defaults (e.g. `Mod-i`). */
const formattingKeymap: Extension = Prec.high(
  keymap.of(
    Object.values(itemSpecs)
      .filter((spec) => spec.key)
      .map((spec) => ({ key: spec.key!, run: spec.run, preventDefault: true })),
  ),
);

function isMacLike() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/** "Mod-Shift-x" → "Ctrl+Shift+X" or "⌘⇧X". */
function formatKey(key: string): string {
  const parts = key.split("-").map((part) => (part.length === 1 ? part.toUpperCase() : part));
  if (!isMacLike()) return parts.map((part) => (part === "Mod" ? "Ctrl" : part)).join("+");
  const symbols: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥", Ctrl: "⌃" };
  return parts.map((part) => symbols[part] ?? part).join("");
}

function ToolbarItem({
  item,
  label,
  disabled,
  getView,
}: {
  item: MarkdownEditorToolbarItem;
  label: string;
  disabled: boolean;
  getView: () => EditorView | null;
}) {
  const spec = itemSpecs[item];
  const Icon = useIcon(spec.icon);
  const button: ReactElement = (
    <ToolbarButton
      size="icon-sm"
      aria-label={label}
      data-item={item}
      disabled={disabled}
      // Keep the editor selection: don't move focus to the button on mouse down.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        const view = getView();
        if (view) spec.run(view);
      }}
    >
      <Icon aria-hidden="true" />
    </ToolbarButton>
  );
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>
        {label}
        {spec.key && <span className="ml-2 text-pui-tooltip-foreground/60">{formatKey(spec.key)}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

function MarkdownToolbar({
  items,
  labels,
  disabled,
  getView,
  className,
}: {
  items: MarkdownEditorToolbarItem[];
  labels: MarkdownEditorLabels;
  disabled: boolean;
  getView: () => EditorView | null;
  className?: string;
}) {
  const groups = markdownEditorToolbarGroups
    .map((group) => group.filter((item) => items.includes(item)))
    .filter((group) => group.length > 0);
  return (
    <Toolbar aria-label={labels.toolbar} className={cn("flex-wrap gap-0.5", className)}>
      {groups.map((group, index) => (
        <Fragment key={group.join("-")}>
          {index > 0 && <ToolbarSeparator orientation="vertical" className="mx-1" />}
          <ToolbarGroup>
            {group.map((item) => (
              <ToolbarItem key={item} item={item} label={labels[item]} disabled={disabled} getView={getView} />
            ))}
          </ToolbarGroup>
        </Fragment>
      ))}
    </Toolbar>
  );
}

/* ------------------------------------------------------------------------------------------------
 * MarkdownEditor
 * ----------------------------------------------------------------------------------------------*/

export type MarkdownEditorLayout = "tabs" | "split" | "editor";

/**
 * Below this frame width (px) the editor switches to its compact arrangement: the toolbar gets a row of its own
 * (scrolling horizontally when it doesn't fit) and `split` stacks editor and preview.
 */
export const MARKDOWN_EDITOR_COMPACT_WIDTH = 480;

export interface MarkdownEditorProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children" | "defaultValue" | "onChange" | "placeholder" | "id"> {
  /** Markdown source (controlled). */
  value?: string;
  /** Initial Markdown source (uncontrolled). */
  defaultValue?: string;
  /** Called with the full source after every edit. */
  onValueChange?: (value: string) => void;
  /**
   * `tabs` (Write / Preview, default), `split` (side by side; stacked when the frame is narrower than
   * `MARKDOWN_EDITOR_COMPACT_WIDTH`) or `editor` (no preview).
   */
  layout?: MarkdownEditorLayout;
  /** Tab that is active first in the `tabs` layout. Default `"write"`. */
  defaultTab?: "write" | "preview";
  /** Text shown while the document is empty. */
  placeholder?: string;
  /** Prevents edits and disables the toolbar. */
  readOnly?: boolean;
  /** Minimum height of the editor and preview (number = px). */
  minHeight?: number | string;
  /** Maximum height of the editor and preview; longer content scrolls inside (number = px). */
  maxHeight?: number | string;
  /** Shows line numbers in the editor. Default `false`. */
  lineNumbers?: boolean;
  /** `false` hides the formatting toolbar, or pass the buttons to show (in their fixed order). Default: all. */
  toolbar?: boolean | MarkdownEditorToolbarItem[];
  /** Texts of tabs, toolbar and preview (English defaults). */
  labels?: Partial<MarkdownEditorLabels>;
  /** Props for the `Markdown` preview (e.g. `codeBlockProps`, `components`). */
  previewProps?: Omit<MarkdownProps, "children" | "content">;
  /** Further props for the underlying `CodeEditor` (e.g. `autoFocus`, `onMount`, `extensions`, `phrases`). */
  editorProps?: Omit<
    CodeEditorProps,
    "value" | "defaultValue" | "onValueChange" | "language" | "readOnly" | "placeholder" | "minHeight" | "maxHeight"
  >;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /** Classes of the outer frame. */
  className?: string;
  id?: string;
}

/** The smallest single replacement turning `current` into `next` (common prefix/suffix kept, so the cursor stays). */
function minimalChange(current: string, next: string) {
  let start = 0;
  const max = Math.min(current.length, next.length);
  while (start < max && current.charCodeAt(start) === next.charCodeAt(start)) start++;
  let endCurrent = current.length;
  let endNext = next.length;
  while (endCurrent > start && endNext > start && current.charCodeAt(endCurrent - 1) === next.charCodeAt(endNext - 1)) {
    endCurrent--;
    endNext--;
  }
  return { from: start, to: endCurrent, insert: next.slice(start, endNext) };
}

const cssSize = (value: number | string | undefined) => (typeof value === "number" ? `${value}px` : value);

/** The inner CodeEditor draws no frame of its own; the MarkdownEditor frame is the field. */
const innerEditorClassName = "min-w-0 rounded-none border-0 bg-transparent focus-within:border-0";

/**
 * Markdown source editor (CodeMirror, Markdown highlighting, wrapping) with a formatting toolbar and a
 * rendered preview — as Write / Preview tabs, side by side, or without preview.
 */
export const MarkdownEditor = /* @__PURE__ */ forwardRef<CodeEditorHandle, MarkdownEditorProps>(function MarkdownEditor(
  {
    value,
    defaultValue,
    onValueChange,
    layout = "tabs",
    defaultTab = "write",
    placeholder,
    readOnly = false,
    minHeight,
    maxHeight,
    lineNumbers = false,
    toolbar = true,
    labels: labelsProp,
    previewProps,
    editorProps,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    className,
    id,
    ...props
  },
  ref,
) {
  const labels = useMemo(() => ({ ...defaultMarkdownEditorLabels, ...labelsProp }), [labelsProp]);
  const toolbarItems = toolbar === false ? [] : toolbar === true ? markdownEditorToolbarGroups.flat() : toolbar;
  const showToolbar = toolbarItems.length > 0;

  // Compact arrangement for narrow frames (measured after mounting; 0 = hidden, not measured yet).
  const frameRef = useRef<HTMLDivElement>(null);
  const frameWidth = useElementWidth(frameRef);
  const compact = frameWidth !== undefined && frameWidth > 0 && frameWidth < MARKDOWN_EDITOR_COMPACT_WIDTH;

  const [innerValue, setInnerValue] = useState(defaultValue ?? "");
  const controlled = value !== undefined;
  const source = controlled ? value : innerValue;
  const deferredSource = useDeferredValue(source);

  const [tab, setTab] = useState<"write" | "preview">(defaultTab);
  const [previewHeight, setPreviewHeight] = useState<number | undefined>(undefined);
  const writePanelRef = useRef<HTMLDivElement>(null);

  const editorRef = useRef<CodeEditorHandle>(null);
  const getView = () => editorRef.current?.view ?? null;
  useImperativeHandle(
    ref,
    () => ({
      get view() {
        return editorRef.current?.view ?? null;
      },
      focus() {
        editorRef.current?.focus();
      },
    }),
    [],
  );

  // The CodeEditor document is the source of truth while typing; the `value` prop is applied only when it
  // is a real outside change. Values we emitted can come back late (React renders after the next keystroke),
  // so every pending emission counts as an echo — re-applying a stale one would drop typed characters.
  const pendingEchoes = useRef<string[]>([]);
  const applyingExternal = useRef(false);

  const handleChange = (next: string) => {
    if (applyingExternal.current) return;
    if (controlled) {
      pendingEchoes.current.push(next);
      if (pendingEchoes.current.length > 50) pendingEchoes.current.shift();
    } else {
      setInnerValue(next);
    }
    onValueChange?.(next);
  };

  useEffect(() => {
    if (value === undefined) return;
    const echo = pendingEchoes.current.indexOf(value);
    if (echo !== -1) {
      pendingEchoes.current.splice(0, echo + 1);
      return;
    }
    pendingEchoes.current = [];
    const view = editorRef.current?.view;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    applyingExternal.current = true;
    try {
      view.dispatch({ changes: minimalChange(current, value) });
    } finally {
      applyingExternal.current = false;
    }
  }, [value]);

  const userExtensions = editorProps?.extensions;
  const extensions = useMemo(() => [formattingKeymap, ...(userExtensions ?? [])], [userExtensions]);

  const editor = (
    <CodeEditor
      ref={editorRef}
      language="markdown"
      wrap
      lineNumbers={lineNumbers}
      aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? labels.editor)}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      id={id}
      {...editorProps}
      className={cn(innerEditorClassName, editorProps?.className)}
      extensions={extensions}
      defaultValue={source}
      onValueChange={handleChange}
      readOnly={readOnly}
      placeholder={placeholder}
      minHeight={minHeight}
      maxHeight={maxHeight}
    />
  );

  // The preview scrolls in a preUI ScrollArea; min/max height sit on its root, the viewport fills it.
  const preview = (style?: CSSProperties, extraClassName?: string) => (
    <ScrollArea
      data-slot="markdown-editor-preview"
      // contain: wide tables / code lines (their own horizontal scroll areas) must not widen the preview
      // or the frame through their min-content width.
      className={cn(
        "min-w-0 [contain:inline-size] supports-[not_(contain:inline-size)]:w-0 supports-[not_(contain:inline-size)]:min-w-full",
        extraClassName,
      )}
      style={{ minHeight: cssSize(minHeight), maxHeight: cssSize(maxHeight), ...style }}
      // Wide tables / code blocks scroll in their own areas; the preview content follows the viewport width.
      contentClassName="!min-w-0"
    >
      {deferredSource.trim() ? (
        <Markdown {...previewProps} className={cn("px-3 py-3", previewProps?.className)}>
          {deferredSource}
        </Markdown>
      ) : (
        <p data-slot="markdown-editor-empty" className="px-3 py-3 text-sm text-pui-muted-foreground">
          {labels.emptyPreview}
        </p>
      )}
    </ScrollArea>
  );

  const toolbarNode = showToolbar ? (
    compact ? (
      // Narrow frame: one line that scrolls sideways instead of wrapping around the tabs.
      <ScrollArea orientation="horizontal" reserveTrack={false} data-slot="markdown-editor-toolbar-scroll" className="min-w-0 flex-1">
        <MarkdownToolbar
          items={toolbarItems}
          labels={labels}
          disabled={readOnly}
          getView={getView}
          className="w-max flex-nowrap px-1 py-1"
        />
      </ScrollArea>
    ) : (
      <MarkdownToolbar items={toolbarItems} labels={labels} disabled={readOnly} getView={getView} />
    )
  ) : null;

  const eyebrow = "text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground";
  const headerClassName = "flex min-h-10 items-center border-b border-pui-border rounded-t-[inherit]";

  let body: ReactElement;
  if (layout === "tabs") {
    body = (
      <Tabs
        value={tab}
        onValueChange={(next) => {
          if (next === "preview" && writePanelRef.current) {
            // Keep the frame height when switching, so the page doesn't jump.
            setPreviewHeight(writePanelRef.current.offsetHeight || undefined);
          }
          setTab(next as "write" | "preview");
        }}
        className="min-h-0 flex-1 gap-0"
      >
        <div data-slot="markdown-editor-header" className={cn(headerClassName, "justify-between gap-2 pl-1 pr-1")}>
          <TabsList className="self-stretch border-b-0">
            <TabsTrigger value="write" className="pb-2 pt-2.5">
              {labels.write}
            </TabsTrigger>
            <TabsTrigger value="preview" className="pb-2 pt-2.5">
              {labels.preview}
            </TabsTrigger>
          </TabsList>
          {!compact && tab === "write" && toolbarNode && <div className="py-1">{toolbarNode}</div>}
        </div>
        {compact && tab === "write" && toolbarNode && (
          <div data-slot="markdown-editor-toolbar-row" className="flex min-w-0 border-b border-pui-border">
            {toolbarNode}
          </div>
        )}
        <TabsContent value="write" keepMounted ref={writePanelRef} className="grid focus-visible:ring-0 [&[hidden]]:hidden">
          {editor}
        </TabsContent>
        <TabsContent value="preview" className="focus-visible:ring-inset">
          {preview(previewHeight ? { minHeight: previewHeight } : undefined)}
        </TabsContent>
      </Tabs>
    );
  } else if (layout === "split" && compact) {
    // Narrow frame: toolbar, editor, then the preview below it.
    body = (
      <>
        <div data-slot="markdown-editor-header" className={cn(headerClassName, "min-w-0")}>
          {toolbarNode ?? (
            <span data-slot="markdown-editor-label" className={cn(eyebrow, "px-3")}>
              {labels.write}
            </span>
          )}
        </div>
        <div data-slot="markdown-editor-body" className="grid min-h-0 flex-1 grid-cols-1">
          {editor}
          <div className="flex min-h-10 items-center border-y border-pui-border px-3">
            <span data-slot="markdown-editor-label" className={eyebrow}>
              {labels.preview}
            </span>
          </div>
          {preview()}
        </div>
      </>
    );
  } else if (layout === "split") {
    body = (
      <>
        <div data-slot="markdown-editor-header" className={cn(headerClassName, "grid grid-cols-2 items-stretch")}>
          <div className="flex min-w-0 items-center px-1 py-1">
            {toolbarNode ?? <span data-slot="markdown-editor-label" className={cn(eyebrow, "px-2")}>
                {labels.write}
              </span>}
          </div>
          <div className="flex min-w-0 items-center border-l border-pui-border px-3">
            <span data-slot="markdown-editor-label" className={eyebrow}>
              {labels.preview}
            </span>
          </div>
        </div>
        <div data-slot="markdown-editor-body" className="grid min-h-0 flex-1 grid-cols-2">
          {editor}
          {preview(undefined, "border-l border-pui-border")}
        </div>
      </>
    );
  } else {
    body = (
      <>
        {toolbarNode && (
          <div data-slot="markdown-editor-header" className={cn(headerClassName, "px-1 py-1")}>
            {toolbarNode}
          </div>
        )}
        <div data-slot="markdown-editor-body" className="grid min-h-0 flex-1">
          {editor}
        </div>
      </>
    );
  }

  return (
    <div
      ref={frameRef}
      data-slot="markdown-editor"
      data-layout={layout}
      data-compact={compact || undefined}
      data-readonly={readOnly || undefined}
      className={cn(
        "flex w-full min-w-0 flex-col rounded-pui-md border border-pui-input bg-pui-background text-pui-foreground",
        "transition-colors duration-pui-fast ease-pui focus-within:border-pui-ring",
        "data-[readonly]:border-pui-border data-[readonly]:focus-within:border-pui-border",
        className,
      )}
      {...props}
    >
      {body}
    </div>
  );
});
