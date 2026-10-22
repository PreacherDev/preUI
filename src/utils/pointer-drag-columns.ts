// Move engine for several vertical lists side by side (Kanban columns): items are moved with the pointer (a see-through
// copy follows it; in the list it is over the other items slide apart and a tinted slot shows where it lands, the list
// it came from closes the gap) or the keyboard (Space/Enter lifts and drops, up / down move inside a list, left /
// right to the next list that accepts drops, Escape cancels), with screen-reader announcements. Inside one list it
// looks exactly like `useSortEngine` (SortableList).
//
// Lists and items are found in the DOM at event time through the selectors. While a drag runs, each item reads its
// `transform` offset from the state (computed in the handlers, never during render).
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
import { autoScroll, createDragPreview, startPointerDrag } from "./pointer-drag";

/** Marks the board element the engine's lists belong to (lists of nested boards are ignored). */
export const COLUMNS_BOARD_ATTRIBUTE = "data-columns-board";

/** A position: list id and 0-based index inside that list. */
export interface ColumnsLocation {
  columnId: string;
  index: number;
}

export interface ColumnsLabels {
  pickedUp: (column: string, position: number) => string;
  moving: (column: string, position: number) => string;
  dropped: (column: string, position: number) => string;
  cancelled: string;
}

export interface ColumnsDragState {
  id: string;
  from: ColumnsLocation;
  /** `null` while the pointer is outside every list that accepts drops (dropping then cancels). */
  to: ColumnsLocation | null;
  mode: "pointer" | "keyboard";
  /** Vertical shift (px) per item id that moves; the others stay put. */
  offsets: Record<string, number>;
  /**
   * The slot in another list than the item's own: its top (px, in the list's scroll content) and height. Inside the
   * own list the item itself is the slot.
   */
  slot: { columnId: string; top: number; height: number } | null;
}

export interface ColumnsSelectors {
  /** A list (column), with `data-column-id`; `data-disabled` refuses drops. */
  column: string;
  /** The scrolling element of a list that holds its items. */
  content: string;
  /** An item, with its id in `data-${itemIdAttribute}`. */
  item: string;
  /** Name of the item id's data attribute in camel case (`dataset` key), e.g. `"cardId"`. */
  itemId: string;
  /** A drag handle inside an item. */
  handle: string;
}

interface ColumnLayout {
  id: string;
  disabled: boolean;
  /** Item ids, tops (in the list's scroll content) and heights, measured without any shift. */
  ids: string[];
  tops: number[];
  heights: number[];
  gap: number;
  paddingTop: number;
}

/** Offsets and the slot for a drag from `from` to `to`. */
function shiftsFor(
  layouts: ColumnLayout[],
  from: ColumnsLocation,
  to: ColumnsLocation | null,
): Pick<ColumnsDragState, "offsets" | "slot"> {
  const offsets: Record<string, number> = {};
  const source = layouts.find((layout) => layout.id === from.columnId);
  if (!to || !source) return { offsets, slot: null };
  const height = source.heights[from.index] ?? 0;
  if (to.columnId === from.columnId) {
    // Like SortableList: the items (the dragged one included) stacked in the new order from the first slot.
    if (to.index === from.index) return { offsets, slot: null };
    const order = source.ids.map((_, index) => index);
    const [moved] = order.splice(from.index, 1);
    order.splice(to.index, 0, moved);
    let top = source.tops[0];
    for (const index of order) {
      const shift = top - source.tops[index];
      if (Math.abs(shift) > 0.5) offsets[source.ids[index]] = shift;
      top += source.heights[index] + source.gap;
    }
    return { offsets, slot: null };
  }
  // Another list: the own list closes the gap, the target opens one at the slot.
  for (let index = from.index + 1; index < source.ids.length; index++) offsets[source.ids[index]] = -(height + source.gap);
  const target = layouts.find((layout) => layout.id === to.columnId);
  if (!target) return { offsets, slot: null };
  for (let index = to.index; index < target.ids.length; index++) offsets[target.ids[index]] = height + target.gap;
  const count = target.ids.length;
  const top =
    to.index < count
      ? target.tops[to.index]
      : count > 0
        ? target.tops[count - 1] + target.heights[count - 1] + target.gap
        : target.paddingTop;
  return { offsets, slot: { columnId: to.columnId, top, height } };
}

/** Where item `id` is. */
function locate(layouts: ColumnLayout[], id: string): ColumnsLocation | null {
  for (const layout of layouts) {
    const index = layout.ids.indexOf(id);
    if (index !== -1) return { columnId: layout.id, index };
  }
  return null;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface ColumnsEngineOptions {
  boardRef: RefObject<HTMLElement | null>;
  selectors: ColumnsSelectors;
  /** Called once per drop at a new position (not on cancel). Without it nothing can be moved. */
  onMove?: (event: { id: string; from: ColumnsLocation; to: ColumnsLocation }) => void;
  labels: ColumnsLabels;
  disabled?: boolean;
  /** `data-slot` of the copy that follows the pointer. */
  previewSlot: string;
  /** Name of a list for the announcements. */
  columnName: (column: HTMLElement | null) => string;
}

export interface ColumnsEngine {
  drag: ColumnsDragState | null;
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

export function useColumnsEngine({
  boardRef,
  selectors,
  onMove,
  labels,
  disabled = false,
  previewSlot,
  columnName,
}: ColumnsEngineOptions): ColumnsEngine {
  const [drag, setDrag] = useState<ColumnsDragState | null>(null);
  const [settling, setSettling] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const movable = typeof onMove === "function" && !disabled;

  const dragRef = useRef<ColumnsDragState | null>(null);
  const layoutsRef = useRef<ColumnLayout[] | null>(null);
  const update = useCallback((next: ColumnsDragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const nameRef = useRef(columnName);
  nameRef.current = columnName;
  const cleanupRef = useRef<(() => void) | null>(null);
  const draggedClickRef = useRef<string | null>(null);
  /** After a keyboard drop: focus this item once it is rendered in its new list. */
  const focusAfterRef = useRef<string | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  // ---- DOM helpers (event time only) -------------------------------------------------------------
  const columnsOf = useCallback(
    (board: HTMLElement) =>
      Array.from(board.querySelectorAll<HTMLElement>(selectors.column)).filter(
        (column) => column.parentElement?.closest(`[${COLUMNS_BOARD_ATTRIBUTE}]`) === board,
      ),
    [selectors.column],
  );
  const contentOf = useCallback((column: HTMLElement) => column.querySelector<HTMLElement>(selectors.content), [selectors.content]);
  const itemsOf = useCallback(
    (column: HTMLElement) => {
      const content = column.querySelector<HTMLElement>(selectors.content);
      if (!content) return [];
      return Array.from(content.querySelectorAll<HTMLElement>(selectors.item)).filter(
        (item) => item.closest(selectors.column) === column,
      );
    },
    [selectors.column, selectors.content, selectors.item],
  );
  const columnById = useCallback(
    (board: HTMLElement, id: string) => columnsOf(board).find((column) => column.dataset.columnId === id) ?? null,
    [columnsOf],
  );

  const measure = useCallback(
    (board: HTMLElement): ColumnLayout[] =>
      columnsOf(board).map((column) => {
        const content = contentOf(column);
        const items = itemsOf(column);
        const box = content?.getBoundingClientRect();
        const scrollTop = content?.scrollTop ?? 0;
        const rects = items.map((item) => item.getBoundingClientRect());
        const tops = rects.map((rect) => rect.top - (box?.top ?? 0) + scrollTop);
        const heights = rects.map((rect) => rect.height);
        const style = content ? getComputedStyle(content) : null;
        const cssGap = parseFloat(style?.rowGap || "") || 0;
        const gap = items.length > 1 ? Math.max(0, tops[1] - (tops[0] + heights[0])) : cssGap;
        return {
          id: column.dataset.columnId!,
          disabled: column.hasAttribute("data-disabled"),
          ids: items.map((item) => item.dataset[selectors.itemId]!),
          tops,
          heights,
          gap,
          paddingTop: parseFloat(style?.paddingTop || "") || 0,
        };
      }),
    [columnsOf, contentOf, itemsOf, selectors.itemId],
  );

  // The drop render (items in their new place, no shift) must reach the screen without a transition before
  // transitions come back; force the style now and turn them on in the next frame.
  useIsomorphicLayoutEffect(() => {
    if (!settling) return;
    void boardRef.current?.offsetHeight;
    const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn: () => void) => setTimeout(fn, 16);
    const caf = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout;
    const frame = raf(() => setSettling(false));
    return () => caf(frame as number);
  }, [settling, boardRef]);

  useEffect(() => {
    const id = focusAfterRef.current;
    const board = boardRef.current;
    if (drag || !id || !board) return;
    focusAfterRef.current = null;
    const item = Array.from(board.querySelectorAll<HTMLElement>(selectors.item)).find((element) => element.dataset[selectors.itemId] === id);
    if (!item || item.contains(item.ownerDocument.activeElement)) return;
    const handle = item.querySelector<HTMLElement>(selectors.handle);
    (handle ?? item).focus({ preventScroll: true });
  }, [drag, boardRef, selectors.item, selectors.itemId, selectors.handle]);

  const finish = useCallback(
    (state: ColumnsDragState | null, commit: boolean) => {
      const board = boardRef.current;
      update(null);
      layoutsRef.current = null;
      if (!state || !board) return;
      const { to, from, id } = state;
      if (!commit || !to) {
        setAnnouncement(labelsRef.current.cancelled);
        return;
      }
      setAnnouncement(labelsRef.current.dropped(nameRef.current(columnById(board, to.columnId)), to.index + 1));
      if (to.columnId === from.columnId && to.index === from.index) return;
      setSettling(true);
      onMoveRef.current?.({ id, from, to });
    },
    [boardRef, columnById, update],
  );

  const startPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>, id: string) => {
      const board = boardRef.current;
      if (!board || !movable || event.button !== 0 || dragRef.current) return;
      draggedClickRef.current = null;
      const item = event.currentTarget;
      let lastX = event.clientX;
      let lastY = event.clientY;
      /** From the pointer to the middle of the dragged item (viewport px). */
      let centerOffset = 0;
      let preview: HTMLElement | null = null;
      let frame = 0;
      let hovered: HTMLElement | null = null;
      const doc = board.ownerDocument;
      let previousCursor = "";
      let activated = false;

      const recompute = () => {
        const layouts = layoutsRef.current;
        const current = dragRef.current;
        if (!layouts || !current) return;
        const hit = doc.elementFromPoint(lastX, lastY);
        const column = hit?.closest<HTMLElement>(selectors.column) ?? null;
        const layout = column && board.contains(column) ? layouts.find((entry) => entry.id === column.dataset.columnId) : undefined;
        hovered = column && layout ? column : null;
        let to: ColumnsLocation | null = null;
        if (column && layout && !layout.disabled) {
          const content = contentOf(column);
          const box = content?.getBoundingClientRect();
          const center = lastY + centerOffset - (box?.top ?? 0) + (content?.scrollTop ?? 0);
          let index = 0;
          layout.ids.forEach((itemId, i) => {
            if (itemId !== current.id && layout.tops[i] + layout.heights[i] / 2 < center) index += 1;
          });
          to = { columnId: layout.id, index };
        }
        if (current.to?.columnId === to?.columnId && current.to?.index === to?.index) return;
        update({ ...current, to, ...shiftsFor(layouts, current.from, to) });
      };
      const tick = () => {
        const scrolledX = autoScroll(board, lastX, lastY, "x");
        const content = hovered ? contentOf(hovered) : null;
        const scrolledY = autoScroll(content, lastX, lastY, "y");
        if (scrolledX || scrolledY) recompute();
        frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(tick) : 0;
      };

      cleanupRef.current?.();
      cleanupRef.current = startPointerDrag(event, {
        onActivate: () => {
          const layouts = measure(board);
          const from = locate(layouts, id);
          if (!from) return;
          layoutsRef.current = layouts;
          const rect = item.getBoundingClientRect();
          centerOffset = rect.top + rect.height / 2 - event.clientY;
          preview = createDragPreview(item, board, { slot: previewSlot, opacity: "var(--pui-drag-preview-opacity, 0.6)" });
          activated = true;
          previousCursor = doc.body.style.cursor;
          doc.body.style.cursor = "grabbing";
          update({ id, from, to: from, mode: "pointer", offsets: {}, slot: null });
          setAnnouncement(labelsRef.current.pickedUp(nameRef.current(columnById(board, from.columnId)), from.index + 1));
          if (typeof requestAnimationFrame === "function") frame = requestAnimationFrame(tick);
        },
        onMove: (e, dx, dy) => {
          lastX = e.clientX;
          lastY = e.clientY;
          if (preview) preview.style.transform = `translate(${dx}px, ${dy}px)`;
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
    [boardRef, columnById, contentOf, finish, measure, movable, previewSlot, selectors.column, update],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, id: string) => {
      const board = boardRef.current;
      if (!board || !movable || event.target !== event.currentTarget) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const current = dragRef.current;
      const pick = event.key === " " || event.key === "Enter";

      if (!current) {
        if (!pick || event.repeat) return;
        event.preventDefault();
        const layouts = measure(board);
        const from = locate(layouts, id);
        if (!from) return;
        layoutsRef.current = layouts;
        update({ id, from, to: from, mode: "keyboard", offsets: {}, slot: null });
        setAnnouncement(labelsRef.current.pickedUp(nameRef.current(columnById(board, from.columnId)), from.index + 1));
        return;
      }
      if (current.mode !== "keyboard" || current.id !== id) return;

      if (pick) {
        event.preventDefault();
        if (event.repeat) return;
        focusAfterRef.current = id;
        finish(current, true);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(current, false);
        return;
      }
      const layouts = layoutsRef.current;
      if (!layouts) return;
      const to = current.to ?? current.from;
      let columnIndex = layouts.findIndex((layout) => layout.id === to.columnId);
      let index = to.index;
      if (event.key === "ArrowUp") index -= 1;
      else if (event.key === "ArrowDown") index += 1;
      else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const step = event.key === "ArrowLeft" ? -1 : 1;
        let next = columnIndex + step;
        while (layouts[next]?.disabled) next += step;
        if (!layouts[next]) {
          event.preventDefault();
          return;
        }
        columnIndex = next;
      } else return;
      event.preventDefault();
      const layout = layouts[columnIndex];
      const max = layout.id === current.from.columnId ? layout.ids.length - 1 : layout.ids.length;
      index = Math.max(0, Math.min(index, max));
      const next = { columnId: layout.id, index };
      if (next.columnId === to.columnId && next.index === to.index) return;
      update({ ...current, to: next, ...shiftsFor(layouts, current.from, next) });
      setAnnouncement(labelsRef.current.moving(nameRef.current(columnById(board, layout.id)), index + 1));
    },
    [boardRef, columnById, finish, measure, movable, update],
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

