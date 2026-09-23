import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";

export type ListNavigationOrientation = "vertical" | "horizontal" | "grid";
export type ListNavigationFocusMode = "activedescendant" | "roving";
export type ListNavigationKeyboardTarget = "list" | "window";
export type ListNavigationRole = "listbox" | "menu";
/** What changed the active index: a key, the mouse, or code (`setActiveIndex`). */
export type ListNavigationSource = "keyboard" | "pointer" | "programmatic";

export interface ListNavigationKeys {
  /** Keys that call `onSelect` for the active item. Default `["Enter", " "]`. */
  select?: string[];
  /**
   * Keys that call `onBack`. Default `["Backspace", "ArrowLeft"]` for a vertical list, `["Backspace"]` otherwise
   * (there ←/→ move).
   */
  back?: string[];
  /** Keys that call `onClose`. Default `["Escape"]`. */
  close?: string[];
}

export interface UseListNavigationOptions {
  /** Number of items. */
  count: number;
  /** Controlled active (highlighted) index; `-1` = none. */
  activeIndex?: number;
  /** Initial active index when uncontrolled. Default: the first enabled item (`-1` when there is none). */
  defaultActiveIndex?: number;
  onActiveIndexChange?: (index: number, source: ListNavigationSource) => void;
  /** Marks items as disabled: they never call `onSelect`. */
  isDisabled?: (index: number) => boolean;
  /**
   * `true` (default): arrow keys, Home/End, typeahead and hover skip disabled items.
   * `false`: disabled items can be highlighted (e.g. so a "why not" description can be read) but not selected.
   */
  skipDisabled?: boolean;
  /** Wrap from the last item to the first and back. Default `true`. */
  loop?: boolean;
  /** `"vertical"` (default): ↑/↓. `"horizontal"`: ←/→. `"grid"`: all four arrows, with `columns`. */
  orientation?: ListNavigationOrientation;
  /** Items per row for `orientation="grid"`. Default `1`. */
  columns?: number;
  /** Items PageUp/PageDown jump over. Default `10`. */
  pageSize?: number;
  /** Enter/Space (or a click) on an enabled item. */
  onSelect?: (index: number) => void;
  /** Backspace (and ← in a vertical list). Keys are only handled (and default-prevented) when this is set. */
  onBack?: () => void;
  /** Escape. Only handled when set. */
  onClose?: () => void;
  /** Override the default key bindings for select / back / close. */
  keys?: ListNavigationKeys;
  /**
   * `"activedescendant"` (default): the list element keeps DOM focus and points at the active item via
   * `aria-activedescendant`. `"roving"`: the active item gets `tabIndex=0` and DOM focus follows it.
   */
  focusMode?: ListNavigationFocusMode;
  /**
   * `"list"` (default): keys are handled by the list element (`onKeyDown` from `getListProps`), so it needs focus.
   * `"window"`: keys are handled on `window` while `enabled` — for FiveM NUI, where the list usually has no focus.
   * Keys typed into inputs, textareas and contenteditable elements are ignored in window mode.
   */
  keyboardTarget?: ListNavigationKeyboardTarget;
  /** `false` stops all key handling (e.g. while a sub-dialog is open). Default `true`. */
  enabled?: boolean;
  /**
   * Keeps the active item visible when it changes by keyboard or code (`scrollIntoView`, `block: "nearest"`).
   * `true` (default), `false`, or your own `ScrollIntoViewOptions`. Hover never scrolls.
   */
  scrollIntoView?: boolean | ScrollIntoViewOptions;
  /**
   * Typeahead: return the item's label and typing letters jumps to the next item starting with them.
   * Off when not given.
   */
  typeahead?: (index: number) => string | undefined;
  /** ARIA role of the list: `"listbox"` (default, items `option`) or `"menu"` (items `menuitem`). */
  role?: ListNavigationRole;
  /** Prefix for the item ids (`${id}-item-${index}`). Default: a `useId()` value. */
  id?: string;
}

type AnyProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> } & Record<string, unknown>;

export interface ListNavigationListProps extends Record<string, unknown> {
  ref: (element: HTMLElement | null) => void;
  id: string;
  role: ListNavigationRole;
  tabIndex?: number;
  "aria-activedescendant"?: string;
  "aria-orientation"?: "vertical" | "horizontal";
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

export interface ListNavigationItemProps extends Record<string, unknown> {
  id: string;
  role: "option" | "menuitem";
  tabIndex?: number;
  "aria-disabled"?: true;
  "data-highlighted"?: "";
  "data-disabled"?: "";
  "data-index": number;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onClick: (event: ReactMouseEvent<HTMLElement>) => void;
}

export interface UseListNavigationReturn {
  /** The active (highlighted) index, `-1` when none. */
  activeIndex: number;
  setActiveIndex: (index: number, source?: ListNavigationSource) => void;
  /** Props for the list element. Pass your own props to merge them (handlers of both run, yours first). */
  getListProps: <P extends Record<string, unknown> = AnyProps>(props?: P) => P & ListNavigationListProps;
  /** Props for the item at `index`. Pass your own props to merge them. */
  getItemProps: <P extends Record<string, unknown> = AnyProps>(index: number, props?: P) => P & ListNavigationItemProps;
  /** The DOM id of the item at `index`. */
  getItemId: (index: number) => string;
  /** Handles a key as the list would (for custom listeners). Returns `true` when the key was used. */
  handleKey: (event: KeyboardEvent | ReactKeyboardEvent) => boolean;
}

const TYPEAHEAD_TIMEOUT = 500;

function isEditable(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== "function") return false;
  const element = target as HTMLElement;
  if (element.isContentEditable) return true;
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (element as HTMLInputElement).type;
    return !["button", "checkbox", "radio", "range", "reset", "submit", "color", "file", "image"].includes(type);
  }
  return false;
}

function chain<E>(user: unknown, own: (event: E) => void) {
  return (event: E) => {
    if (typeof user === "function") (user as (event: E) => void)(event);
    own(event);
  };
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref && typeof ref === "object") (ref as { current: T | null }).current = value;
}

/**
 * Headless keyboard + mouse navigation for a list of items: highlight index, disabled skipping, wrap, Home/End,
 * PageUp/PageDown, Enter/Space → `onSelect`, Backspace → `onBack`, Escape → `onClose`, typeahead, hover that
 * doesn't fight the keyboard (pointer*move*), scroll into view and ARIA (`aria-activedescendant` or roving tabindex).
 * `keyboardTarget: "window"` listens on `window` — for FiveM NUI, where the list usually has no focus.
 */
export function useListNavigation(options: UseListNavigationOptions): UseListNavigationReturn {
  const {
    count,
    activeIndex: activeIndexProp,
    defaultActiveIndex,
    isDisabled,
    skipDisabled = true,
    orientation = "vertical",
    focusMode = "activedescendant",
    keyboardTarget = "list",
    enabled = true,
    role = "listbox",
    id: idProp,
  } = options;

  const generatedId = useId();
  const baseId = idProp ?? `pui-list-${generatedId.replace(/:/g, "")}`;

  const [uncontrolled, setUncontrolled] = useState<number>(() => {
    if (defaultActiveIndex !== undefined) return defaultActiveIndex;
    for (let index = 0; index < count; index++) if (!isDisabled?.(index) || !skipDisabled) return index;
    return -1;
  });
  const controlled = activeIndexProp !== undefined;
  const rawActive = controlled ? activeIndexProp : uncontrolled;
  const activeIndex = count <= 0 ? -1 : Math.min(rawActive, count - 1);

  // Latest values for the window listener and stable callbacks.
  const latest = useRef({ options, activeIndex, controlled });
  latest.current = { options, activeIndex, controlled };

  const listElement = useRef<HTMLElement | null>(null);
  // Starts as "programmatic" so the initial item is scrolled into view on mount (e.g. a restored highlight).
  const lastSource = useRef<ListNavigationSource | null>("programmatic");
  const typeahead = useRef({ text: "", time: 0 });
  // A keyboard select on a native button would be followed by the browser's own click (Space on keyup).
  const suppressKeyboardClick = useRef(false);

  const getItemId = useCallback((index: number) => `${baseId}-item-${index}`, [baseId]);

  const setActiveIndex = useCallback((index: number, source: ListNavigationSource = "programmatic") => {
    const { options: current, activeIndex: previous, controlled: isControlled } = latest.current;
    lastSource.current = source;
    if (index === previous) return;
    if (!isControlled) setUncontrolled(index);
    current.onActiveIndexChange?.(index, source);
  }, []);

  const handleKey = useCallback(
    (event: KeyboardEvent | ReactKeyboardEvent): boolean => {
      const { options: current, activeIndex: active } = latest.current;
      const {
        count: total,
        isDisabled: disabledAt,
        skipDisabled: skip = true,
        loop = true,
        orientation: direction = "vertical",
        columns: columnsOption = 1,
        pageSize = 10,
        keys = {},
      } = current;
      const native = "nativeEvent" in event ? event.nativeEvent : event;
      if (current.enabled === false || native.isComposing) return false;
      const { key } = event;
      const disabled = (index: number) => Boolean(disabledAt?.(index));
      const reachable = (index: number) => !skip || !disabled(index);
      const columns = direction === "grid" ? Math.max(1, Math.floor(columnsOption)) : 1;

      const move = (index: number) => {
        if (index >= 0 && index !== active) setActiveIndex(index, "keyboard");
      };

      /** Walks `step` at a time from `from`, wrapping when `loop`; returns the first reachable index or -1. */
      const walk = (from: number, step: number, wrap: boolean) => {
        let index = from;
        for (let tries = 0; tries < total; tries++) {
          index += step;
          if (index < 0 || index >= total) {
            if (!wrap) return -1;
            if (Math.abs(step) === 1) index = (index + total) % total;
            else {
              // Grid rows: wrap within the same column.
              const column = ((from % columns) + columns) % columns;
              index = step > 0 ? column : column + Math.floor((total - 1 - column) / columns) * columns;
            }
          }
          if (reachable(index)) return index;
        }
        return -1;
      };
      const first = () => walk(-1, 1, false);
      const last = () => walk(total, -1, false);

      const modifier = event.ctrlKey || event.metaKey || event.altKey;
      const selectKeys = keys.select ?? ["Enter", " "];
      const backKeys = keys.back ?? (direction === "vertical" ? ["Backspace", "ArrowLeft"] : ["Backspace"]);
      const closeKeys = keys.close ?? ["Escape"];

      // Typeahead gets Space while a search is running, so "Motor starten" can be typed.
      const now = Date.now();
      if (now - typeahead.current.time > TYPEAHEAD_TIMEOUT) typeahead.current.text = "";
      const typing = current.typeahead && key.length === 1 && !modifier && (key !== " " || typeahead.current.text !== "");

      if (!typing && total > 0 && !modifier) {
        const prev = direction === "horizontal" ? "ArrowLeft" : "ArrowUp";
        const next = direction === "horizontal" ? "ArrowRight" : "ArrowDown";
        if (key === next || key === prev) {
          const step = (key === next ? 1 : -1) * columns;
          const target = active < 0 ? (key === next ? first() : last()) : walk(active, step, loop);
          move(target);
          event.preventDefault();
          return true;
        }
        if (direction === "grid" && (key === "ArrowLeft" || key === "ArrowRight")) {
          const target = active < 0 ? first() : walk(active, key === "ArrowRight" ? 1 : -1, loop);
          move(target);
          event.preventDefault();
          return true;
        }
        if (key === "Home" || key === "End") {
          move(key === "Home" ? first() : last());
          event.preventDefault();
          return true;
        }
        if (key === "PageUp" || key === "PageDown") {
          const down = key === "PageDown";
          const base = active < 0 ? (down ? 0 : total - 1) : active;
          const goal = Math.max(0, Math.min(total - 1, base + (down ? pageSize : -pageSize)));
          // Nearest reachable item at the goal, looking back towards where we came from.
          let target = reachable(goal) ? goal : walk(goal, down ? -1 : 1, false);
          if (target < 0 || (down ? target < base : target > base)) target = active;
          move(target);
          event.preventDefault();
          return true;
        }
      }

      if (!typing && current.onSelect && selectKeys.includes(key) && !modifier) {
        event.preventDefault();
        if (active >= 0 && !disabled(active)) {
          suppressKeyboardClick.current = true;
          current.onSelect?.(active);
        }
        return true;
      }
      if (!typing && current.onBack && backKeys.includes(key) && !modifier) {
        event.preventDefault();
        current.onBack();
        return true;
      }
      if (!typing && current.onClose && closeKeys.includes(key)) {
        event.preventDefault();
        current.onClose();
        return true;
      }

      if (typing && current.typeahead && total > 0) {
        const text = typeahead.current.text + key.toLowerCase();
        typeahead.current = { text, time: now };
        // A repeated single letter cycles through the matches; a longer search starts at the active item.
        const repeated = text.length > 1 && text.split("").every((char) => char === text[0]);
        const search = repeated ? text[0] : text;
        const from = text.length === 1 || repeated ? active : active - 1;
        for (let offset = 1; offset <= total; offset++) {
          const index = (((from + offset) % total) + total) % total;
          if (!reachable(index)) continue;
          const label = current.typeahead(index);
          if (label && label.trim().toLowerCase().startsWith(search)) {
            move(index);
            break;
          }
        }
        event.preventDefault();
        return true;
      }
      return false;
    },
    [setActiveIndex],
  );

  // Window mode: FiveM NUI has no focused element most of the time.
  useEffect(() => {
    if (keyboardTarget !== "window" || !enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isEditable(event.target)) return;
      suppressKeyboardClick.current = false;
      handleKey(event);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardTarget, enabled, handleKey]);

  const findItem = useCallback(
    (index: number) => {
      const root = listElement.current;
      const doc = root?.ownerDocument ?? (typeof document === "undefined" ? undefined : document);
      return (doc?.getElementById(getItemId(index)) as HTMLElement | null) ?? null;
    },
    [getItemId],
  );

  // Scroll into view (keyboard / code only) and move focus in roving mode.
  const scrollOption = options.scrollIntoView ?? true;
  useEffect(() => {
    const source = lastSource.current;
    if (source === null) return;
    if (source === "pointer") {
      lastSource.current = null;
      return;
    }
    // No item rendered yet (e.g. items that register after the first render): keep the request for later.
    const item = activeIndex < 0 ? null : findItem(activeIndex);
    if (!item) return;
    lastSource.current = null;
    if (focusMode === "roving") {
      const root = listElement.current;
      const active = item.ownerDocument.activeElement;
      if (root && active && root.contains(active) && active !== item) item.focus({ preventScroll: true });
    }
    if (scrollOption !== false && typeof item.scrollIntoView === "function") {
      item.scrollIntoView(scrollOption === true ? { block: "nearest", inline: "nearest" } : scrollOption);
    }
  });

  const listRef = useRef<Ref<HTMLElement> | undefined>(undefined);
  const setListElement = useCallback((element: HTMLElement | null) => {
    listElement.current = element;
    assignRef(listRef.current, element);
  }, []);

  const getListProps = useCallback(
    <P extends Record<string, unknown>>(props?: P) => {
      const user = (props ?? {}) as Record<string, unknown>;
      listRef.current = user.ref as Ref<HTMLElement> | undefined;
      const result: Record<string, unknown> = {
        ...user,
        ref: setListElement,
        id: (user.id as string | undefined) ?? baseId,
        role: (user.role as ListNavigationRole | undefined) ?? role,
      };
      if (orientation !== "grid") result["aria-orientation"] = orientation;
      if (focusMode === "activedescendant") {
        result.tabIndex = user.tabIndex ?? 0;
        result["aria-activedescendant"] = activeIndex >= 0 ? getItemId(activeIndex) : undefined;
      } else if (user.tabIndex === undefined) {
        result.tabIndex = -1;
      }
      if (keyboardTarget === "list") {
        result.onKeyDown = chain<ReactKeyboardEvent<HTMLElement>>(user.onKeyDown, (event) => {
          if (event.defaultPrevented || !enabled) return;
          if (isEditable(event.target)) return;
          suppressKeyboardClick.current = false;
          handleKey(event);
        });
      }
      return result as P & ListNavigationListProps;
    },
    [activeIndex, baseId, enabled, focusMode, getItemId, handleKey, keyboardTarget, orientation, role, setListElement],
  );

  const getItemProps = useCallback(
    <P extends Record<string, unknown>>(index: number, props?: P) => {
      const user = (props ?? {}) as Record<string, unknown>;
      const disabledAt = latest.current.options.isDisabled;
      const disabled = Boolean(disabledAt?.(index));
      const highlighted = index === activeIndex;
      const result: Record<string, unknown> = {
        ...user,
        id: getItemId(index),
        role: (user.role as string | undefined) ?? (role === "menu" ? "menuitem" : "option"),
        "data-index": index,
        "data-highlighted": highlighted ? "" : undefined,
        "data-disabled": disabled ? "" : undefined,
        "aria-disabled": disabled ? true : undefined,
        onPointerMove: chain<ReactPointerEvent<HTMLElement>>(user.onPointerMove, () => {
          if (index === latest.current.activeIndex) return;
          if (disabled && latest.current.options.skipDisabled !== false) return;
          setActiveIndex(index, "pointer");
        }),
        onClick: chain<ReactMouseEvent<HTMLElement>>(user.onClick, (event) => {
          if (event.detail === 0 && suppressKeyboardClick.current) {
            suppressKeyboardClick.current = false;
            return;
          }
          if (disabled) return;
          setActiveIndex(index, "pointer");
          latest.current.options.onSelect?.(index);
        }),
      };
      if (focusMode === "roving") result.tabIndex = highlighted ? 0 : -1;
      return result as P & ListNavigationItemProps;
    },
    [activeIndex, focusMode, getItemId, role, setActiveIndex],
  );

  return { activeIndex, setActiveIndex, getListProps, getItemProps, getItemId, handleKey };
}
