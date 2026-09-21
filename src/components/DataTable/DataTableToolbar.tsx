import type { RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { Input } from "../Input/Input";
import { DataTableViewOptions, type DataTableViewOptionsProps } from "./DataTableViewOptions";
import type { DataTableInstance } from "./features";

export interface DataTableToolbarProps<TData extends RowData> {
  table: DataTableInstance<TData>;
  /** Id of the column the search input filters (substring match for text columns). */
  filterColumn?: string;
  filterPlaceholder?: string;
  /** Accessible label of the search input. Defaults to `filterPlaceholder`. */
  filterLabel?: string;
  /** Adds the column visibility dropdown on the right. */
  enableColumnVisibility?: boolean;
  /** Props for the column visibility dropdown (`label`, `heading`, `className`). */
  viewOptionsProps?: Omit<DataTableViewOptionsProps<TData>, "table">;
  /** Extra controls between the search input and the column dropdown (e.g. a status select). */
  children?: ReactNode;
  className?: string;
}

/** Filter row above the table: a search input that fills the row, extra controls, and the column dropdown. */
export function DataTableToolbar<TData extends RowData>({
  table,
  filterColumn,
  filterPlaceholder = "Filter…",
  filterLabel,
  enableColumnVisibility = false,
  viewOptionsProps,
  children,
  className,
}: DataTableToolbarProps<TData>) {
  const Search = useIcon("search");
  const column = filterColumn ? table.getColumn(filterColumn) : undefined;

  return (
    <div data-slot="data-table-toolbar" className={cn("flex flex-wrap items-center gap-2", className)}>
      {column && (
        <div data-slot="data-table-filter" className="relative min-w-48 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pui-muted-foreground"
          />
          <Input
            type="search"
            value={(column.getFilterValue() as string | undefined) ?? ""}
            onChange={(event) => column.setFilterValue(event.target.value)}
            placeholder={filterPlaceholder}
            aria-label={filterLabel ?? filterPlaceholder}
            // No native (untokenised, white) search clear button; the field looks like the handoff SearchInput.
            className="pl-9 [&::-webkit-search-cancel-button]:appearance-none"
          />
        </div>
      )}
      {children}
      {enableColumnVisibility && <DataTableViewOptions table={table} {...viewOptionsProps} />}
    </div>
  );
}
