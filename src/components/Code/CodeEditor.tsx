import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab, redo } from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter as foldGutterExtension,
  foldKeymap,
  indentOnInput,
  indentUnit,
  LanguageDescription,
  syntaxHighlighting,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { highlightSelectionMatches, search, searchKeymap } from "@codemirror/search";
import { Annotation, Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers as lineNumbersExtension,
  panels,
  placeholder as placeholderExtension,
  rectangularSelection,
  tooltips,
  ViewPlugin,
} from "@codemirror/view";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import { cn } from "../../utils/cn";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import { defaultEditorPhrases, preuiEditorTheme, preuiHighlightStyle } from "./editor-theme";
import { outsideClickGuard } from "./outside-click-guard";

export interface CodeEditorHandle {
  /** The CodeMirror view (`null` before mount / after unmount). */
  readonly view: EditorView | null;
  /** Focuses the editor. */
  focus(): void;
}

export interface CodeEditorProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children" | "defaultValue" | "onChange" | "placeholder"> {
  /** Controlled document. */
  value?: string;
  /** Initial document when uncontrolled. */
  defaultValue?: string;
  /** Called with the full document after every user edit. */
  onValueChange?: (value: string) => void;
  /**
   * Language name, alias or file extension (`typescript`, `ts`, `tsx`, `lua`, `json`, `css`, `html`, `sql`, `markdown` …),
   * resolved lazily via `@codemirror/language-data`. Unknown names → plain text.
   */
  language?: string;
  /** Resolve the language from a file name instead (`config.lua`, `App.tsx`). Used when `language` doesn't match. */
  filename?: string;
  /** Prevents edits (selection, search and copy still work). */
  readOnly?: boolean;
  /** Shows the line-number gutter. Default `true`. */
  lineNumbers?: boolean;
  /** Shows the fold gutter. Default `false`. */
  foldGutter?: boolean;
  /** Text shown while the document is empty. */
  placeholder?: string;
  /** Indentation width in spaces. Default `2`. */
  tabSize?: number;
  /** Wraps long lines instead of scrolling horizontally. */
  wrap?: boolean;
  /** Minimum editor height (number = px). */
  minHeight?: number | string;
  /** Maximum editor height (number = px); the content scrolls inside a preUI `ScrollArea`. */
  maxHeight?: number | string;
  /** Focuses the editor after mount. */
  autoFocus?: boolean;
  /** Additional CodeMirror extensions (reconfigured when the array identity changes). */
  extensions?: Extension[];
  /** Called once with the view after it was created. */
  onMount?: (view: EditorView) => void;
  /**
   * Translations for CodeMirror's UI strings (search panel: `Find`, `Replace`, `next`, `previous`, `all`,
   * `match case`, `regexp`, `by word`, `replace`, `replace all`, `close` …), merged over English defaults.
   */
  phrases?: Record<string, string>;
}

/** Marks transactions that apply the controlled `value`, so they don't call `onValueChange`. */
const External = Annotation.define<boolean>();

const cssSize = (value: number | string | undefined) => (typeof value === "number" ? `${value}px` : value);

const languageCache = new Map<string, LanguageDescription | null>();

/** Finds a language description by name/alias, then extension, then file name. */
export function findLanguage(language?: string, filename?: string): LanguageDescription | null {
  const key = `${language ?? ""}|${filename ?? ""}`;
  if (languageCache.has(key)) return languageCache.get(key)!;
  let description: LanguageDescription | null = null;
  const name = language?.trim();
  if (name) {
    description =
      LanguageDescription.matchLanguageName(languages, name, false) ??
      LanguageDescription.matchFilename(languages, `file.${name}`) ??
      LanguageDescription.matchFilename(languages, name);
  }
  if (!description && filename) description = LanguageDescription.matchFilename(languages, filename);
  languageCache.set(key, description);
  return description;
}

/** Minimum height on content and gutters (the maximum lives on the scroll frame, see `maxHeight`). */
function sizeTheme(minHeight?: number | string): Extension {
  const min = cssSize(minHeight);
  if (!min) return [];
  return EditorView.theme({ ".cm-content, .cm-gutter": { minHeight: `calc(${min} - 2px)` } });
}

function tabSizeExtension(size: number): Extension {
  return [EditorState.tabSize.of(size), indentUnit.of(" ".repeat(size))];
}

function readOnlyExtension(readOnly: boolean): Extension {
  return EditorState.readOnly.of(readOnly);
}

/** Fold marker drawn with CSS (a chevron made of two borders) instead of a unicode glyph. */
function foldMarker(open: boolean): HTMLElement {
  const marker = document.createElement("span");
  marker.className = "cm-pui-foldMarker";
  marker.dataset.open = String(open);
  return marker;
}

function gutterExtension(lineNumbers: boolean, fold: boolean): Extension {
  return [
    lineNumbers ? [lineNumbersExtension(), highlightActiveLineGutter()] : [],
    fold ? foldGutterExtension({ markerDOM: foldMarker }) : [],
  ];
}

function ariaExtension(label?: string, labelledBy?: string, describedBy?: string): Extension {
  const attributes: Record<string, string> = {};
  if (label) attributes["aria-label"] = label;
  if (labelledBy) attributes["aria-labelledby"] = labelledBy;
  if (describedBy) attributes["aria-describedby"] = describedBy;
  return EditorView.contentAttributes.of(attributes);
}

/**
 * CodeMirror hides tooltips whose anchor leaves its own scroller — which never scrolls here, it grows inside
 * the ScrollArea. So while the cursor is scrolled out of the ScrollArea viewport, the root gets
 * `data-cursor-offscreen`, which hides the cursor-bound tooltips (autocomplete and its info panel).
 */
function offscreenCursorGuard(viewport: HTMLElement, root: HTMLElement): Extension {
  return ViewPlugin.define((view) => {
    const measure = {
      key: "pui-cursor-offscreen",
      read: () => {
        const coords = view.coordsAtPos(view.state.selection.main.head);
        const rect = viewport.getBoundingClientRect();
        return (
          !coords ||
          coords.bottom < rect.top + 1 ||
          coords.top > rect.bottom - 1 ||
          coords.right < rect.left ||
          coords.left > rect.right
        );
      },
      write: (hidden: boolean) => {
        root.toggleAttribute("data-cursor-offscreen", hidden);
      },
    };
    const onScroll = () => view.requestMeasure(measure);
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return {
      update(update) {
        if (update.selectionSet || update.docChanged || update.geometryChanged) view.requestMeasure(measure);
      },
      destroy() {
        viewport.removeEventListener("scroll", onScroll);
        root.removeAttribute("data-cursor-offscreen");
      },
    };
  });
}

/** Applies `next` to the view as a minimal change (common prefix/suffix kept), so the cursor doesn't jump. */
function applyExternalValue(view: EditorView, next: string) {
  const current = view.state.doc.toString();
  if (current === next) return;
  let start = 0;
  const maxStart = Math.min(current.length, next.length);
  while (start < maxStart && current.charCodeAt(start) === next.charCodeAt(start)) start++;
  let endCurrent = current.length;
  let endNext = next.length;
  while (endCurrent > start && endNext > start && current.charCodeAt(endCurrent - 1) === next.charCodeAt(endNext - 1)) {
    endCurrent--;
    endNext--;
  }
  view.dispatch({
    changes: { from: start, to: endCurrent, insert: next.slice(start, endNext) },
    annotations: [External.of(true)],
  });
}

/**
 * Code editor built on CodeMirror 6: history, search, bracket matching, auto-closing brackets,
 * language-provided autocompletion and lazily loaded languages, styled with preUI tokens.
 * Works controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`).
 */
export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  {
    value,
    defaultValue,
    onValueChange,
    language,
    filename,
    readOnly = false,
    lineNumbers = true,
    foldGutter = false,
    placeholder,
    tabSize = 2,
    wrap = false,
    minHeight,
    maxHeight,
    autoFocus = false,
    extensions,
    onMount,
    phrases,
    className,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    ...props
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const bottomPanelsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [compartments] = useState(() => ({
    language: new Compartment(),
    readOnly: new Compartment(),
    gutters: new Compartment(),
    placeholder: new Compartment(),
    tabSize: new Compartment(),
    wrap: new Compartment(),
    size: new Compartment(),
    aria: new Compartment(),
    phrases: new Compartment(),
    user: new Compartment(),
  }));

  // Latest props for the one-time setup and the update listener.
  const latest = useRef({ onValueChange, onMount, value, defaultValue });
  // Values this editor reported via onValueChange that the parent hasn't echoed back yet. A late echo
  // (React rendering after the next keystroke) must not overwrite what was typed in the meantime.
  const pendingEchoes = useRef<string[]>([]);
  latest.current = { onValueChange, onMount, value, defaultValue };
  const initial = useRef({} as {
    readOnly: boolean;
    lineNumbers: boolean;
    foldGutter: boolean;
    placeholder?: string;
    tabSize: number;
    wrap: boolean;
    minHeight?: number | string;
    ariaLabel?: string;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
    extensions?: Extension[];
    autoFocus: boolean;
    phrases?: Record<string, string>;
  });
  // Always the latest options, so a re-created view (StrictMode) starts from the current props.
  initial.current = {
    readOnly,
    lineNumbers,
    foldGutter,
    placeholder,
    tabSize,
    wrap,
    minHeight,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    extensions,
    autoFocus,
    phrases,
  };

  useImperativeHandle(
    ref,
    () => ({
      get view() {
        return viewRef.current;
      },
      focus() {
        viewRef.current?.focus();
      },
    }),
    [],
  );

  // Create the view once; destroy it on unmount.
  useEffect(() => {
    const parent = containerRef.current;
    const root = rootRef.current;
    const topContainer = panelsRef.current;
    const bottomContainer = bottomPanelsRef.current;
    const viewport = viewportRef.current;
    if (!parent || !root || !topContainer || !bottomContainer || !viewport) return;
    const init = initial.current;
    const doc = latest.current.value ?? latest.current.defaultValue ?? "";

    const state = EditorState.create({
      doc,
      extensions: [
        compartments.gutters.of(gutterExtension(init.lineNumbers, init.foldGutter)),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(preuiHighlightStyle),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ icons: false }),
        rectangularSelection(),
        crosshairCursor(),
        outsideClickGuard,
        highlightActiveLine(),
        highlightSelectionMatches(),
        search({ top: true }),
        // The editor grows with its content inside a preUI ScrollArea: panels (search on top, dialogs such
        // as "go to line" at the bottom) sit above/below the scroll viewport, tooltips (autocomplete) outside
        // it, so none of them scrolls away or gets clipped.
        panels({ topContainer, bottomContainer }),
        tooltips({ parent: root }),
        offscreenCursorGuard(viewport, root),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          // Ctrl+Shift+Z redoes on every platform (CodeMirror only maps it on macOS/Linux).
          { key: "Mod-Shift-z", run: redo, preventDefault: true },
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        compartments.language.of([]),
        compartments.readOnly.of(readOnlyExtension(init.readOnly)),
        compartments.placeholder.of(init.placeholder ? placeholderExtension(init.placeholder) : []),
        compartments.tabSize.of(tabSizeExtension(init.tabSize)),
        compartments.wrap.of(init.wrap ? EditorView.lineWrapping : []),
        compartments.size.of(sizeTheme(init.minHeight)),
        compartments.aria.of(ariaExtension(init.ariaLabel, init.ariaLabelledBy, init.ariaDescribedBy)),
        compartments.phrases.of(EditorState.phrases.of({ ...defaultEditorPhrases, ...init.phrases })),
        preuiEditorTheme,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          if (update.transactions.every((tr) => tr.annotation(External))) return;
          const next = update.state.doc.toString();
          if (latest.current.onValueChange) {
            pendingEchoes.current.push(next);
            if (pendingEchoes.current.length > 100) pendingEchoes.current.shift();
          }
          latest.current.onValueChange?.(next);
        }),
        compartments.user.of(init.extensions ?? []),
      ],
    });

    const view = new EditorView({ state, parent });
    viewRef.current = view;
    latest.current.onMount?.(view);
    if (init.autoFocus) view.focus();

    return () => {
      view.destroy();
      if (viewRef.current === view) viewRef.current = null;
    };
  }, [compartments]);

  // Controlled value: echoes of our own changes (even late ones) are ignored; only real external
  // changes are applied, and only when they differ from the document.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || value === undefined) return;
    const echo = pendingEchoes.current.indexOf(value);
    if (echo !== -1) {
      pendingEchoes.current.splice(0, echo + 1);
      return;
    }
    pendingEchoes.current = [];
    applyExternalValue(view, value);
  }, [value]);

  // Language: resolve and load lazily, then swap the compartment. Stale loads are ignored.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const description = findLanguage(language, filename);
    if (!description) {
      view.dispatch({ effects: compartments.language.reconfigure([]) });
      return;
    }
    if (description.support) {
      view.dispatch({ effects: compartments.language.reconfigure(description.support) });
      return;
    }
    let cancelled = false;
    description.load().then(
      (support) => {
        if (!cancelled && viewRef.current === view) {
          view.dispatch({ effects: compartments.language.reconfigure(support) });
        }
      },
      () => {
        // Loading failed (offline chunk etc.): keep plain text.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [language, filename, compartments]);

  // Reconfigure the remaining options when they change (skipped on the first run by comparing with the initial values).
  const reconfigure = (compartment: Compartment, extension: Extension) => {
    viewRef.current?.dispatch({ effects: compartment.reconfigure(extension) });
  };
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) reconfigure(compartments.readOnly, readOnlyExtension(readOnly));
  }, [readOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mounted.current) reconfigure(compartments.gutters, gutterExtension(lineNumbers, foldGutter));
  }, [lineNumbers, foldGutter]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mounted.current) reconfigure(compartments.placeholder, placeholder ? placeholderExtension(placeholder) : []);
  }, [placeholder]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mounted.current) reconfigure(compartments.tabSize, tabSizeExtension(tabSize));
  }, [tabSize]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mounted.current) reconfigure(compartments.wrap, wrap ? EditorView.lineWrapping : []);
  }, [wrap]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mounted.current) reconfigure(compartments.size, sizeTheme(minHeight));
  }, [minHeight]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mounted.current) reconfigure(compartments.aria, ariaExtension(ariaLabel, ariaLabelledBy, ariaDescribedBy));
  }, [ariaLabel, ariaLabelledBy, ariaDescribedBy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mounted.current) {
      reconfigure(compartments.phrases, EditorState.phrases.of({ ...defaultEditorPhrases, ...phrases }));
    }
  }, [phrases]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mounted.current) reconfigure(compartments.user, extensions ?? []);
  }, [extensions]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const frameStyle: CSSProperties | undefined = maxHeight !== undefined ? { maxHeight: cssSize(maxHeight) } : undefined;

  return (
    <div
      ref={rootRef}
      data-slot="code-editor"
      data-readonly={readOnly || undefined}
      className={cn(
        "flex min-w-0 flex-col rounded-pui-md border border-pui-input bg-pui-background text-pui-foreground",
        "transition-colors duration-pui-fast ease-pui focus-within:border-pui-ring",
        "[&[data-cursor-offscreen]_:is(.cm-tooltip-autocomplete,.cm-completionInfo)]:invisible",
        className,
      )}
      {...props}
    >
      {/* Panels + scroll area share the max height, so opening the search panel doesn't grow the editor. */}
      <div
        data-slot="code-editor-frame"
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit]"
        style={frameStyle}
      >
        {/* CodeMirror mounts its top panels (search) here, bottom panels below the scroll area. */}
        <div ref={panelsRef} data-slot="code-editor-panels" className="shrink-0 empty:hidden" />
        <ScrollArea
          orientation={wrap ? "vertical" : "both"}
          // A fade would hide the caret at the right edge.
          edgeFade={false}
          reserveTrack={false}
          // Scroll containers still pass their content's min-content width up; long lines must not widen
          // whatever the editor sits in, so the scroll area's inline size comes only from the layout around it.
          // Chromium < 105 (CEF / FiveM) lacks contain: inline-size: width 0 + min-width 100% has the same effect.
          className="min-h-0 flex-1 [contain:inline-size] supports-[not_(contain:inline-size)]:w-0 supports-[not_(contain:inline-size)]:min-w-full"
          // The editor content is the focus target; the viewport needn't be a tab stop of its own.
          viewportRef={viewportRef}
          viewportProps={{ tabIndex: -1 }}
          // Wrapped lines follow the viewport width instead of widening the content to the longest line.
          contentClassName={cn("grid min-h-full", wrap && "!min-w-0")}
        >
          {/* Without wrapping, the content's min-content is its widest line, so the ScrollArea content grows to it. */}
          <div ref={containerRef} data-slot="code-editor-content" className={cn("grid", wrap && "min-w-0")} />
        </ScrollArea>
        <div ref={bottomPanelsRef} data-slot="code-editor-panels" className="shrink-0 empty:hidden" />
      </div>
    </div>
  );
});
