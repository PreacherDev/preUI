import { forwardRef, type ReactNode, type ThHTMLAttributes } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { Button } from "../Button/Button";
import { TableHead } from "./Table";

/** Sort direction of a column: `false` when it isn't the sorted one. */
export type TableSortDirection = "asc" | "desc" | false;

/**
 * Ghost button in the header's eyebrow type, pulled out by its padding so the text lines up with the cells.
 * Shared with `DataTableColumnHeader`, so both headers look the same.
 */
export const sortHeadButtonClass =
  "h-7 gap-1.5 px-2 text-pui-eyebrow font-semibold uppercase data-[sorted]:text-pui-foreground [&_svg]:size-3.5";

export interface TableSortHeadProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "align" | "children"> {
  /** Header text. */
  children: ReactNode;
  /** Current sort direction of this column, `false` (default) when another column or nothing is sorted. */
  sorted?: TableSortDirection;
  /**
   * Called with the direction the column should be sorted in next: `"asc"` → `"desc"` → `"asc"` (or, with
   * `clearable`, `false`). Without it the header is plain text, like a `TableHead`.
   */
  onSort?: (direction: TableSortDirection) => void;
  /** Alignment of the header (the cells keep their own classes). */
  align?: "left" | "center" | "right";
  /** Lets a third click turn sorting off (`onSort(false)`). @default false */
  clearable?: boolean;
  /** Sorts descending first when the column isn't sorted yet (dates, amounts). @default false */
  descFirst?: boolean;
}

/**
 * Sortable header cell for the plain `Table`, for lists a server sorts and pages: it looks and behaves like
 * `DataTableColumnHeader` but takes the state as props (`sorted`, `onSort`) instead of a TanStack column.
 * Renders the `<th>` itself (with `aria-sort`), so it replaces `TableHead`.
 */
export const TableSortHead = /* @__PURE__ */ forwardRef<HTMLTableCellElement, TableSortHeadProps>(function TableSortHead(
  { children, sorted = false, onSort, align = "left", clearable = false, descFirst = false, className, ...props },
  ref,
) {
  const ArrowUp = useIcon("arrowUp");
  const ArrowDown = useIcon("arrowDown");
  const ArrowUpDown = useIcon("arrowUpDown");

  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : undefined;

  if (!onSort) {
    return (
      <TableHead ref={ref} data-slot="table-sort-head" className={cn(alignClass, className)} {...props}>
        {children}
      </TableHead>
    );
  }

  const SortIcon = sorted === "desc" ? ArrowDown : sorted === "asc" ? ArrowUp : ArrowUpDown;
  const icon = <SortIcon aria-hidden="true" className={cn(!sorted && "opacity-60")} />;
  // Click cycle: unsorted → first direction → the other one → (clearable) unsorted.
  const first: TableSortDirection = descFirst ? "desc" : "asc";
  const second: TableSortDirection = descFirst ? "asc" : "desc";
  const next: TableSortDirection = sorted === false ? first : sorted === first ? second : clearable ? false : first;

  return (
    <TableHead
      ref={ref}
      data-slot="table-sort-head"
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"}
      className={cn(alignClass, className)}
      {...props}
    >
      <div
        data-slot="table-sort-head-inner"
        className={cn("flex items-center", align === "right" && "justify-end", align === "center" && "justify-center")}
      >
        <Button
          variant="ghost"
          size="sm"
          className={cn(sortHeadButtonClass, align === "right" ? "-mr-2" : align === "center" ? undefined : "-ml-2")}
          data-sorted={sorted || undefined}
          onClick={() => onSort(next)}
        >
          {align === "right" && icon}
          {children}
          {align !== "right" && icon}
        </Button>
      </div>
    </TableHead>
  );
});
