import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";
import { autoScroll, createDragPreview, findScrollParent, startPointerDrag } from "../../utils/pointer-drag";
import { canStartDragFrom } from "../../utils/pointer-drag-sort";

// ---------------------------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------------------------

/** A slot: grid id and 0-based slot index (row by row). */
export interface SlotGridLocation {
  gridId: string;
  slot: number;
}

/**
 * A finished move. When the target slot was taken, `displaced` says where the item there went (the nearest free slot,
 * or the moved item's old slot). Apply it with `moveSlotGridItems`.
 */
export interface SlotGridMoveEvent {
  itemId: string;
  from: SlotGridLocation;
  to: SlotGridLocation;
  displaced?: { itemId: string; from: SlotGridLocation; to: SlotGridLocation };
}

/**
 * What happens when an item is dropped on a taken slot: `"nearest"` moves the item there to the nearest free slot of
 * that grid (the slot the moved item left counts as free) and swaps it into the moved item's old slot when the grid is
 * full; `"swap"` always swaps; `"none"` refuses the drop.
 */
export type SlotGridDisplace = "nearest" | "swap" | "none";

export interface SlotGridLabels {
  /** Role description of an item for screen readers. */
  item: string;
  /** How to move an item with the keyboard (read with the focused item). */
  instructions: string;
  pickedUp: (grid: string, slot: number) => string;
  moving: (grid: string, slot: number) => string;
  /** The move would be refused here (`canDrop`, a full grid with `displace="none"` …). */
  refused: (grid: string, slot: number) => string;
  dropped: (grid: string, slot: number) => string;
  cancelled: string;
}

export const defaultSlotGridLabels: SlotGridLabels = {
  item: "Movable item",
  instructions:
    "Press Space or Enter to pick the item up. Move it with the arrow keys, press Space or Enter to drop it, Escape to cancel.",
  pickedUp: (grid, slot) => `Picked up from ${grid}, slot ${slot}.`,
  moving: (grid, slot) => `${grid}, slot ${slot}.`,
  refused: (grid, slot) => `${grid}, slot ${slot}: can't be dropped here.`,
  dropped: (grid, slot) => `Dropped in ${grid}, slot ${slot}.`,
  cancelled: "Move cancelled.",
};

interface DragState {
  itemId: string;
  from: SlotGridLocation;
  /** The slot under the pointer (or chosen with the keyboard); `null` outside every grid. */
  to: SlotGridLocation | null;
  displaced: SlotGridMoveEvent["displaced"] | null;
  /** The drop is not allowed here (it would cancel). */
  refused: boolean;
  mode: "pointer" | "keyboard";
  /** Shift (px) per item id: the displaced item gliding to its new slot, the dragged one (keyboard) to the target. */
  offsets: Record<string, { x: number; y: number }>;
}

interface GroupContextValue {
  drag: DragState | null;
  settling: boolean;
  movable: boolean;
  instructionsId: string;
  labels: SlotGridLabels;
  register: (gridId: string, element: HTMLElement) => () => void;
  startPointer: (event: ReactPointerEvent<HTMLElement>, itemId: string) => void;
  handleKeyDown: (event: ReactKeyboardEvent<HTMLElement>, itemId: string) => void;
  cancelKeyboard: (itemId: string) => void;
  consumeDragClick: (itemId: string) => boolean;
}

const GroupContext = /* @__PURE__ */ createContext<GroupContextValue | null>(null);
const GridContext = /* @__PURE__ */ createContext<{ gridId: string; columns: number } | null>(null);

// ---------------------------------------------------------------------------------------------------------------------
// DOM helpers (event time only)
// ---------------------------------------------------------------------------------------------------------------------

const GRID_SELECTOR = '[data-slot="slot-grid"]';
const CELL_SELECTOR = '[data-slot="slot-grid-cell"]';
const ITEM_SELECTOR = '[data-slot="slot-grid-item"]';

interface GridInfo {
  id: string;
  element: HTMLElement;
  name: string;
  columns: number;
  slots: number;
  disabled: boolean;
  /** Item id per slot (other grids' items excluded). */
  occupant: Map<number, { id: string; disabled: boolean }>;
}

function readGrid(id: string, element: HTMLElement): GridInfo {
  const occupant = new Map<number, { id: string; disabled: boolean }>();
  for (const item of Array.from(element.querySelectorAll<HTMLElement>(ITEM_SELECTOR))) {
    if (item.closest(GRID_SELECTOR) !== element) continue;
    occupant.set(Number(item.dataset.slotIndex), { id: item.dataset.itemId!, disabled: item.hasAttribute("data-disabled") });
  }
  return {
    id,
    element,
    name: element.getAttribute("aria-label") || id,
    columns: Number(element.dataset.columns) || 1,
    slots: Number(element.dataset.slots) || 0,
    disabled: element.hasAttribute("data-disabled"),
    occupant,
  };
}

function cellRect(grid: HTMLElement, slot: number): DOMRect | null {
  for (const cell of Array.from(grid.querySelectorAll<HTMLElement>(CELL_SELECTOR))) {
    if (cell.closest(GRID_SELECTOR) === grid && Number(cell.dataset.cellIndex) === slot) return cell.getBoundingClientRect();
  }
  return null;
}

const center = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

/** Where item `itemId` is. */
function locate(all: GridInfo[], itemId: string): SlotGridLocation | null {
  for (const grid of all) for (const [slot, item] of grid.occupant) if (item.id === itemId) return { gridId: grid.id, slot };
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// SlotGridGroup (the drag engine)
// ---------------------------------------------------------------------------------------------------------------------

export interface SlotGridGroupProps {
  /** Called once per drop at a new slot (not on cancel). Without it nothing can be moved. Apply with `moveSlotGridItems`. */
  onMove?: (event: SlotGridMoveEvent) => void;
  /** What a drop on a taken slot does. @default "nearest" */
  displace?: SlotGridDisplace;
  /**
   * Your rules (weight, capacity, item types): called for a drop before it is shown as possible — with the displaced
   * item's move too, if there is one. `false` marks the slot red and the drop does nothing.
   */
  canDrop?: (move: SlotGridMoveEvent) => boolean;
  /** Nothing can be moved. */
  disabled?: boolean;
  /** Screen-reader texts (partial overrides, English by default). */
  labels?: Partial<SlotGridLabels>;
  children?: ReactNode;
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Lets items move between several `SlotGrid`s (backpack and trunk, two shelves of a layout tool). One `onMove`,
 * `displace` and `canDrop` for all of them. A single `SlotGrid` takes the same props itself.
 */
export function SlotGridGroup({
  onMove,
  displace = "nearest",
  canDrop,
  disabled = false,
  labels: labelOverrides,
  children,
}: SlotGridGroupProps) {
  const labels = useMemo(() => ({ ...defaultSlotGridLabels, ...labelOverrides }), [labelOverrides]);
  const instructionsId = useId();
  const [drag, setDrag] = useState<DragState | null>(null);
  const [settling, setSettling] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const movable = typeof onMove === "function" && !disabled;

  const gridsRef = useRef(new Map<string, HTMLElement>());
  const dragRef = useRef<DragState | null>(null);
  const update = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);
  const latest = useRef({ onMove, displace, canDrop, labels });
  latest.current = { onMove, displace, canDrop, labels };
  const cleanupRef = useRef<(() => void) | null>(null);
  const draggedClickRef = useRef<string | null>(null);
  const focusAfterRef = useRef<string | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  useIsomorphicLayoutEffect(() => {
    if (!settling) return;
    const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (fn: () => void) => setTimeout(fn, 16);
    const caf = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : clearTimeout;
    const frame = raf(() => setSettling(false));
    return () => caf(frame as number);
  }, [settling]);

  useEffect(() => {
    const id = focusAfterRef.current;
    if (drag || !id) return;
    focusAfterRef.current = null;
    for (const grid of gridsRef.current.values()) {
      const item = Array.from(grid.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).find((element) => element.dataset.itemId === id);
      if (item && !item.contains(item.ownerDocument.activeElement)) item.focus({ preventScroll: true });
    }
  }, [drag]);

  const register = useCallback((gridId: string, element: HTMLElement) => {
    gridsRef.current.set(gridId, element);
    return () => {
      if (gridsRef.current.get(gridId) === element) gridsRef.current.delete(gridId);
    };
  }, []);

  /** The grids in DOM order (keyboard moves go from one to the next). */
  const grids = useCallback(() => {
    const entries = Array.from(gridsRef.current.entries()).map(([id, element]) => readGrid(id, element));
    return entries.sort((a, b) => (a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  }, []);

  /** Everything a drag to `to` means: where a displaced item goes, whether it's allowed, the shifts to show it. */
  const resolve = useCallback(
    (all: GridInfo[], itemId: string, from: SlotGridLocation, to: SlotGridLocation | null, mode: DragState["mode"]): DragState => {
      const base: DragState = { itemId, from, to, displaced: null, refused: false, mode, offsets: {} };
      if (!to) return base;
      const target = all.find((grid) => grid.id === to.gridId);
      const source = all.find((grid) => grid.id === from.gridId);
      if (!target || !source || target.disabled || to.slot < 0 || to.slot >= target.slots) return { ...base, refused: true };
      const same = to.gridId === from.gridId && to.slot === from.slot;
      const occupant = target.occupant.get(to.slot);
      let displaced: DragState["displaced"] = null;
      let refused = false;
      if (!same && occupant && occupant.id !== itemId) {
        const { displace } = latest.current;
        if (occupant.disabled || displace === "none") refused = true;
        else {
          let destination: SlotGridLocation | null = null;
          if (displace === "nearest") {
            // Nearest free slot of the target grid by distance; the slot the dragged item leaves counts as free.
            const origin = cellRect(target.element, to.slot);
            let best = Infinity;
            for (let slot = 0; slot < target.slots; slot++) {
              if (slot === to.slot) continue;
              const taken = target.occupant.get(slot);
              const free = !taken || (target.id === from.gridId && slot === from.slot);
              if (!free) continue;
              const rect = cellRect(target.element, slot);
              if (!origin || !rect) continue;
              const a = center(origin);
              const b = center(rect);
              const distance = Math.hypot(a.x - b.x, a.y - b.y);
              if (distance < best - 0.5) {
                best = distance;
                destination = { gridId: target.id, slot };
              }
            }
          }
          // Full grid (or `swap`): into the dragged item's old slot.
          destination ??= from;
          displaced = { itemId: occupant.id, from: to, to: destination };
        }
      }
      if (!refused && !same && latest.current.canDrop) {
        const move: SlotGridMoveEvent = { itemId, from, to, ...(displaced && { displaced }) };
        refused = !latest.current.canDrop(move);
      }
      const offsets: DragState["offsets"] = {};
      const shift = (grid: HTMLElement, fromSlot: number, toGrid: HTMLElement, toSlot: number) => {
        const a = cellRect(grid, fromSlot);
        const b = cellRect(toGrid, toSlot);
        return a && b ? { x: b.left - a.left, y: b.top - a.top } : { x: 0, y: 0 };
      };
      if (displaced && !refused) {
        const destinationGrid = all.find((grid) => grid.id === displaced!.to.gridId)!;
        offsets[displaced.itemId] = shift(target.element, to.slot, destinationGrid.element, displaced.to.slot);
      }
      // Keyboard: the item itself travels to the target, highlighted.
      if (mode === "keyboard" && !same) offsets[itemId] = shift(source.element, from.slot, target.element, to.slot);
      return { ...base, displaced: refused ? null : displaced, refused, offsets };
    },
    [],
  );

  const finish = useCallback(
    (state: DragState | null, commit: boolean) => {
      update(null);
      if (!state) return;
      const { labels: texts, onMove: report } = latest.current;
      const all = grids();
      const name = (gridId: string) => all.find((grid) => grid.id === gridId)?.name ?? gridId;
      if (!commit || !state.to || state.refused) {
        setAnnouncement(texts.cancelled);
        return;
      }
      setAnnouncement(texts.dropped(name(state.to.gridId), state.to.slot + 1));
      if (state.to.gridId === state.from.gridId && state.to.slot === state.from.slot) return;
      setSettling(true);
      report?.({ itemId: state.itemId, from: state.from, to: state.to, ...(state.displaced && { displaced: state.displaced }) });
    },
    [grids, update],
  );

  const announceAt = useCallback((state: DragState, all: GridInfo[]) => {
    if (!state.to) return;
    const name = all.find((grid) => grid.id === state.to!.gridId)?.name ?? state.to.gridId;
    const { labels: texts } = latest.current;
    setAnnouncement(state.refused ? texts.refused(name, state.to.slot + 1) : texts.moving(name, state.to.slot + 1));
  }, []);

  const startPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>, itemId: string) => {
      if (!movable || event.button !== 0 || dragRef.current) return;
      draggedClickRef.current = null;
      const item = event.currentTarget;
      const doc = item.ownerDocument;
      let lastX = event.clientX;
      let lastY = event.clientY;
      let preview: HTMLElement | null = null;
      let frame = 0;
      let scroller: HTMLElement | null = null;
      let previousCursor = "";
      let activated = false;

      const recompute = () => {
        const current = dragRef.current;
        if (!current) return;
        const hit = doc.elementFromPoint(lastX, lastY);
        const cell = hit?.closest<HTMLElement>(`${CELL_SELECTOR}, ${ITEM_SELECTOR}`) ?? null;
        const grid = cell?.closest<HTMLElement>(GRID_SELECTOR) ?? null;
        const gridId = grid ? Array.from(gridsRef.current.entries()).find(([, element]) => element === grid)?.[0] : undefined;
        const slot = cell ? Number(cell.dataset.cellIndex ?? cell.dataset.slotIndex) : NaN;
        const to = gridId !== undefined && Number.isFinite(slot) ? { gridId, slot } : null;
        if (current.to?.gridId === to?.gridId && current.to?.slot === to?.slot) return;
        const all = grids();
        const next = resolve(all, current.itemId, current.from, to, "pointer");
        update(next);
        announceAt(next, all);
      };
      const tick = () => {
        if (autoScroll(scroller, lastX, lastY, "y")) recompute();
        frame = typeof requestAnimationFrame === "function" ? requestAnimationFrame(tick) : 0;
      };

      cleanupRef.current?.();
      cleanupRef.current = startPointerDrag(event, {
        onActivate: () => {
          const all = grids();
          const from = locate(all, itemId);
          if (!from) return;
          preview = createDragPreview(item, item, { slot: "slot-grid-drag-preview", opacity: "var(--pui-drag-preview-opacity, 0.6)" });
          scroller = findScrollParent(item);
          activated = true;
          previousCursor = doc.body.style.cursor;
          doc.body.style.cursor = "grabbing";
          update({ itemId, from, to: from, displaced: null, refused: false, mode: "pointer", offsets: {} });
          const name = all.find((grid) => grid.id === from.gridId)?.name ?? from.gridId;
          setAnnouncement(latest.current.labels.pickedUp(name, from.slot + 1));
          if (typeof requestAnimationFrame === "function") frame = requestAnimationFrame(tick);
        },
        onMove: (e, dx, dy) => {
          lastX = e.clientX;
          lastY = e.clientY;
          if (preview) preview.style.transform = `translate(${dx}px, ${dy}px)`;
          recompute();
        },
        onEnd: (commit) => {
          draggedClickRef.current = itemId;
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
    [announceAt, finish, grids, movable, resolve, update],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, itemId: string) => {
      if (!movable || event.target !== event.currentTarget) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const current = dragRef.current;
      const pick = event.key === " " || event.key === "Enter";
      const all = grids();

      if (!current) {
        if (!pick || event.repeat) return;
        event.preventDefault();
        const from = locate(all, itemId);
        if (!from) return;
        update({ itemId, from, to: from, displaced: null, refused: false, mode: "keyboard", offsets: {} });
        const name = all.find((grid) => grid.id === from.gridId)?.name ?? from.gridId;
        setAnnouncement(latest.current.labels.pickedUp(name, from.slot + 1));
        return;
      }
      if (current.mode !== "keyboard" || current.itemId !== itemId) return;
      if (pick) {
        event.preventDefault();
        if (event.repeat) return;
        focusAfterRef.current = itemId;
        finish(current, true);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(current, false);
        return;
      }
      const at = current.to ?? current.from;
      let gridIndex = all.findIndex((grid) => grid.id === at.gridId);
      let grid = all[gridIndex];
      if (!grid) return;
      let column = at.slot % grid.columns;
      let row = Math.floor(at.slot / grid.columns);
      const rows = Math.ceil(grid.slots / grid.columns);
      if (event.key === "ArrowUp") row = Math.max(0, row - 1);
      else if (event.key === "ArrowDown") row = Math.min(rows - 1, row + 1);
      else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const step = event.key === "ArrowLeft" ? -1 : 1;
        column += step;
        if (column < 0 || column >= grid.columns) {
          // Past the edge: on into the next grid that takes drops, same row where it has one.
          let next = gridIndex + step;
          while (all[next]?.disabled) next += step;
          if (!all[next]) {
            event.preventDefault();
            return;
          }
          gridIndex = next;
          grid = all[next];
          column = step > 0 ? 0 : grid.columns - 1;
          row = Math.min(row, Math.ceil(grid.slots / grid.columns) - 1);
        }
      } else return;
      event.preventDefault();
      const slot = Math.min(row * grid.columns + column, grid.slots - 1);
      const next = resolve(all, itemId, current.from, { gridId: grid.id, slot }, "keyboard");
      update(next);
      announceAt(next, all);
    },
    [announceAt, finish, grids, movable, resolve, update],
  );

  const cancelKeyboard = useCallback(
    (itemId: string) => {
      const current = dragRef.current;
      if (current?.mode === "keyboard" && current.itemId === itemId) finish(current, false);
    },
    [finish],
  );

  const consumeDragClick = useCallback((itemId: string) => {
    if (draggedClickRef.current !== itemId) return false;
    draggedClickRef.current = null;
    return true;
  }, []);

  const value = useMemo<GroupContextValue>(
    () => ({ drag, settling, movable, instructionsId, labels, register, startPointer, handleKeyDown, cancelKeyboard, consumeDragClick }),
    [drag, settling, movable, instructionsId, labels, register, startPointer, handleKeyDown, cancelKeyboard, consumeDragClick],
  );

  return (
    <GroupContext.Provider value={value}>
      {children}
      {movable && (
        <span id={instructionsId} hidden>
          {labels.instructions}
        </span>
      )}
      <span className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {announcement}
      </span>
    </GroupContext.Provider>
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// SlotGrid
// ---------------------------------------------------------------------------------------------------------------------

export interface SlotGridProps extends HTMLAttributes<HTMLDivElement>, Omit<SlotGridGroupProps, "children"> {
  /** Stable id, reported in `onMove`. @default an id of its own */
  id?: string;
  /** Name for screen readers and announcements ("Dropped in Trunk, slot 3"). */
  label?: string;
  /** Number of columns. */
  columns: number;
  /** Number of slots (cells). */
  slots: number;
  /** No drops into this grid (its items can still be moved out unless they are disabled). */
  disabledGrid?: boolean;
  /** Classes of every empty cell. */
  cellClassName?: string;
}

/**
 * A grid of fixed slots — an inventory, a seating plan, shelves of a layout tool — whose items (`SlotGridItem` with a
 * `slot`) move with the pointer or the keyboard. Empty cells stay empty; dropping on a taken slot moves the item there
 * to the nearest free slot (`displace`), live while dragging. Several grids exchange items inside a `SlotGridGroup`;
 * a single grid takes `onMove`, `displace`, `canDrop`, `disabled` and `labels` itself. Pointer events instead of HTML5
 * drag & drop, so it works in FiveM's CEF. The grid only reports moves — your state decides where items are.
 */
export const SlotGrid = /* @__PURE__ */ forwardRef<HTMLDivElement, SlotGridProps>(function SlotGrid(props, ref) {
  const group = useContext(GroupContext);
  const { onMove, displace, canDrop, disabled, labels, ...rest } = props;
  // Inside a SlotGridGroup the group's settings apply; the grid's own are only for a grid on its own.
  if (group) return <SlotGridInner ref={ref} {...rest} />;
  return (
    <SlotGridGroup onMove={onMove} displace={displace} canDrop={canDrop} disabled={disabled} labels={labels}>
      <SlotGridInner ref={ref} {...rest} />
    </SlotGridGroup>
  );
});

const SlotGridInner = /* @__PURE__ */ forwardRef<HTMLDivElement, Omit<SlotGridProps, keyof Omit<SlotGridGroupProps, "children">>>(
  function SlotGridInner({ id: idProp, label, columns, slots, disabledGrid = false, cellClassName, className, style, children, ...props }, ref) {
    const group = useContext(GroupContext)!;
    const ownId = useId();
    const gridId = idProp ?? ownId;
    const element = useRef<HTMLDivElement | null>(null);
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        element.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    const { register } = group;
    useEffect(() => (element.current ? register(gridId, element.current) : undefined), [register, gridId]);
    const gridContext = useMemo(() => ({ gridId, columns }), [gridId, columns]);
    const drag = group.drag;
    const targetSlot = drag?.to?.gridId === gridId ? drag.to.slot : null;
    return (
      <GridContext.Provider value={gridContext}>
        <div
          ref={setRefs}
          role="group"
          aria-label={label}
          data-slot="slot-grid"
          data-grid-id={gridId}
          data-columns={columns}
          data-slots={slots}
          data-disabled={disabledGrid ? "" : undefined}
          data-dragging={drag ? "" : undefined}
          className={cn("grid gap-1.5", drag?.mode === "pointer" && "select-none", className)}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, ...style }}
          {...props}
        >
          {Array.from({ length: slots }, (_, slot) => {
            const target = targetSlot === slot && !(drag!.from.gridId === gridId && drag!.from.slot === slot);
            return (
              <div
                key={`cell-${slot}`}
                aria-hidden="true"
                data-slot="slot-grid-cell"
                data-cell-index={slot}
                data-target={target ? (drag!.refused ? "refused" : drag!.mode) : undefined}
                className={cn(
                  "aspect-square min-w-0 rounded-pui-md border border-pui-border bg-pui-muted/40",
                  "transition-colors duration-pui-fast ease-pui",
                  // Where the item lands: tinted like SortableList's slot; red where it may not.
                  "data-[target=pointer]:border-dashed data-[target=pointer]:border-pui-primary/tint-border data-[target=pointer]:bg-pui-primary/tint",
                  "data-[target=keyboard]:border-pui-primary data-[target=keyboard]:bg-pui-primary/tint",
                  "data-[target=refused]:border-pui-negative/tint-border data-[target=refused]:bg-pui-negative/tint",
                  cellClassName,
                )}
                style={{ gridColumn: (slot % columns) + 1, gridRow: Math.floor(slot / columns) + 1 }}
              />
            );
          })}
          {children}
        </div>
      </GridContext.Provider>
    );
  },
);

// ---------------------------------------------------------------------------------------------------------------------
// SlotGridItem
// ---------------------------------------------------------------------------------------------------------------------

export interface SlotGridItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "slot"> {
  /** Stable id, reported in `onMove`. */
  id: string;
  /** The slot it sits in (0-based, row by row). */
  slot: number;
  /** Can't be moved — and can't be pushed aside: a drop on its slot is refused. */
  disabled?: boolean;
}

/** An item in a `SlotGrid` slot. Put any content inside; clicks still work (a drag never fires the click). */
export const SlotGridItem = /* @__PURE__ */ forwardRef<HTMLDivElement, SlotGridItemProps>(function SlotGridItem(
  { id, slot, disabled = false, className, style, onPointerDown, onKeyDown, onBlur, onClickCapture, children, ...props },
  ref,
) {
  const group = useContext(GroupContext);
  const grid = useContext(GridContext);
  if (!group || !grid) throw new Error("SlotGridItem must be used within <SlotGrid />");
  const { drag, settling, movable, instructionsId, labels } = group;
  const draggable = movable && !disabled;
  const dragging = drag?.itemId === id ? drag.mode : undefined;
  // Pointer drag over another slot: the item leaves its place (the copy follows the cursor, the target cell shows
  // where it lands).
  const away = dragging === "pointer" && drag!.to != null && !(drag!.to.gridId === drag!.from.gridId && drag!.to.slot === drag!.from.slot);
  const offset = drag?.offsets[id];
  const itemStyle: CSSProperties = {
    gridColumn: (slot % grid.columns) + 1,
    gridRow: Math.floor(slot / grid.columns) + 1,
    ...(offset && { transform: `translate3d(${offset.x}px, ${offset.y}px, 0px)` }),
    ...style,
  };
  return (
    <div
      ref={ref}
      data-slot="slot-grid-item"
      data-item-id={id}
      data-slot-index={slot}
      data-disabled={disabled ? "" : undefined}
      data-dragging={dragging}
      data-away={away ? "" : undefined}
      data-displaced={drag?.displaced?.itemId === id ? "" : undefined}
      tabIndex={0}
      aria-roledescription={draggable ? labels.item : undefined}
      aria-describedby={draggable ? instructionsId : undefined}
      aria-pressed={draggable ? dragging !== undefined : undefined}
      style={itemStyle}
      className={cn(
        "relative z-[1] flex min-w-0 items-center justify-center overflow-hidden rounded-pui-md border border-pui-border bg-pui-card p-1 text-xs text-pui-card-foreground",
        "outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
        drag && !settling && "transition-transform duration-pui-base ease-pui",
        draggable && "cursor-grab touch-none",
        // Picked up but still over its own slot: the empty, tinted slot of SortableList.
        "data-[dragging=pointer]:border-dashed data-[dragging=pointer]:border-pui-primary/tint-border data-[dragging=pointer]:bg-pui-primary/tint [&[data-dragging=pointer]>*]:invisible",
        "data-[dragging=keyboard]:z-10 data-[dragging=keyboard]:border-pui-primary data-[dragging=keyboard]:bg-pui-primary/tint",
        "data-[away]:invisible",
        "data-[displaced]:z-[2]",
        "data-[disabled]:cursor-default",
        className,
      )}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!draggable || event.defaultPrevented) return;
        if (!canStartDragFrom(event.currentTarget, event.target)) return;
        group.startPointer(event, id);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (draggable && !event.defaultPrevented) group.handleKeyDown(event, id);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        if (event.target === event.currentTarget) group.cancelKeyboard(id);
      }}
      onClickCapture={(event) => {
        if (group.consumeDragClick(id)) {
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
 * Applies a `SlotGridMoveEvent` to a flat item list `{ id, grid, slot }[]` and returns a new list (the input is not
 * mutated): the moved item gets its new grid and slot, a displaced one too.
 */
export function moveSlotGridItems<T extends { id: string; grid: string; slot: number }>(items: readonly T[], event: SlotGridMoveEvent): T[] {
  return items.map((item) => {
    if (item.id === event.itemId) return { ...item, grid: event.to.gridId, slot: event.to.slot };
    if (event.displaced && item.id === event.displaced.itemId) {
      return { ...item, grid: event.displaced.to.gridId, slot: event.displaced.to.slot };
    }
    return item;
  });
}
