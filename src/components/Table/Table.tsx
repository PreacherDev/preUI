import {
  forwardRef,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { cn } from "../../utils/cn";
import { useScrollTabStop } from "../../utils/scroll-tab-stop";
import { useHasFallbackRef, type HasFallbackRule } from "../../utils/use-has-fallback";
import { ScrollArea } from "../ScrollArea/ScrollArea";

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  /** Classes for the bordered wrapper around the scrolling `<table>`, e.g. `max-h-64` or `rounded-none`. */
  containerClassName?: string;
}

/**
 * Bordered data table on the card surface. The table scrolls both ways in a preUI `ScrollArea` inside the
 * bordered wrapper (constrain its height with `containerClassName="max-h-…"`); the header sticks to its top.
 * The scrollbars float over the cell padding, so nothing shifts when they appear.
 */
// `[&:has([role=checkbox])]` on the cells, emulated for browsers without :has() (Chromium < 105).
const tableHasRules: HasFallbackRule[] = [{ attr: "data-has-checkbox", has: "[role=checkbox]", target: "th, td" }];

export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  { className, containerClassName, ...props },
  ref,
) {
  const tabStop = useScrollTabStop();
  const tableRef = useHasFallbackRef(ref, tableHasRules);
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-pui border border-pui-border bg-pui-card",
        containerClassName,
      )}
    >
      <ScrollArea
        orientation="both"
        reserveTrack={false}
        viewportRef={tabStop.viewportRef}
        viewportProps={tabStop.viewportProps}
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

export type TableHeaderProps = HTMLAttributes<HTMLTableSectionElement>;

export const TableHeader = forwardRef<HTMLTableSectionElement, TableHeaderProps>(function TableHeader(
  { className, ...props },
  ref,
) {
  return (
    <thead
      ref={ref}
      data-slot="table-header"
      className={cn("sticky top-0 z-10 bg-pui-card hover:[&_tr]:bg-transparent", className)}
      {...props}
    />
  );
});

export type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;

export const TableBody = forwardRef<HTMLTableSectionElement, TableBodyProps>(function TableBody(
  { className, ...props },
  ref,
) {
  return <tbody ref={ref} data-slot="table-body" className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
});

export type TableFooterProps = HTMLAttributes<HTMLTableSectionElement>;

export const TableFooter = forwardRef<HTMLTableSectionElement, TableFooterProps>(function TableFooter(
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
export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow({ className, ...props }, ref) {
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

export type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement>;

export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
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
        className,
      )}
      {...props}
    />
  );
});

export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement>;

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { className, ...props },
  ref,
) {
  return (
    <td
      ref={ref}
      data-slot="table-cell"
      className={cn("px-4 py-2.5 align-middle tabular-nums [&:has([role=checkbox])]:pr-0 data-[has-checkbox]:pr-0", className)}
      {...props}
    />
  );
});

export type TableCaptionProps = HTMLAttributes<HTMLTableCaptionElement>;

export const TableCaption = forwardRef<HTMLTableCaptionElement, TableCaptionProps>(function TableCaption(
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
