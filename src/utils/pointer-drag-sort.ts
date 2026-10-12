// Reorder engine shared by SortableList and the DataTable row reorder: one vertical list of items, moved with the
// pointer (a see-through copy follows it, the other items slide to their new places) or the keyboard (Space/Enter
// lifts and drops, arrows / Home / End move, Escape cancels), with screen-reader announcements.
//
// Items are found in the DOM at event time: every `[data-sortable-id]` element whose closest `[data-sortable-list]`
// is the list. While a drag runs, each item reads its `transform` offset from the state (computed in the handlers,
// never during render).
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { autoScroll, createDragPreview, findScrollParent, startPointerDrag } from "./pointer-drag";

export interface SortLabels {
  /** Role description of an item that is its own handle (no `SortableItemHandle` inside). */
  item: string;
  /** Accessible name of a drag handle. */
  handle: string;
  /** How to move an item with the keyboard (read with the focused handle / item). */
  instructions: string;
  pickedUp: (position: number, total: number) => string;
  moving: (position: number, total: number) => string;
  dropped: (position: number, total: number) => string;
  cancelled: string;
}

export const defaultSortLabels: SortLabels = {
  item: "Sortable item",
  handle: "Drag to reorder",
  instructions:
    "Press Space or Enter to pick the item up. Move it with the arrow keys, press Space or Enter to drop it, Escape to cancel.",
  pickedUp: (position, total) => `Picked up, position ${position} of ${total}.`,
  moving: (position, total) => `Position ${position} of ${total}.`,
  dropped: (position, total) => `Dropped at position ${position} of ${total}.`,
  cancelled: "Move cancelled.",
};

export interface SortDragState {
  id: string;
  from: number;
  to: number;
  mode: "pointer" | "keyboard";
  /** Vertical shift (px) per item id that moves; the others stay put. */
  offsets: Record<string, number>;
}

interface Layout {
  ids: string[];
  /** Top / height of each item relative to the list's top, measured without any shift. */
  tops: number[];
  heights: number[];
  gap: number;
}

export const SORTABLE_LIST_ATTRIBUTE = "data-sortable-list";
const ITEM_SELECTOR = "[data-sortable-id]";
const LIST_SELECTOR = `[${SORTABLE_LIST_ATTRIBUTE}]`;
const HANDLE_SELECTOR = "[data-sortable-handle]";

/** The items of `list` in DOM order (nested lists excluded). */
function itemsOf(list: HTMLElement): HTMLElement[] {
  return Array.from(list.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter((item) => item.closest(LIST_SELECTOR) === list);
}

function measure(list: HTMLElement): Layout {
  const listTop = list.getBoundingClientRect().top;
  const items = itemsOf(list);
  const rects = items.map((item) => item.getBoundingClientRect());
  const tops = rects.map((rect) => rect.top - listTop);
  const heights = rects.map((rect) => rect.height);
  const gap = items.length > 1 ? Math.max(0, tops[1] - (tops[0] + heights[0])) : 0;
  return { ids: items.map((item) => item.dataset.sortableId!), tops, heights, gap };
}

/** Item shifts that show the order after moving `from` to `to` (items stacked from the first slot). */
function offsetsFor(layout: Layout, from: number, to: number): Record<string, number> {
  const offsets: Record<string, number> = {};
  if (from === to) return offsets;
  const order = layout.ids.map((_, index) => index);
  const [moved] = order.splice(from, 1);
  order.splice(to, 0, moved);
  let top = layout.tops[0];
  for (const index of order) {
    const shift = top - layout.tops[index];
    if (Math.abs(shift) > 0.5) offsets[layout.ids[index]] = shift;
    top += layout.heights[index] + layout.gap;
  }
  return offsets;
}

/** Target index for the dragged item whose middle is at `center` (list coordinates). */
function indexAt(layout: Layout, from: number, center: number) {
  let index = 0;
  layout.ids.forEach((_, i) => {
    if (i !== from && layout.tops[i] + layout.heights[i] / 2 < center) index += 1;
  });
  return index;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export interface SortEngineOptions {
  listRef: RefObject<HTMLElement | null>;
  /** Called once per drop at a new position (not on cancel). Without it nothing can be moved. */
  onMove?: (from: number, to: number) => void;
  labels: SortLabels;
  /** No drags (e.g. a sorted table). */
  disabled?: boolean;
  /** `data-slot` of the copy that follows the pointer. */
  previewSlot: string;
  /** Height covered by something sticky at the top of the scroll box (a table header), for the auto scroll. */
  scrollInsetTop?: () => number;
}

export interface SortEngine {
  drag: SortDragState | null;
  /** True for the frame after a drop: items render without transition so they don't slide back. */
  settling: boolean;
  announcement: string;
  movable: boolean;
  startPointer: (event: ReactPointerEvent<HTMLElement>, id: string) => void;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLElement>, id: string) => void;
  cancelKeyboard: (id: string) => void;
  /** `true` once for the click that ends a pointer drag of this item (so its onClick doesn't fire). */
  consumeDragClick: (id: string) => boolean;
  /** Inline style for an item: its shift while a drag runs. */
  itemStyle: (id: string, style?: CSSProperties) => CSSProperties | undefined;
}

export function useSortEngine({
  listRef,
  onMove,
  labels,
  disabled = false,
  previewSlot,
  scrollInsetTop,
}: SortEngineOptions): SortEngine {
  const [drag, setDrag] = useState<SortDragState | null>(null);
  const [settling, setSettling] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const movable = typeof onMove === "function" && !disabled;

  const dragRef = useRef<SortDragState | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const update = useCallback((next: SortDragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const insetRef = useRef(scrollInsetTop);
  insetRef.current = scrollInsetTop;
  const cleanupRef = useRef<(() => void) | null>(null);
  const draggedClickRef = useRef<string | null>(null);
  /** After a keyboard drop: focus the handle of the item at this index once the new order is rendered. */
  const focusAfterRef = useRef<{ index: number; handle: boolean } | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  // The drop render (items in their new DOM order, no shift) must reach the screen without a transition before
  // transitions come back; force the style now and turn them on in the next frame.
  useIsomorphicLayoutEffect(() => {
    if (!settling) return;
    void listRef.current?.offsetHeight;
    const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn: () => void) => setTimeout(fn, 16);
    const caf = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout;
    const id = raf(() => setSettling(false));
    return () => caf(id as number);
  }, [settling, listRef]);

  useEffect(() => {
    const target = focusAfterRef.current;
    const list = listRef.current;
    if (drag || !target || !list) return;
    focusAfterRef.current = null;
    const item = itemsOf(list)[target.index];
    if (!item || item.contains(item.ownerDocument.activeElement)) return;
    const handle = target.handle ? item.querySelector<HTMLElement>(HANDLE_SELECTOR) : null;
    (handle ?? item).focus({ preventScroll: true });
  }, [drag, listRef]);

  const finish = useCallback(
    (state: SortDragState | null, commit: boolean) => {
      update(null);
      layoutRef.current = null;
      if (!state) return;
      const total = listRef.current ? itemsOf(listRef.current).length : 0;
      if (!commit) {
        setAnnouncement(labelsRef.current.cancelled);
        return;
      }
      setAnnouncement(labelsRef.current.dropped(state.to + 1, total));
      if (state.to === state.from) return;
      setSettling(true);
      onMoveRef.current?.(state.from, state.to);
    },
    [listRef, update],
  );

  const startPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>, id: string) => {
      const list = listRef.current;
      if (!list || !movable || event.button !== 0 || dragRef.current) return;
      draggedClickRef.current = null;
      const item = itemsOf(list).find((element) => element.dataset.sortableId === id);
      if (!item) return;
      const startY = event.clientY;
      let startListTop = 0;
      let lastX = event.clientX;
      let lastY = event.clientY;
      let preview: HTMLElement | null = null;
      let scroller: HTMLElement | null = null;
      let frame = 0;
      const doc = list.ownerDocument;
      let previousCursor = "";
      let activated = false;

      const recompute = () => {
        const layout = layoutRef.current;
        const current = dragRef.current;
        if (!layout || !current) return;
        const shift = lastY - list.getBoundingClientRect().top - (startY - startListTop);
        const center = layout.tops[current.from] + layout.heights[current.from] / 2 + shift;
        const to = indexAt(layout, current.from, center);
        if (to === current.to) return;
        update({ ...current, to, offsets: offsetsFor(layout, current.from, to) });
      };
      const tick = () => {
        if (autoScroll(scroller, lastX, lastY, "y", { top: insetRef.current?.() ?? 0 })) recompute();
        frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(tick) : 0;
      };

      cleanupRef.current?.();
      cleanupRef.current = startPointerDrag(event, {
        onActivate: () => {
          const layout = measure(list);
          const from = layout.ids.indexOf(id);
          if (from === -1) return;
          layoutRef.current = layout;
          startListTop = list.getBoundingClientRect().top;
          preview = createDragPreview(item, list, {
            slot: previewSlot,
            opacity: "var(--pui-drag-preview-opacity, 0.6)",
          });
          scroller = findScrollParent(list);
          activated = true;
          previousCursor = doc.body.style.cursor;
          doc.body.style.cursor = "grabbing";
          update({ id, from, to: from, mode: "pointer", offsets: {} });
          setAnnouncement(labelsRef.current.pickedUp(from + 1, layout.ids.length));
          if (typeof requestAnimationFrame === "function") frame = requestAnimationFrame(tick);
        },
        onMove: (e, _dx, dy) => {
          lastX = e.clientX;
          lastY = e.clientY;
          // Locked to the list's axis: the copy only moves up and down.
          if (preview) preview.style.transform = `translate(0px, ${dy}px)`;
          recompute();
        },
        onEnd: (commit) => {
          // A click that follows the drag on this item must not trigger its onClick.
          draggedClickRef.current = id;
          finish(dragRef.current, commit);
        },
        onCleanup: () => {
          if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
          frame = 0;
          preview?.remove();
          preview = null;
          if (activated) doc.body.style.cursor = previousCursor;
          cleanupRef.current = null;
        },
      });
    },
    [finish, listRef, movable, previewSlot, update],
  );

  /** Keeps the slot an item moved to (keyboard) inside the visible part of its scroll box. */
  const reveal = useCallback((list: HTMLElement, layout: Layout, offsets: Record<string, number>, id: string) => {
    const index = layout.ids.indexOf(id);
    const scroller = findScrollParent(list);
    if (!scroller || index === -1) return;
    const doc = list.ownerDocument;
    const box =
      scroller === doc.scrollingElement
        ? { top: 0, bottom: doc.defaultView?.innerHeight ?? 0 }
        : scroller.getBoundingClientRect();
    const top = list.getBoundingClientRect().top + layout.tops[index] + (offsets[id] ?? 0);
    const bottom = top + layout.heights[index];
    const inset = insetRef.current?.() ?? 0;
    if (top < box.top + inset) scroller.scrollTop -= box.top + inset - top + 4;
    else if (bottom > box.bottom) scroller.scrollTop += bottom - box.bottom + 4;
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, id: string) => {
      const list = listRef.current;
      if (!list || !movable || event.target !== event.currentTarget) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const current = dragRef.current;
      const pick = event.key === " " || event.key === "Enter";

      if (!current) {
        if (!pick || event.repeat) return;
        event.preventDefault();
        const layout = measure(list);
        const from = layout.ids.indexOf(id);
        if (from === -1) return;
        layoutRef.current = layout;
        update({ id, from, to: from, mode: "keyboard", offsets: {} });
        setAnnouncement(labelsRef.current.pickedUp(from + 1, layout.ids.length));
        return;
      }
      if (current.mode !== "keyboard" || current.id !== id) return;

      if (pick) {
        event.preventDefault();
        if (event.repeat) return;
        focusAfterRef.current = { index: current.to, handle: event.currentTarget.hasAttribute("data-sortable-handle") };
        finish(current, true);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(current, false);
        return;
      }
      const layout = layoutRef.current;
      if (!layout) return;
      const last = layout.ids.length - 1;
      let to = current.to;
      if (event.key === "ArrowUp") to -= 1;
      else if (event.key === "ArrowDown") to += 1;
      else if (event.key === "Home") to = 0;
      else if (event.key === "End") to = last;
      else return;
      event.preventDefault();
      to = clamp(to, 0, last);
      if (to === current.to) return;
      const offsets = offsetsFor(layout, current.from, to);
      update({ ...current, to, offsets });
      setAnnouncement(labelsRef.current.moving(to + 1, layout.ids.length));
      reveal(list, layout, offsets, id);
    },
    [finish, listRef, movable, reveal, update],
  );

  const cancelKeyboard = useCallback(
    (id: string) => {
      const current = dragRef.current;
      if (current?.mode === "keyboard" && current.id === id) finish(current, false);
    },
    [finish],
  );

  const consumeDragClick = useCallback((id: string) => {
    if (draggedClickRef.current !== id) return false;
    draggedClickRef.current = null;
    return true;
  }, []);

  const itemStyle = useCallback(
    (id: string, style?: CSSProperties): CSSProperties | undefined => {
      const offset = drag?.offsets[id];
      if (!offset) return style;
      return { ...style, transform: `translate3d(0px, ${offset}px, 0px)` };
    },
    [drag],
  );

  return { drag, settling, announcement, movable, startPointer, handleKeyDown, cancelKeyboard, consumeDragClick, itemStyle };
}

/** Whether a press on `target` inside `item` may start a drag: on the handle if the item has one, else anywhere but
 * on interactive elements (inputs, buttons, links …). */
export function canStartDragFrom(item: HTMLElement, target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const handle = target.closest(HANDLE_SELECTOR);
  if (handle && item.contains(handle)) return true;
  if (item.querySelector(HANDLE_SELECTOR)) return false;
  const interactive = target.closest(
    'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="checkbox"], [role="switch"], [role="slider"], [role="combobox"], [role="textbox"]',
  );
  return !interactive || interactive === item || !item.contains(interactive);
}
