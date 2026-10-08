import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "../../utils/cn";
import { useScrollTabStop } from "../../utils/scroll-tab-stop";
import { useHasFallbackRef, type HasFallbackRule } from "../../utils/use-has-fallback";
import { ScrollArea, type ScrollAreaReserveTrack } from "../ScrollArea/ScrollArea";

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Classes for the bordered wrapper around the scrolling `<table>`, e.g. `max-h-64` or `rounded-none`. */
  containerClassName?: string;
  /**
   * Reserve room for a scrollbar instead of letting it float over the cells (see `ScrollArea`): `"horizontal"` keeps
   * the last row free of the horizontal bar, `"vertical"` the last column of the vertical one. @default false
   */
  reserveTrack?: ScrollAreaReserveTrack;
}

/**
 * Bordered data table on the card surface. The table scrolls both ways in a preUI `ScrollArea` inside the
 * bordered wrapper (constrain its height with `containerClassName="max-h-…"`); the header sticks to its top.
 * The scrollbars float over the cell padding, so nothing shifts when they appear.
 */
// `[&:has([role=checkbox])]` on the cells, emulated for browsers without :has() (Chromium < 105).
const tableHasRules: HasFallbackRule[] = [{ attr: "data-has-checkbox", has: "[role=checkbox]", target: "th, td" }];

export const Table = /* @__PURE__ */ forwardRef<HTMLTableElement, TableProps>(function Table(
  { className, containerClassName, reserveTrack = false, ...props },
  ref,
) {
  const tabStop = useScrollTabStop();
  const tableRef = useHasFallbackRef(ref, tableHasRules);
  const containerRef = useRef<HTMLDivElement>(null);
  useHeaderHeight(containerRef);
  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      className={cn(
        // Own text colour: inside a muted parent (e.g. AccordionContent) the cells would otherwise turn grey.
        "relative flex w-full flex-col overflow-hidden rounded-pui border border-pui-border bg-pui-card text-pui-card-foreground",
        containerClassName,
      )}
    >
      <ScrollArea
        orientation="both"
        reserveTrack={reserveTrack}
        viewportRef={tabStop.viewportRef}
        viewportProps={tabStop.viewportProps}
        // The vertical scrollbar starts below the sticky header (Base UI sets `top: 0` inline, hence `!`).
        className="[&>[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:!top-[var(--pui-table-header-height,0px)]"
      >
        <table
          ref={tableRef}
          data-slot="table"
          className={cn("w-full caption-bottom border-collapse text-sm", className)}
          {...props}
        />
      </ScrollArea>
    </div>
  );
});

/**
 * Keeps `--pui-table-header-height` on the container at the height of the table's `<thead>` (0 without one), so
 * the vertical scrollbar can start below the sticky header. Measured after mount (SSR-safe) and on every resize of
 * the table or the header.
 */
function useHeaderHeight(containerRef: { current: HTMLDivElement | null }) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const table = container.querySelector<HTMLTableElement>("[data-slot=table]");
    let observed: Element | null = null;
    const update = () => {
      const head = table?.tHead ?? null;
      if (head && head !== observed) {
        observed = head;
        observer?.observe(head);
      }
      container.style.setProperty("--pui-table-header-height", `${head?.offsetHeight ?? 0}px`);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    if (table) observer?.observe(table);
    update();
    return () => {
      observer?.disconnect();
      container.style.removeProperty("--pui-table-header-height");
    };
  }, [containerRef]);
}

export type TableHeaderProps = HTMLAttributes<HTMLTableSectionElement>;

export const TableHeader = /* @__PURE__ */ forwardRef<HTMLTableSectionElement, TableHeaderProps>(function TableHeader(
  { className, ...props },
  ref,
) {
  return (
    <thead
      ref={ref}
      data-slot="table-header"
      className={cn(
        "sticky top-0 z-10 bg-pui-card hover:[&_tr]:bg-transparent",
        // With border-collapse the row's bottom border is painted by the table and scrolls away under the sticky
        // header. The header rows draw their divider as an inset shadow on their cells instead, which sticks with
        // them (same colour and --pui-border-opacity fade as `border-pui-border`).
        "[&>tr]:border-b-0 [&>tr>*]:shadow-[inset_0_-1px_0_hsl(var(--pui-border)/var(--pui-border-opacity,1))]",
        className,
      )}
      {...props}
    />
  );
});

export type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;

export const TableBody = /* @__PURE__ */ forwardRef<HTMLTableSectionElement, TableBodyProps>(function TableBody(
  { className, ...props },
  ref,
) {
  return <tbody ref={ref} data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
});

export type TableFooterProps = HTMLAttributes<HTMLTableSectionElement>;

export const TableFooter = /* @__PURE__ */ forwardRef<HTMLTableSectionElement, TableFooterProps>(function TableFooter(
  { className, ...props },
  ref,
) {
  return (
    <tfoot
      ref={ref}
      data-slot="table-footer"
      className={cn(
        "border-t border-pui-border bg-pui-muted/50 font-medium [&>tr:last-child]:border-b-0 hover:[&_tr]:bg-transparent",
        className,
      )}
      {...props}
    />
  );
});

export type TableRowProps = HTMLAttributes<HTMLTableRowElement>;

/** Row with a hairline divider. Set `data-state="selected"` to highlight it. */
export const TableRow = /* @__PURE__ */ forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow({ className, ...props }, ref) {
  return (
    <tr
      ref={ref}
      data-slot="table-row"
      className={cn(
        "border-b border-pui-border transition-colors duration-pui-fast ease-pui",
        "hover:bg-pui-accent/40 data-[state=selected]:bg-pui-accent",
        className,
      )}
      {...props}
    />
  );
});

/**
 * Centres a checkbox / switch that is a direct child of a cell. On the baseline (or with `align-middle`) the 16px
 * checkbox sits ~2px off the centre of the 20px line, depending on the font. Aligned to the top of the line box
 * (plus 2px margin for the 16px checkbox, which makes it as tall as the line) it is centred for any font.
 */
const cellControlAlign =
  "[&>[role=checkbox]]:my-0.5 [&>[role=checkbox]]:align-top [&>[role=switch]]:align-top";

export type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement>;

export const TableHead = /* @__PURE__ */ forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
  { className, ...props },
  ref,
) {
  return (
    <th
      ref={ref}
      data-slot="table-head"
      className={cn(
        "h-10 whitespace-nowrap px-4 text-left align-middle",
        "text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground",
        "[&:has([role=checkbox])]:pr-0 data-[has-checkbox]:pr-0",
        cellControlAlign,
        className,
      )}
      {...props}
    />
  );
});

export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement>;

export const TableCell = /* @__PURE__ */ forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { className, ...props },
  ref,
) {
  return (
    <td
      ref={ref}
      data-slot="table-cell"
      className={cn(
        "px-4 py-2.5 align-middle tabular-nums [&:has([role=checkbox])]:pr-0 data-[has-checkbox]:pr-0",
        // Long unbreakable strings (ids, URLs) wrap instead of spilling into the next column in a fixed layout.
        // break-word (not `anywhere`) leaves the min-content width alone, so auto-layout tables still size columns
        // by whole words. No effect on `whitespace-nowrap` cells.
        "break-words",
        cellControlAlign,
        className,
      )}
      {...props}
    />
  );
});

export type TableCaptionProps = HTMLAttributes<HTMLTableCaptionElement>;

export const TableCaption = /* @__PURE__ */ forwardRef<HTMLTableCaptionElement, TableCaptionProps>(function TableCaption(
  { className, ...props },
  ref,
) {
  return (
    <caption
      ref={ref}
      data-slot="table-caption"
      className={cn("border-t border-pui-border px-4 py-3 text-xs text-pui-muted-foreground", className)}
      {...props}
    />
  );
});
