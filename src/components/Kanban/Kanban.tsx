import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";

// ---------------------------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------------------------

/** A card position: column id and 0-based index inside that column. */
export interface KanbanLocation {
  columnId: string;
  index: number;
}

/**
 * A finished move. `to.index` is the position in the target column **after** the card was taken out of its source
 * column — apply it with `moveKanbanItem`, or remove the card first and insert it at `to.index` yourself.
 */
export interface KanbanMoveEvent {
  cardId: string;
  from: KanbanLocation;
  to: KanbanLocation;
}

export interface KanbanLabels {
  /** Role description of a card for screen readers. */
  card: string;
  /** How to move a card with the keyboard (read with the focused card). */
  instructions: string;
  pickedUp: (column: string, position: number) => string;
  moving: (column: string, position: number) => string;
  dropped: (column: string, position: number) => string;
  cancelled: string;
}

export const defaultKanbanLabels: KanbanLabels = {
  card: "Draggable card",
  instructions:
    "Press Space or Enter to pick the card up. Move it with the arrow keys, press Space or Enter to drop it, Escape to cancel.",
  pickedUp: (column, position) => `Picked up from ${column}, position ${position}.`,
  moving: (column, position) => `${column}, position ${position}.`,
  dropped: (column, position) => `Dropped in ${column}, position ${position}.`,
  cancelled: "Move cancelled.",
};

interface DragState {
  cardId: string;
  from: KanbanLocation;
  /** `null` while the pointer is outside every column (dropping then cancels). */
  to: KanbanLocation | null;
  /** Drop line, in px from the top of the target column's content (incl. its scroll). */
  indicatorY: number | null;
  mode: "pointer" | "keyboard";
}

interface KanbanContextValue {
  boardRef: React.RefObject<HTMLDivElement | null>;
  drag: DragState | null;
  movable: boolean;
  instructionsId: string;
  labels: KanbanLabels;
  startPointer: (event: ReactPointerEvent<HTMLElement>, cardId: string) => void;
  handleCardKeyDown: (event: ReactKeyboardEvent<HTMLElement>, cardId: string) => void;
  cancelKeyboard: (cardId: string) => void;
  /** `true` once for the click that ends a pointer drag of this card (so the card's onClick doesn't fire). */
  consumeDragClick: (cardId: string) => boolean;
}

const KanbanContext = /* @__PURE__ */ createContext<KanbanContextValue | null>(null);
const ColumnContext = /* @__PURE__ */ createContext<{ columnId: string; disabled: boolean } | null>(null);

function useKanban(part: string) {
  const context = useContext(KanbanContext);
  if (!context) throw new Error(`${part} must be used within <Kanban />`);
  return context;
}

// ---------------------------------------------------------------------------------------------------------------------
// DOM helpers (all reads happen in event handlers, never during render)
// ---------------------------------------------------------------------------------------------------------------------

const COLUMN_SELECTOR = '[data-slot="kanban-column"]';
const CONTENT_SELECTOR = '[data-slot="kanban-column-content"]';
const CARD_SELECTOR = '[data-slot="kanban-card"]';
const DRAG_THRESHOLD = 4;
const AUTO_SCROLL_EDGE = 40;
const AUTO_SCROLL_STEP = 12;

function columnsOf(board: HTMLElement): HTMLElement[] {
  return Array.from(board.querySelectorAll<HTMLElement>(COLUMN_SELECTOR)).filter(
    (column) => column.closest('[data-slot="kanban"]') === board,
  );
}

function contentOf(column: HTMLElement): HTMLElement | null {
  return column.querySelector<HTMLElement>(CONTENT_SELECTOR);
}

/** The cards of a column in DOM order, optionally without the dragged one. */
function cardsOf(column: HTMLElement, exclude?: string): HTMLElement[] {
  const content = contentOf(column);
  if (!content) return [];
  return Array.from(content.querySelectorAll<HTMLElement>(CARD_SELECTOR)).filter(
    (card) => card.closest(COLUMN_SELECTOR) === column && card.dataset.cardId !== exclude,
  );
}

function columnById(board: HTMLElement, columnId: string) {
  return columnsOf(board).find((column) => column.dataset.columnId === columnId) ?? null;
}

const columnName = (column: HTMLElement | null) =>
  column?.getAttribute("aria-label") || column?.dataset.columnId || "";

/** Where the drop line goes for `index` (cards without the dragged one), relative to the content's scroll box. */
function indicatorFor(column: HTMLElement, index: number, exclude: string): number | null {
  const content = contentOf(column);
  if (!content) return null;
  const box = content.getBoundingClientRect();
  const cards = cardsOf(column, exclude);
  const offset = (y: number) => y - box.top + content.scrollTop;
  if (cards.length === 0) return offset(box.top) + parseFloat(getComputedStyle(content).paddingTop || "0") / 2;
  if (index < cards.length) return offset(cards[index].getBoundingClientRect().top) - 4;
  return offset(cards[cards.length - 1].getBoundingClientRect().bottom) + 4;
}

/** Index where a pointer at `y` would drop (between the cards, by their vertical middles). */
function indexAt(column: HTMLElement, y: number, exclude: string) {
  const cards = cardsOf(column, exclude);
  let index = 0;
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (y > rect.top + rect.height / 2) index += 1;
  }
  return index;
}

function autoScroll(element: HTMLElement | null, x: number, y: number, axis: "x" | "y") {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  if (axis === "y") {
    if (y < rect.top + AUTO_SCROLL_EDGE) element.scrollTop -= AUTO_SCROLL_STEP;
    else if (y > rect.bottom - AUTO_SCROLL_EDGE) element.scrollTop += AUTO_SCROLL_STEP;
  } else if (x < rect.left + AUTO_SCROLL_EDGE) element.scrollLeft -= AUTO_SCROLL_STEP;
  else if (x > rect.right - AUTO_SCROLL_EDGE) element.scrollLeft += AUTO_SCROLL_STEP;
}

/** A detached copy of the card that follows the pointer (inherits the scheme/theme of the board). */
function createPreview(card: HTMLElement, board: HTMLElement) {
  const rect = card.getBoundingClientRect();
  const clone = card.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.removeAttribute("tabindex");
  clone.removeAttribute("aria-describedby");
  clone.removeAttribute("data-dragging");
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-slot", "kanban-drag-preview");
  const scope = board.closest("[data-scheme]");
  const wrapper = document.createElement("div");
  if (scope) wrapper.setAttribute("data-scheme", scope.getAttribute("data-scheme")!);
  const theme = board.closest("[data-theme]");
  if (theme) wrapper.setAttribute("data-theme", theme.getAttribute("data-theme")!);
  Object.assign(wrapper.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    pointerEvents: "none",
    zIndex: "2147483647",
    margin: "0",
    willChange: "transform",
  });
  clone.style.boxShadow = "var(--pui-shadow-floating)";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  return wrapper;
}

// ---------------------------------------------------------------------------------------------------------------------
// Kanban (board)
// ---------------------------------------------------------------------------------------------------------------------

export interface KanbanProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Called once when a card is dropped at a new position (not on cancel, not when dropped where it was). Without it
   * the board is read-only. Update your own state here, e.g. with `moveKanbanItem`.
   */
  onCardMove?: (event: KanbanMoveEvent) => void;
  /** Screen-reader texts (partial overrides, English by default). */
  labels?: Partial<KanbanLabels>;
}

/**
 * Kanban board: columns (`KanbanColumn`) with cards (`KanbanCard`) that can be moved with the pointer (4px threshold,
 * a preview follows the cursor, a line shows the drop position, lists scroll near their edges) or the keyboard
 * (Space/Enter, arrows, Escape). Pointer events instead of HTML5 drag & drop, so it works in FiveM's CEF. The board
 * only reports moves (`onCardMove`); your state decides what is rendered.
 */
export const Kanban = /* @__PURE__ */ forwardRef<HTMLDivElement, KanbanProps>(function Kanban(
  { onCardMove, labels: labelOverrides, className, children, ...props },
  forwardedRef,
) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const instructionsId = useId();
  const labels = useMemo(() => ({ ...defaultKanbanLabels, ...labelOverrides }), [labelOverrides]);
  const movable = typeof onCardMove === "function";

  const dragRef = useRef<DragState | null>(null);
  const update = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);
  const onMoveRef = useRef(onCardMove);
  onMoveRef.current = onCardMove;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const cleanupRef = useRef<(() => void) | null>(null);
  const draggedClickRef = useRef<string | null>(null);
  const consumeDragClick = useCallback((cardId: string) => {
    if (draggedClickRef.current !== cardId) return false;
    draggedClickRef.current = null;
    return true;
  }, []);

  useEffect(() => () => cleanupRef.current?.(), []);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      boardRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const finish = useCallback(
    (state: DragState | null, commit: boolean) => {
      const board = boardRef.current;
      update(null);
      if (!state || !board) return;
      const { to, from, cardId } = state;
      if (!commit || !to) {
        setAnnouncement(labelsRef.current.cancelled);
        return;
      }
      setAnnouncement(labelsRef.current.dropped(columnName(columnById(board, to.columnId)), to.index + 1));
      if (to.columnId === from.columnId && to.index === from.index) return;
      onMoveRef.current?.({ cardId, from, to });
    },
    [update],
  );

  const locate = useCallback((cardId: string): KanbanLocation | null => {
    const board = boardRef.current;
    if (!board) return null;
    for (const column of columnsOf(board)) {
      const index = cardsOf(column).findIndex((card) => card.dataset.cardId === cardId);
      if (index !== -1) return { columnId: column.dataset.columnId!, index };
    }
    return null;
  }, []);

  const startPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>, cardId: string) => {
      const board = boardRef.current;
      if (!board || !movable || event.button !== 0 || dragRef.current) return;
      draggedClickRef.current = null;
      const card = event.currentTarget;
      const from = locate(cardId);
      if (!from) return;
      const startX = event.clientX;
      const startY = event.clientY;
      let preview: HTMLElement | null = null;
      let active = false;

      const move = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!active) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          active = true;
          preview = createPreview(card, board);
          window.getSelection?.()?.removeAllRanges();
          setAnnouncement(labelsRef.current.pickedUp(columnName(columnById(board, from.columnId)), from.index + 1));
        }
        preview!.style.transform = `translate(${dx}px, ${dy}px)`;
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const column = hit?.closest<HTMLElement>(COLUMN_SELECTOR) ?? null;
        autoScroll(board, e.clientX, e.clientY, "x");
        if (!column || !board.contains(column) || column.hasAttribute("data-disabled")) {
          update({ cardId, from, to: null, indicatorY: null, mode: "pointer" });
          return;
        }
        autoScroll(contentOf(column), e.clientX, e.clientY, "y");
        const index = indexAt(column, e.clientY, cardId);
        const current = dragRef.current;
        const columnId = column.dataset.columnId!;
        if (current?.to?.columnId === columnId && current.to.index === index) return;
        update({ cardId, from, to: { columnId, index }, indicatorY: indicatorFor(column, index, cardId), mode: "pointer" });
      };

      const end = (commit: boolean) => {
        cleanup();
        if (!active) return;
        // A click that follows the drag on this card must not trigger its onClick.
        draggedClickRef.current = cardId;
        finish(dragRef.current, commit);
      };
      const up = () => end(true);
      const cancel = () => end(false);
      const key = (e: KeyboardEvent) => {
        if (e.key !== "Escape" || !active) return;
        // Don't let the Escape also close a surrounding dialog.
        e.stopPropagation();
        e.preventDefault();
        end(false);
      };

      function cleanup() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("blur", cancel);
        window.removeEventListener("keydown", key, true);
        preview?.remove();
        preview = null;
        cleanupRef.current = null;
      }

      cleanupRef.current?.();
      cleanupRef.current = cleanup;
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("blur", cancel);
      window.addEventListener("keydown", key, true);
    },
    [finish, locate, movable, update],
  );

  const handleCardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, cardId: string) => {
      const board = boardRef.current;
      if (!board || !movable || event.target !== event.currentTarget) return;
      const current = dragRef.current;
      const pick = event.key === " " || event.key === "Enter";

      if (!current) {
        if (!pick) return;
        event.preventDefault();
        const from = locate(cardId);
        if (!from) return;
        const column = columnById(board, from.columnId)!;
        update({ cardId, from, to: from, indicatorY: indicatorFor(column, from.index, cardId), mode: "keyboard" });
        setAnnouncement(labelsRef.current.pickedUp(columnName(column), from.index + 1));
        return;
      }
      if (current.mode !== "keyboard" || current.cardId !== cardId) return;

      if (pick) {
        event.preventDefault();
        finish(current, true);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(current, false);
        return;
      }
      const to = current.to ?? current.from;
      const columns = columnsOf(board);
      let columnIndex = columns.findIndex((column) => column.dataset.columnId === to.columnId);
      let index = to.index;
      if (event.key === "ArrowUp") index -= 1;
      else if (event.key === "ArrowDown") index += 1;
      else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const step = event.key === "ArrowLeft" ? -1 : 1;
        let next = columnIndex + step;
        while (columns[next]?.hasAttribute("data-disabled")) next += step;
        if (!columns[next]) {
          event.preventDefault();
          return;
        }
        columnIndex = next;
      } else return;
      event.preventDefault();
      const column = columns[columnIndex];
      const max = cardsOf(column, cardId).length;
      index = Math.max(0, Math.min(index, max));
      const columnId = column.dataset.columnId!;
      update({ ...current, to: { columnId, index }, indicatorY: indicatorFor(column, index, cardId) });
      setAnnouncement(labelsRef.current.moving(columnName(column), index + 1));
    },
    [finish, locate, movable, update],
  );

  const cancelKeyboard = useCallback(
    (cardId: string) => {
      const current = dragRef.current;
      if (current?.mode === "keyboard" && current.cardId === cardId) finish(current, false);
    },
    [finish],
  );

  const value = useMemo<KanbanContextValue>(
    () => ({
      boardRef,
      drag,
      movable,
      instructionsId,
      labels,
      startPointer,
      handleCardKeyDown,
      cancelKeyboard,
      consumeDragClick,
    }),
    [drag, movable, instructionsId, labels, startPointer, handleCardKeyDown, cancelKeyboard, consumeDragClick],
  );

  return (
    <KanbanContext.Provider value={value}>
      <div
        ref={setRefs}
        data-slot="kanban"
        data-dragging={drag ? "" : undefined}
        className={cn("flex items-stretch gap-3 overflow-x-auto pb-1", drag?.mode === "pointer" && "select-none", className)}
        {...props}
      >
        {children}
        {movable && (
          <span id={instructionsId} hidden>
            {labels.instructions}
          </span>
        )}
        <span className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
          {announcement}
        </span>
      </div>
    </KanbanContext.Provider>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------------------------------------------------

export interface KanbanColumnProps extends HTMLAttributes<HTMLDivElement> {
  /** Stable id, reported in `onCardMove`. */
  id: string;
  /** Column name for screen readers and announcements ("Dropped in <label>, position 2"). */
  label?: string;
  /** No drops into this column (cards inside can still be moved out unless they are disabled). */
  disabled?: boolean;
}

/** One column: `KanbanColumnHeader` + `KanbanColumnContent`. Fixed 18rem wide by default (override with `className`). */
export const KanbanColumn = /* @__PURE__ */ forwardRef<HTMLDivElement, KanbanColumnProps>(function KanbanColumn(
  { id, label, disabled = false, className, children, ...props },
  ref,
) {
  const { drag } = useKanban("KanbanColumn");
  const target = drag?.to?.columnId === id;
  return (
    <ColumnContext.Provider value={{ columnId: id, disabled }}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        data-slot="kanban-column"
        data-column-id={id}
        data-disabled={disabled ? "" : undefined}
        data-drop-target={target ? "" : undefined}
        className={cn(
          "flex max-h-full w-72 shrink-0 flex-col overflow-hidden rounded-pui border border-pui-border bg-pui-card text-pui-card-foreground",
          "transition-colors duration-pui-fast ease-pui",
          "data-[drop-target]:border-pui-primary/tint-border",
          "data-[disabled]:opacity-60",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ColumnContext.Provider>
  );
});

export type KanbanColumnHeaderProps = HTMLAttributes<HTMLDivElement>;

/** Column head: title on the left, anything else (a count `Badge`, an add button) on the right. */
export const KanbanColumnHeader = /* @__PURE__ */ forwardRef<HTMLDivElement, KanbanColumnHeaderProps>(function KanbanColumnHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="kanban-column-header"
      className={cn("flex min-h-11 shrink-0 items-center gap-2 border-b border-pui-border px-3 py-2", className)}
      {...props}
    />
  );
});

export type KanbanColumnTitleProps = HTMLAttributes<HTMLDivElement>;

export const KanbanColumnTitle = /* @__PURE__ */ forwardRef<HTMLDivElement, KanbanColumnTitleProps>(function KanbanColumnTitle(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="kanban-column-title"
      className={cn("min-w-0 flex-1 truncate text-sm font-semibold", className)}
      {...props}
    />
  );
});

export interface KanbanColumnContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Shown when the column has no cards (and nothing is being dropped into it). */
  empty?: ReactNode;
}

/** The scrolling card list of a column; shows the drop line while a card is moved over it. */
export const KanbanColumnContent = /* @__PURE__ */ forwardRef<HTMLDivElement, KanbanColumnContentProps>(function KanbanColumnContent(
  { empty, className, children, ...props },
  ref,
) {
  const { drag } = useKanban("KanbanColumnContent");
  const column = useContext(ColumnContext);
  const showIndicator = drag?.to && column && drag.to.columnId === column.columnId && drag.indicatorY !== null;
  const hasChildren = Array.isArray(children) ? children.some((child) => child != null && child !== false) : children != null;
  return (
    <div
      ref={ref}
      data-slot="kanban-column-content"
      className={cn("relative flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2", className)}
      {...props}
    >
      {children}
      {!hasChildren && empty != null && !showIndicator ? (
        <div
          data-slot="kanban-column-empty"
          className="flex flex-1 items-center justify-center rounded-pui-md border border-dashed border-pui-border p-4 text-center text-xs text-pui-muted-foreground"
        >
          {empty}
        </div>
      ) : null}
      {showIndicator ? (
        <span
          aria-hidden="true"
          data-slot="kanban-drop-indicator"
          className="pointer-events-none absolute inset-x-2 h-0.5 -translate-y-1/2 rounded-full bg-pui-primary"
          style={{ top: drag!.indicatorY! }}
        />
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------------------------------------------------

export interface KanbanCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Stable id, reported in `onCardMove`. */
  id: string;
  /** Can't be moved (still focusable and clickable). */
  disabled?: boolean;
}

/** A card. Put any content inside; clicks still work (a drag never fires the click). */
export const KanbanCard = /* @__PURE__ */ forwardRef<HTMLDivElement, KanbanCardProps>(function KanbanCard(
  { id, disabled = false, className, onPointerDown, onKeyDown, onBlur, onClickCapture, children, ...props },
  ref,
) {
  const { drag, movable, instructionsId, labels, startPointer, handleCardKeyDown, cancelKeyboard, consumeDragClick } =
    useKanban("KanbanCard");
  const draggable = movable && !disabled;
  const dragging = drag?.cardId === id;
  return (
    <div
      ref={ref}
      data-slot="kanban-card"
      data-card-id={id}
      data-disabled={disabled ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
      tabIndex={0}
      aria-roledescription={draggable ? labels.card : undefined}
      aria-describedby={draggable ? instructionsId : undefined}
      aria-pressed={draggable ? dragging : undefined}
      className={cn(
        "relative shrink-0 rounded-pui-md border border-pui-border bg-pui-background p-3 text-sm text-pui-foreground",
        "outline-none transition-colors duration-pui-fast ease-pui hover:border-pui-input",
        "focus-visible:ring-pui focus-visible:ring-pui-ring",
        draggable && "cursor-grab touch-none",
        "data-[dragging]:border-pui-primary data-[dragging]:opacity-40",
        "data-[disabled]:cursor-default",
        className,
      )}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (draggable && !event.defaultPrevented) startPointer(event, id);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (draggable && !event.defaultPrevented) handleCardKeyDown(event, id);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        cancelKeyboard(id);
      }}
      onClickCapture={(event) => {
        if (consumeDragClick(id)) {
          event.stopPropagation();
          event.preventDefault();
          return;
        }
        onClickCapture?.(event);
      }}
      {...props}
    >
      {children}
    </div>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// State helper
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Applies a `KanbanMoveEvent` to a board state `{ [columnId]: items[] }` (items with an `id`) and returns a new object;
 * the input is not mutated. Unknown ids leave the state unchanged.
 */
export function moveKanbanItem<T extends { id: string }>(
  board: Record<string, T[]>,
  { cardId, from, to }: KanbanMoveEvent,
): Record<string, T[]> {
  const source = board[from.columnId];
  const target = board[to.columnId];
  if (!source || !target) return board;
  const index = source.findIndex((item) => item.id === cardId);
  if (index === -1) return board;
  const item = source[index];
  const nextSource = source.slice(0, index).concat(source.slice(index + 1));
  const base = from.columnId === to.columnId ? nextSource : target.slice();
  const insertAt = Math.max(0, Math.min(to.index, base.length));
  const nextTarget = base.slice(0, insertAt).concat([item], base.slice(insertAt));
  return { ...board, [from.columnId]: from.columnId === to.columnId ? nextTarget : nextSource, [to.columnId]: nextTarget };
}
