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
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { canStartDragFrom } from "../../utils/pointer-drag-sort";
import { COLUMNS_BOARD_ATTRIBUTE, useColumnsEngine, type ColumnsEngine } from "../../utils/pointer-drag-columns";

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
  /** Accessible name of a `KanbanCardHandle`. */
  handle: string;
  /** How to move a card with the keyboard (read with the focused card). */
  instructions: string;
  pickedUp: (column: string, position: number) => string;
  moving: (column: string, position: number) => string;
  dropped: (column: string, position: number) => string;
  cancelled: string;
}

export const defaultKanbanLabels: KanbanLabels = {
  card: "Draggable card",
  handle: "Drag to move",
  instructions:
    "Press Space or Enter to pick the card up. Move it with the arrow keys, press Space or Enter to drop it, Escape to cancel.",
  pickedUp: (column, position) => `Picked up from ${column}, position ${position}.`,
  moving: (column, position) => `${column}, position ${position}.`,
  dropped: (column, position) => `Dropped in ${column}, position ${position}.`,
  cancelled: "Move cancelled.",
};

interface KanbanContextValue {
  engine: ColumnsEngine;
  instructionsId: string;
  labels: KanbanLabels;
}

interface KanbanCardContextValue {
  id: string;
  disabled: boolean;
  registerHandle: () => () => void;
}

const KanbanContext = /* @__PURE__ */ createContext<KanbanContextValue | null>(null);
const ColumnContext = /* @__PURE__ */ createContext<{ columnId: string; disabled: boolean } | null>(null);
const KanbanCardContext = /* @__PURE__ */ createContext<KanbanCardContextValue | null>(null);

function useKanban(part: string) {
  const context = useContext(KanbanContext);
  if (!context) throw new Error(`${part} must be used within <Kanban />`);
  return context;
}

const selectors = {
  column: '[data-slot="kanban-column"]',
  content: '[data-slot="kanban-column-content"]',
  item: '[data-slot="kanban-card"]',
  itemId: "cardId",
  handle: "[data-sortable-handle]",
};

const columnName = (column: HTMLElement | null) => column?.getAttribute("aria-label") || column?.dataset.columnId || "";

// ---------------------------------------------------------------------------------------------------------------------
// Kanban (board)
// ---------------------------------------------------------------------------------------------------------------------

export interface KanbanProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Called once when a card is dropped at a new position (not on cancel, not when dropped where it was). Without it
   * the board is read-only. Update your own state here, e.g. with `moveKanbanItem`.
   */
  onCardMove?: (event: KanbanMoveEvent) => void;
  /** No card can be moved (handles are disabled). */
  disabled?: boolean;
  /** Screen-reader texts (partial overrides, English by default). */
  labels?: Partial<KanbanLabels>;
}

/**
 * Kanban board: columns (`KanbanColumn`) with cards (`KanbanCard`) that can be moved with the pointer (4px threshold;
 * a see-through copy follows the cursor, the cards of the column below it slide apart and a tinted slot shows where
 * it lands, its own column closes the gap; columns scroll near their edges) or the keyboard (Space/Enter, arrows,
 * Escape). Inside one column it moves exactly like `SortableList`. Pointer events instead of HTML5 drag & drop, so it
 * works in FiveM's CEF. The board only reports moves (`onCardMove`); your state decides what is rendered.
 */
export const Kanban = /* @__PURE__ */ forwardRef<HTMLDivElement, KanbanProps>(function Kanban(
  { onCardMove, disabled = false, labels: labelOverrides, className, children, ...props },
  forwardedRef,
) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const instructionsId = useId();
  const labels = useMemo(() => ({ ...defaultKanbanLabels, ...labelOverrides }), [labelOverrides]);
  const onMoveRef = useRef(onCardMove);
  onMoveRef.current = onCardMove;
  const onMove = useCallback(
    ({ id, from, to }: { id: string; from: KanbanLocation; to: KanbanLocation }) => onMoveRef.current?.({ cardId: id, from, to }),
    [],
  );
  const engine = useColumnsEngine({
    boardRef,
    selectors,
    onMove: onCardMove ? onMove : undefined,
    labels,
    disabled,
    previewSlot: "kanban-drag-preview",
    columnName,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      boardRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const value = useMemo<KanbanContextValue>(() => ({ engine, instructionsId, labels }), [engine, instructionsId, labels]);
  const { drag } = engine;

  return (
    <KanbanContext.Provider value={value}>
      <div
        ref={setRefs}
        data-slot="kanban"
        {...{ [COLUMNS_BOARD_ATTRIBUTE]: "" }}
        data-dragging={drag ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn("flex items-stretch gap-3 overflow-x-auto pb-1", drag?.mode === "pointer" && "select-none", className)}
        {...props}
      >
        {children}
        {engine.movable && (
          <span id={instructionsId} hidden>
            {labels.instructions}
          </span>
        )}
        <span className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
          {engine.announcement}
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
  const { engine } = useKanban("KanbanColumn");
  const target = engine.drag?.to?.columnId === id;
  const column = useMemo(() => ({ columnId: id, disabled }), [id, disabled]);
  return (
    <ColumnContext.Provider value={column}>
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

/** The scrolling card list of a column; shows the slot a card from another column would land in. */
export const KanbanColumnContent = /* @__PURE__ */ forwardRef<HTMLDivElement, KanbanColumnContentProps>(function KanbanColumnContent(
  { empty, className, children, ...props },
  ref,
) {
  const { engine } = useKanban("KanbanColumnContent");
  const column = useContext(ColumnContext);
  const drag = engine.drag;
  const slot = drag?.slot && column && drag.slot.columnId === column.columnId ? drag.slot : null;
  const hasChildren = Array.isArray(children) ? children.some((child) => child != null && child !== false) : children != null;
  return (
    <div
      ref={ref}
      data-slot="kanban-column-content"
      className={cn("relative flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2", className)}
      {...props}
    >
      {children}
      {!hasChildren && empty != null && !slot ? (
        <div
          data-slot="kanban-column-empty"
          className="flex flex-1 items-center justify-center rounded-pui-md border border-dashed border-pui-border p-4 text-center text-xs text-pui-muted-foreground"
        >
          {empty}
        </div>
      ) : null}
      {slot ? (
        // Where a card from another column lands: the same slot SortableList shows (the cards below slide down).
        <span
          aria-hidden="true"
          data-slot="kanban-drop-slot"
          data-mode={drag!.mode}
          className={cn(
            "pointer-events-none absolute inset-x-2 rounded-pui-md border bg-pui-primary/tint",
            drag!.mode === "pointer" ? "border-dashed border-pui-primary/tint-border" : "border-pui-primary",
          )}
          style={{ top: slot.top, height: slot.height }}
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

/**
 * A card. Put any content inside; clicks still work (a drag never fires the click). With a `KanbanCardHandle` inside,
 * only the handle starts a drag and takes the keyboard moves; without one the whole card does (presses on inputs,
 * buttons and links inside are ignored).
 */
export const KanbanCard = /* @__PURE__ */ forwardRef<HTMLDivElement, KanbanCardProps>(function KanbanCard(
  { id, disabled = false, className, style, onPointerDown, onKeyDown, onBlur, onClickCapture, children, ...props },
  ref,
) {
  const { engine, instructionsId, labels } = useKanban("KanbanCard");
  const [handles, setHandles] = useState(0);
  const registerHandle = useCallback(() => {
    setHandles((count) => count + 1);
    return () => setHandles((count) => count - 1);
  }, []);
  const cardContext = useMemo(() => ({ id, disabled, registerHandle }), [id, disabled, registerHandle]);

  const { drag, settling, movable } = engine;
  const draggable = movable && !disabled;
  const selfHandle = draggable && handles === 0;
  const dragging = drag?.id === id ? drag.mode : undefined;
  // Over another column: the card's own place closes, the slot there shows where it lands.
  const away = dragging !== undefined && drag?.slot != null;

  return (
    <KanbanCardContext.Provider value={cardContext}>
      <div
        ref={ref}
        data-slot="kanban-card"
        data-card-id={id}
        data-disabled={disabled ? "" : undefined}
        data-dragging={dragging}
        data-away={away ? "" : undefined}
        tabIndex={0}
        aria-roledescription={selfHandle ? labels.card : undefined}
        aria-describedby={selfHandle ? instructionsId : undefined}
        aria-pressed={selfHandle ? dragging !== undefined : undefined}
        style={engine.itemStyle(id, style)}
        className={cn(
          // min-w-0 + overflow-wrap:anywhere: long unbreakable text wraps inside the card instead of widening it.
          "relative min-w-0 shrink-0 rounded-pui-md border border-pui-border bg-pui-background p-3 text-sm text-pui-foreground [overflow-wrap:anywhere]",
          "outline-none transition-colors duration-pui-fast ease-pui hover:border-pui-input",
          "focus-visible:ring-pui focus-visible:ring-pui-ring",
          drag && !settling && "transition-[transform,border-color] duration-pui-base",
          selfHandle && "cursor-grab touch-none",
          // Pointer: an empty, tinted slot marks where the card lands (the see-through copy follows the cursor).
          // Keyboard: the card itself moves, highlighted. Over another column it leaves an invisible gap that closes.
          "data-[dragging=pointer]:border-dashed data-[dragging=pointer]:border-pui-primary/tint-border data-[dragging=pointer]:bg-pui-primary/tint data-[dragging=pointer]:text-transparent [&[data-dragging=pointer]>*]:invisible",
          "data-[dragging=keyboard]:z-10 data-[dragging=keyboard]:border-pui-primary data-[dragging=keyboard]:bg-pui-primary/tint",
          "data-[away]:invisible",
          "data-[disabled]:cursor-default",
          className,
        )}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (!draggable || event.defaultPrevented) return;
          if (!canStartDragFrom(event.currentTarget, event.target)) return;
          engine.startPointer(event, id);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (selfHandle && !event.defaultPrevented) engine.handleKeyDown(event, id);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (event.target === event.currentTarget) engine.cancelKeyboard(id);
        }}
        onClickCapture={(event) => {
          if (engine.consumeDragClick(id)) {
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
    </KanbanCardContext.Provider>
  );
});

export type KanbanCardHandleProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * The grip of a `KanbanCard` (a `GripVertical` icon unless you pass children). Starts pointer drags and is the
 * keyboard stop of the move: Space/Enter lifts and drops, arrows move, Escape cancels.
 */
export const KanbanCardHandle = /* @__PURE__ */ forwardRef<HTMLButtonElement, KanbanCardHandleProps>(function KanbanCardHandle(
  { className, disabled: disabledProp, onKeyDown, onBlur, children, ...props },
  ref,
) {
  const { engine, instructionsId, labels } = useKanban("KanbanCardHandle");
  const card = useContext(KanbanCardContext);
  if (!card) throw new Error("KanbanCardHandle must be used within <KanbanCard />");
  const GripVertical = useIcon("gripVertical");
  const { registerHandle } = card;
  useEffect(() => registerHandle(), [registerHandle]);

  const disabled = disabledProp || card.disabled || !engine.movable;
  const dragging = engine.drag?.id === card.id;

  return (
    <button
      ref={ref}
      type="button"
      data-slot="kanban-card-handle"
      data-sortable-handle=""
      disabled={disabled}
      aria-label={labels.handle}
      aria-roledescription={disabled ? undefined : labels.card}
      aria-describedby={disabled ? undefined : instructionsId}
      aria-pressed={disabled ? undefined : dragging}
      className={cn(
        "-ml-1 inline-flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-pui-sm text-pui-muted-foreground",
        "outline-none transition-colors duration-pui-fast ease-pui hover:bg-pui-accent hover:text-pui-foreground",
        "focus-visible:ring-pui focus-visible:ring-pui-ring",
        "disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent",
        className,
      )}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!disabled && !event.defaultPrevented) engine.handleKeyDown(event, card.id);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        engine.cancelKeyboard(card.id);
      }}
      {...props}
    >
      {children ?? <GripVertical aria-hidden="true" className="size-4" />}
    </button>
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
