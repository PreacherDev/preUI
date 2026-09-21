import type { RowData } from "@tanstack/react-table";
import { useId, type ReactNode } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { Button } from "../Button/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Select/Select";
import type { DataTableInstance } from "./features";

export interface DataTablePaginationProps<TData extends RowData> {
  table: DataTableInstance<TData>;
  /** Choices of the rows-per-page select. The current page size is added when missing. */
  pageSizeOptions?: number[];
  /** Shows the "x of y row(s) selected" counter on the left. */
  showSelectedCount?: boolean;
  selectedRowsLabel?: (selected: number, total: number) => ReactNode;
  rowsPerPageLabel?: ReactNode;
  pageLabel?: (page: number, pageCount: number) => ReactNode;
  firstPageLabel?: string;
  previousPageLabel?: string;
  nextPageLabel?: string;
  lastPageLabel?: string;
  className?: string;
}

const defaultSelectedRowsLabel = (selected: number, total: number) => `${selected} of ${total} row(s) selected.`;
const defaultPageLabel = (page: number, pageCount: number) => `Page ${page} of ${pageCount}`;

// Round ghost controls inside the pill (handoff: 28px).
const controlClass = "size-7 rounded-full";

/**
 * Footer of a DataTable: selected-rows counter, rows-per-page select and the pill-shaped
 * first / previous / page x of y / next / last control group.
 */
export function DataTablePagination<TData extends RowData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  showSelectedCount = true,
  selectedRowsLabel = defaultSelectedRowsLabel,
  rowsPerPageLabel = "Rows per page",
  pageLabel = defaultPageLabel,
  firstPageLabel = "Go to first page",
  previousPageLabel = "Go to previous page",
  nextPageLabel = "Go to next page",
  lastPageLabel = "Go to last page",
  className,
}: DataTablePaginationProps<TData>) {
  const ChevronLeft = useIcon("chevronLeft");
  const ChevronRight = useIcon("chevronRight");
  const ChevronsLeft = useIcon("chevronsLeft");
  const ChevronsRight = useIcon("chevronsRight");
  const selectId = useId();

  const { pageIndex, pageSize } = table.atoms.pagination.get();
  const pageCount = Math.max(1, table.getPageCount());
  const options = pageSizeOptions.includes(pageSize)
    ? pageSizeOptions
    : [...pageSizeOptions, pageSize].sort((a, b) => a - b);

  return (
    <div
      data-slot="data-table-pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1 pt-3 text-xs text-pui-muted-foreground",
        className,
      )}
    >
      <div data-slot="data-table-pagination-selected" className="flex-1 tabular-nums" aria-live="polite">
        {showSelectedCount &&
          selectedRowsLabel(table.getFilteredSelectedRowModel().rows.length, table.getFilteredRowModel().rows.length)}
      </div>
      <div data-slot="data-table-pagination-controls" className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div data-slot="data-table-pagination-page-size" className="flex items-center gap-2">
          <span id={selectId} className="whitespace-nowrap font-medium">
            {rowsPerPageLabel}
          </span>
          <Select
            items={options.map((option) => ({ value: String(option), label: String(option) }))}
            value={String(pageSize)}
            onValueChange={(next) => next != null && table.setPageSize(Number(next))}
          >
            <SelectTrigger size="sm" aria-labelledby={selectId} className="w-auto min-w-16 gap-2 tabular-nums">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={String(option)} className="tabular-nums">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div
          data-slot="data-table-pagination-nav"
          className="flex items-center gap-1 rounded-full border border-pui-border bg-pui-card p-0.5"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className={controlClass}
            aria-label={firstPageLabel}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.firstPage()}
          >
            <ChevronsLeft aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={controlClass}
            aria-label={previousPageLabel}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span
            data-slot="data-table-pagination-page"
            className="whitespace-nowrap px-2 font-medium tabular-nums text-pui-foreground"
          >
            {pageLabel(pageIndex + 1, pageCount)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            className={controlClass}
            aria-label={nextPageLabel}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className={controlClass}
            aria-label={lastPageLabel}
            disabled={!table.getCanNextPage()}
            onClick={() => table.lastPage()}
          >
            <ChevronsRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
