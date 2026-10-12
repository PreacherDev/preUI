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
} from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import {
  canStartDragFrom,
  defaultSortLabels,
  useSortEngine,
  type SortEngine,
  type SortLabels,
} from "../../utils/pointer-drag-sort";

// ---------------------------------------------------------------------------------------------------------------------
// Types and contexts
// ---------------------------------------------------------------------------------------------------------------------

/** Screen-reader texts of a `SortableList` (positions are 1-based). */
export type SortableLabels = SortLabels;

export const defaultSortableLabels: SortableLabels = defaultSortLabels;

interface SortableContextValue {
  engine: SortEngine;
  instructionsId: string;
  labels: SortableLabels;
}

interface SortableItemContextValue {
  id: string;
  disabled: boolean;
  registerHandle: () => () => void;
}

const SortableContext = /* @__PURE__ */ createContext<SortableContextValue | null>(null);
const SortableItemContext = /* @__PURE__ */ createContext<SortableItemContextValue | null>(null);

function useSortable(part: string) {
  const context = useContext(SortableContext);
  if (!context) throw new Error(`${part} must be used within <SortableList />`);
  return context;
}

// ---------------------------------------------------------------------------------------------------------------------
// SortableList
// ---------------------------------------------------------------------------------------------------------------------

export interface SortableListProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Called once when an item is dropped at a new position, with the 0-based index it came from and the index it
   * ends up at. Apply it with `moveItem(list, from, to)`. Without it the list is read-only.
   */
  onMove?: (from: number, to: number) => void;
  /** No item can be moved (handles are disabled). */
  disabled?: boolean;
  /** Screen-reader texts (partial overrides, English by default). */
  labels?: Partial<SortableLabels>;
}

/**
 * A vertical list whose items (`SortableItem`) can be reordered with the pointer (4px threshold; a see-through copy
 * follows the cursor while the other items slide to their new places; the list's scroll box scrolls near its
 * edges) or the keyboard (Space/Enter lifts and drops, arrows / Home / End move, Escape cancels, each step
 * announced). Pointer events instead of HTML5 drag & drop, so it works in FiveM's CEF. Plain rows that fit into a
 * form; the list only reports moves (`onMove`), your state decides the order.
 */
export const SortableList = /* @__PURE__ */ forwardRef<HTMLDivElement, SortableListProps>(function SortableList(
  { onMove, disabled = false, labels: labelOverrides, className, children, ...props },
  forwardedRef,
) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const instructionsId = useId();
  const labels = useMemo(() => ({ ...defaultSortableLabels, ...labelOverrides }), [labelOverrides]);
  const engine = useSortEngine({ listRef, onMove, labels, disabled, previewSlot: "sortable-drag-preview" });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const value = useMemo<SortableContextValue>(() => ({ engine, instructionsId, labels }), [engine, instructionsId, labels]);
  const { drag } = engine;

  return (
    <SortableContext.Provider value={value}>
      <div
        ref={setRefs}
        role="list"
        data-slot="sortable-list"
        data-sortable-list=""
        data-dragging={drag ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn("flex flex-col gap-2", drag?.mode === "pointer" && "select-none", className)}
        {...props}
      >
        {children}
      </div>
      {engine.movable && (
        <span id={instructionsId} hidden>
          {labels.instructions}
        </span>
      )}
      <span className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {engine.announcement}
      </span>
    </SortableContext.Provider>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// SortableItem
// ---------------------------------------------------------------------------------------------------------------------

export interface SortableItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Stable id of the item (e.g. the record id); also the React `key`. */
  id: string;
  /** This item can't be picked up (the others still move around it). */
  disabled?: boolean;
}

/**
 * One row of a `SortableList`. With a `SortableItemHandle` inside, only the handle starts a drag (and takes the
 * keyboard focus); without one the whole row is the handle (presses on inputs, buttons and links inside are ignored).
 */
export const SortableItem = /* @__PURE__ */ forwardRef<HTMLDivElement, SortableItemProps>(function SortableItem(
  { id, disabled = false, className, style, onPointerDown, onKeyDown, onBlur, onClickCapture, children, ...props },
  ref,
) {
  const { engine, instructionsId, labels } = useSortable("SortableItem");
  const [handles, setHandles] = useState(0);
  const registerHandle = useCallback(() => {
    setHandles((count) => count + 1);
    return () => setHandles((count) => count - 1);
  }, []);
  const itemContext = useMemo(() => ({ id, disabled, registerHandle }), [id, disabled, registerHandle]);

  const { drag, settling, movable } = engine;
  const draggable = movable && !disabled;
  const selfHandle = draggable && handles === 0;
  const dragging = drag?.id === id ? drag.mode : undefined;

  return (
    <SortableItemContext.Provider value={itemContext}>
      <div
        ref={ref}
        role="listitem"
        data-slot="sortable-item"
        data-sortable-id={id}
        data-dragging={dragging}
        data-disabled={disabled ? "" : undefined}
        tabIndex={selfHandle ? 0 : undefined}
        aria-roledescription={selfHandle ? labels.item : undefined}
        aria-describedby={selfHandle ? instructionsId : undefined}
        style={engine.itemStyle(id, style)}
        className={cn(
          // A plain row like a form field: no card look, no shadow.
          "relative flex min-w-0 items-center gap-2 rounded-pui-md border border-pui-border bg-pui-background px-3 py-2 text-sm text-pui-foreground [overflow-wrap:anywhere]",
          "outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
          drag && !settling && "transition-transform duration-pui-base ease-pui",
          selfHandle && "cursor-grab touch-none",
          // Pointer: an empty, tinted slot marks where the item lands (the see-through copy follows the cursor).
          // Keyboard: the item itself moves, highlighted.
          "data-[dragging=pointer]:border-dashed data-[dragging=pointer]:border-pui-primary/tint-border data-[dragging=pointer]:bg-pui-primary/tint data-[dragging=pointer]:text-transparent [&[data-dragging=pointer]>*]:invisible",
          "data-[dragging=keyboard]:z-10 data-[dragging=keyboard]:border-pui-primary data-[dragging=keyboard]:bg-pui-primary/tint",
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
    </SortableItemContext.Provider>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// SortableItemHandle
// ---------------------------------------------------------------------------------------------------------------------

export type SortableItemHandleProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * The grip of a `SortableItem` (a `GripVertical` icon unless you pass children). Starts pointer drags and is the
 * keyboard stop of the item: Space/Enter lifts and drops, arrows move, Escape cancels.
 */
export const SortableItemHandle = /* @__PURE__ */ forwardRef<HTMLButtonElement, SortableItemHandleProps>(function SortableItemHandle(
  { className, disabled: disabledProp, onKeyDown, onBlur, children, ...props },
  ref,
) {
  const { engine, instructionsId, labels } = useSortable("SortableItemHandle");
  const item = useContext(SortableItemContext);
  if (!item) throw new Error("SortableItemHandle must be used within <SortableItem />");
  const GripVertical = useIcon("gripVertical");
  const { registerHandle } = item;
  useEffect(() => registerHandle(), [registerHandle]);

  const disabled = disabledProp || item.disabled || !engine.movable;
  const dragging = engine.drag?.id === item.id;

  return (
    <button
      ref={ref}
      type="button"
      data-slot="sortable-item-handle"
      data-sortable-handle=""
      disabled={disabled}
      aria-label={labels.handle}
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
        if (!disabled && !event.defaultPrevented) engine.handleKeyDown(event, item.id);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        engine.cancelKeyboard(item.id);
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
 * Returns a new array with the item at `from` moved to `to` (the index it has afterwards), as reported by
 * `SortableList`'s `onMove` and `DataTable`'s `onRowMove`. The input is not mutated; out-of-range indexes return
 * it unchanged.
 */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return list.slice();
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
