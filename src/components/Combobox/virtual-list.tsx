/**
 * Internal windowing for `ComboboxList` / `AutocompleteList` with Base UI's `virtualized` root prop — not exported
 * from the package index. Rows have a fixed height, so the layout is plain arithmetic: no measuring, no extra
 * dependency. Only the rows inside the scroll viewport (plus `overscan`) are in the DOM.
 *
 * How it plugs into Base UI (~1.8): with `virtualized`, the root keeps its navigation list as long as the filtered
 * items (`listRef.length = count`) and items register themselves at their `index`, so the arrow keys walk all items
 * even though only a window is rendered. Base UI scrolls a highlighted item into view only when it is rendered; for
 * jumps (wrap-around, typing, opening on the selected item) the root wrapper forwards `onItemHighlighted` through the
 * bridge below, and the list scrolls the row into view itself.
 */
import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import {
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { groupLabelClass } from "../Select/select-styles";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Viewport height assumed before the list is measured (SSR, first render, jsdom): about the 18rem list max height. */
const ESTIMATED_VIEWPORT = 320;

type ScrollTarget = { index: number; center: boolean };

/** Connects the root wrapper (sees highlight changes) with the mounted list (owns the scroller). */
export interface VirtualBridge {
  scrollTo: ((target: ScrollTarget) => void) | null;
  pending: ScrollTarget | null;
}

export const VirtualBridgeContext = /* @__PURE__ */ createContext<VirtualBridge | null>(null);

function createBridge(): VirtualBridge {
  return { scrollTo: null, pending: null };
}

type HighlightHandler = (value: unknown, details: { reason: string; index: number }) => void;

/**
 * Root helper: returns the bridge (only when `virtualized`) and an `onItemHighlighted` that also scrolls the
 * highlighted row into view. Pointer highlights never scroll (the row is under the pointer already).
 */
export function useVirtualRoot<Handler extends ((value: never, details: never) => void) | undefined>(
  virtualized: boolean | undefined,
  onItemHighlighted: Handler,
): { bridge: VirtualBridge | null; onItemHighlighted: Handler } {
  const [bridge] = useState(createBridge);
  if (!virtualized) return { bridge: null, onItemHighlighted };
  const handler: HighlightHandler = (value, details) => {
    (onItemHighlighted as HighlightHandler | undefined)?.(value, details);
    if (details.index < 0) {
      bridge.pending = null;
      return;
    }
    if (details.reason === "pointer") return;
    // Keyboard steps scroll as little as possible; anything else (opening on the selected item, typing) centres.
    const target = { index: details.index, center: details.reason !== "keyboard" };
    if (bridge.scrollTo) bridge.scrollTo(target);
    else bridge.pending = target;
  };
  return { bridge, onItemHighlighted: handler as unknown as Handler };
}

/** Per-row data for `ComboboxItem` / `AutocompleteItem`: index for Base UI, set size and position for screen readers. */
export interface VirtualRow {
  index: number;
  setSize: number;
  posInSet: number;
}

export const VirtualRowContext = /* @__PURE__ */ createContext<VirtualRow | null>(null);

export function useVirtualRow(): VirtualRow | null {
  return useContext(VirtualRowContext);
}

/** A group of the `items` prop: `{ value, items }` (Base UI's grouped shape). */
export interface VirtualListGroup<Item = unknown> {
  value: unknown;
  items: readonly Item[];
}

export interface VirtualListOptions {
  /**
   * Height of every item row in px (virtualized lists only). Rows are positioned by this value, so it must match the
   * rendered item; items fill it. Default `32` (the default option row).
   */
  itemHeight?: number;
  /** Height of a group label row in px (virtualized, grouped items only). Default `28` (the default label). */
  groupLabelHeight?: number;
  /** Rows rendered above and below the visible part (virtualized lists only). Default `6`. */
  overscan?: number;
  /**
   * Content of a group label in a virtualized grouped list (the list renders the group and label itself).
   * Default: the group's `value` as text.
   */
  renderGroupLabel?: (group: VirtualListGroup) => ReactNode;
}

type LayoutRow =
  | { kind: "item"; item: unknown; index: number; group: number; pos: number; size: number }
  | { kind: "label"; group: number };

interface Layout {
  rows: LayoutRow[];
  tops: number[];
  heights: number[];
  /** Flat item index → row index. */
  itemRows: number[];
  groups: VirtualListGroup[];
  /** Group index → its label row. */
  labelRows: number[];
  total: number;
}

function isGroup(value: unknown): value is VirtualListGroup {
  return typeof value === "object" && value !== null && Array.isArray((value as { items?: unknown }).items);
}

function computeLayout(filtered: readonly unknown[], itemHeight: number, labelHeight: number): Layout {
  const layout: Layout = { rows: [], tops: [], heights: [], itemRows: [], groups: [], labelRows: [], total: 0 };
  const push = (row: LayoutRow, height: number) => {
    layout.rows.push(row);
    layout.tops.push(layout.total);
    layout.heights.push(height);
    layout.total += height;
  };
  if (!isGroup(filtered[0])) {
    filtered.forEach((item, index) => {
      layout.itemRows.push(layout.rows.length);
      push({ kind: "item", item, index, group: -1, pos: index + 1, size: filtered.length }, itemHeight);
    });
    return layout;
  }
  let index = 0;
  (filtered as readonly VirtualListGroup[]).forEach((group) => {
    if (group.items.length === 0) return;
    const g = layout.groups.length;
    layout.groups.push(group);
    layout.labelRows.push(layout.rows.length);
    push({ kind: "label", group: g }, labelHeight);
    group.items.forEach((item, pos) => {
      layout.itemRows.push(layout.rows.length);
      push({ kind: "item", item, index, group: g, pos: pos + 1, size: group.items.length }, itemHeight);
      index += 1;
    });
  });
  return layout;
}

/** Last row whose top is at or above `offset`. */
function rowAt(tops: number[], offset: number): number {
  let low = 0;
  let high = tops.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (tops[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return low;
}

function visibleRange(layout: Layout, top: number, height: number, overscanPx: number): [number, number] {
  if (layout.rows.length === 0) return [0, -1];
  const clampedTop = Math.max(0, Math.min(top, layout.total - height));
  return [rowAt(layout.tops, Math.max(0, clampedTop - overscanPx)), rowAt(layout.tops, clampedTop + height + overscanPx)];
}

function viewportHeight(element: HTMLElement): number {
  const height = element.clientHeight;
  if (height <= 0) return ESTIMATED_VIEWPORT;
  // Until the positioner sets `--available-height` the list has no max height yet; never window more than a screen.
  const screen = element.ownerDocument.defaultView?.innerHeight ?? height;
  return Math.min(height, screen);
}

interface VirtualListBodyProps extends VirtualListOptions {
  /** The list element, which is the scroll viewport (state: its ref is attached after this body's effects). */
  scroller: HTMLElement | null;
  bridge: VirtualBridge;
  children: ReactNode | ((item: never, index: number) => ReactNode);
  /** `"combobox"` or `"autocomplete"`, for the `data-slot` names. */
  slot: string;
}

/** The windowed content of a virtualized list: a sizer with absolutely positioned rows. */
export function VirtualListBody({
  scroller,
  bridge,
  children,
  slot,
  itemHeight = 32,
  groupLabelHeight = 28,
  overscan = 6,
  renderGroupLabel,
}: VirtualListBodyProps) {
  const filtered = BaseCombobox.useFilteredItems<unknown>() as readonly unknown[];
  const layout = useMemo(() => computeLayout(filtered, itemHeight, groupLabelHeight), [filtered, itemHeight, groupLabelHeight]);
  const overscanPx = overscan * itemHeight;
  const [view, setView] = useState({ top: 0, height: ESTIMATED_VIEWPORT });

  const scrollerRef = useRef(scroller);
  const layoutRef = useRef(layout);
  const overscanRef = useRef(overscanPx);
  useIsomorphicLayoutEffect(() => {
    scrollerRef.current = scroller;
    layoutRef.current = layout;
    overscanRef.current = overscanPx;
  });

  /** Re-renders only when the window of rows changes, not on every scrolled pixel. */
  const sync = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) return;
    const next = { top: element.scrollTop, height: viewportHeight(element) };
    setView((prev) => {
      const a = visibleRange(layoutRef.current, prev.top, prev.height, overscanRef.current);
      const b = visibleRange(layoutRef.current, next.top, next.height, overscanRef.current);
      return a[0] === b[0] && a[1] === b[1] ? prev : next;
    });
  }, []);

  const scrollTo = useCallback(
    ({ index, center }: ScrollTarget) => {
      const element = scrollerRef.current;
      const current = layoutRef.current;
      const rowIndex = current.itemRows[index];
      if (!element || rowIndex === undefined) return;
      const row = current.rows[rowIndex];
      const height = viewportHeight(element);
      const itemTop = current.tops[rowIndex];
      const itemBottom = itemTop + current.heights[rowIndex];
      // The first item of a group brings its label along.
      const startTop = row.kind === "item" && row.pos === 1 && row.group >= 0 ? current.tops[current.labelRows[row.group]] : itemTop;
      let top = element.scrollTop;
      if (center) top = itemTop - (height - (itemBottom - itemTop)) / 2;
      else if (startTop < top) top = startTop;
      else if (itemBottom > top + height) top = itemBottom - height;
      top = Math.max(0, Math.min(Math.round(top), current.total - height));
      if (top !== element.scrollTop) element.scrollTop = top;
      // Render the target row now: the input's `aria-activedescendant` points at it right away.
      setView({ top, height });
    },
    [],
  );

  useIsomorphicLayoutEffect(() => {
    const element = scroller;
    if (!element) return;
    sync();
    element.addEventListener("scroll", sync, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync);
    observer?.observe(element);
    bridge.scrollTo = scrollTo;
    if (bridge.pending) {
      scrollTo(bridge.pending);
      bridge.pending = null;
    }
    return () => {
      element.removeEventListener("scroll", sync);
      observer?.disconnect();
      if (bridge.scrollTo === scrollTo) bridge.scrollTo = null;
    };
  }, [bridge, scroller, scrollTo, sync]);

  // A new result set starts at the top, like the non-virtualized list (Base UI leaves that to virtualized lists).
  const firstFiltered = useRef(filtered);
  useIsomorphicLayoutEffect(() => {
    if (firstFiltered.current === filtered) return;
    firstFiltered.current = filtered;
    const element = scrollerRef.current;
    if (element && element.scrollTop !== 0) element.scrollTop = 0;
    setView((prev) => (prev.top === 0 ? prev : { ...prev, top: 0 }));
  }, [filtered]);

  const [first, last] = visibleRange(layout, view.top, view.height, overscanPx);
  const renderItem = typeof children === "function" ? (children as (item: unknown, index: number) => ReactNode) : null;

  const rowStyle = (rowIndex: number): CSSProperties => ({
    position: "absolute",
    top: layout.tops[rowIndex],
    left: 0,
    right: 0,
    height: layout.heights[rowIndex],
    display: "flex",
  });

  const renderItemRow = (rowIndex: number) => {
    const row = layout.rows[rowIndex];
    if (row.kind !== "item" || !renderItem) return null;
    const node = renderItem(row.item, row.index);
    const key = isValidElement(node) && node.key != null ? node.key : `item-${row.index}`;
    return (
      <div key={key} role="presentation" data-slot={`${slot}-row`} style={rowStyle(rowIndex)}>
        <VirtualRowContext.Provider value={{ index: row.index, setSize: row.size, posInSet: row.pos }}>{node}</VirtualRowContext.Provider>
      </div>
    );
  };

  let content: ReactNode;
  if (layout.groups.length === 0) {
    const rows: ReactNode[] = [];
    for (let i = first; i <= last; i += 1) rows.push(renderItemRow(i));
    content = rows;
  } else {
    // One `role="group"` per group with a visible row. Its label is always rendered (at its own offset, even when
    // scrolled out) so `aria-labelledby` resolves. The group element is static: rows position against the sizer.
    const byGroup = new Map<number, number[]>();
    for (let i = first; i <= last; i += 1) {
      const row = layout.rows[i];
      if (row.kind !== "item") {
        if (!byGroup.has(row.group)) byGroup.set(row.group, []);
        continue;
      }
      const list = byGroup.get(row.group);
      if (list) list.push(i);
      else byGroup.set(row.group, [i]);
    }
    content = Array.from(byGroup, ([g, rowIndexes]) => {
      const group = layout.groups[g];
      const labelRow = layout.labelRows[g];
      return (
        <BaseCombobox.Group key={`group-${String(group.value)}-${g}`} data-slot={`${slot}-group`} className="block">
          <BaseCombobox.GroupLabel data-slot={`${slot}-label`} className={groupLabelClass} style={{ ...rowStyle(labelRow), display: "block" }}>
            {renderGroupLabel ? renderGroupLabel(group) : String(group.value)}
          </BaseCombobox.GroupLabel>
          {rowIndexes.map(renderItemRow)}
        </BaseCombobox.Group>
      );
    });
  }

  if (layout.rows.length === 0) return null;
  return (
    <div role="presentation" data-slot={`${slot}-sizer`} style={{ position: "relative", width: "100%", height: layout.total }}>
      {content}
    </div>
  );
}
