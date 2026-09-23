import {
  functionalUpdate,
  useTable,
  type ColumnVisibilityState,
  type OnChangeFn,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
} from "@tanstack/react-table";
import {
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../Table/Table";
import { createSelectColumn } from "./createSelectColumn";
import { DataTablePagination, type DataTablePaginationProps } from "./DataTablePagination";
import { DataTableToolbar } from "./DataTableToolbar";
import type { DataTableViewOptionsProps } from "./DataTableViewOptions";
import { dataTableFeatures, type DataTableColumnDef, type DataTableFeatures, type DataTableRow } from "./features";
import { getAlignClass } from "./utils";

/** Extra attributes for a body row (`getRowProps`); `data-*` attributes are allowed. */
export type DataTableRowProps = ComponentPropsWithoutRef<"tr"> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

/**
 * Elements inside a row that handle clicks themselves — a click on (or in) one never activates the row. Also
 * matches `[data-row-activation="ignore"]`, which you can put on any custom element.
 */
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "[contenteditable]:not([contenteditable=false])",
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="combobox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[role="tab"]',
  '[role="textbox"]',
  '[data-row-activation="ignore"]',
].join(",");

/**
 * Whether a click at `target` should activate `row`: it must be a DOM descendant of the row (React also bubbles
 * clicks from portaled menus / dialogs opened inside a cell), not inside an interactive element, and not the end
 * of a text selection within the row.
 */
function isRowActivationTarget(row: HTMLElement, target: EventTarget | null) {
  if (!(target instanceof Element) || !row.contains(target)) return false;
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  if (interactive && interactive !== row && row.contains(interactive)) return false;
  const selection = row.ownerDocument.defaultView?.getSelection?.();
  if (selection && !selection.isCollapsed && selection.anchorNode && row.contains(selection.anchorNode)) return false;
  return true;
}

export interface DataTableProps<TData extends RowData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns carry different value types
  columns: DataTableColumnDef<TData, any>[];
  data: TData[];
  /** Id of the column the toolbar's search input filters. Without it there is no search input. */
  filterColumn?: string;
  filterPlaceholder?: string;
  /**
   * Enables row selection: prepends a checkbox column (unless a column with id `"select"` exists — see
   * `createSelectColumn`) and shows the selected-rows counter. A function decides per row.
   */
  enableRowSelection?: boolean | ((row: Row<DataTableFeatures, TData>) => boolean);
  /** Called with the new selection state and the selected original rows. */
  onRowSelectionChange?: (rowSelection: RowSelectionState, selectedRows: TData[]) => void;
  /** Adds the column visibility dropdown to the toolbar. */
  enableColumnVisibility?: boolean;
  /** Props of the column visibility dropdown (`label` defaults to "Columns", `heading` to "Toggle columns"). */
  viewOptionsProps?: Omit<DataTableViewOptionsProps<TData>, "table">;
  /** Rows per page. */
  pageSize?: number;
  pageSizeOptions?: number[];
  /** Labels and options of the footer (see `DataTablePagination`). */
  paginationProps?: Omit<DataTablePaginationProps<TData>, "table" | "pageSizeOptions" | "showSelectedCount">;
  /** Content of the single row shown when no rows match. */
  emptyMessage?: ReactNode;
  /** Extra controls in the toolbar, right of the search input (e.g. a select). */
  toolbar?: ReactNode;
  /** Stable row ids (used as keys in the selection state). Defaults to the row index. */
  getRowId?: TableOptions<DataTableFeatures, TData>["getRowId"];
  initialSorting?: SortingState;
  initialColumnVisibility?: ColumnVisibilityState;
  /** Classes for the outer wrapper. */
  className?: string;
  /** Classes for the `<table>`. */
  tableClassName?: string;
  /**
   * `fixed` (default): column widths come from `meta.width` / the header and stay put while sorting,
   * filtering and paging; columns without a width share the rest but never shrink below `meta.minWidth`
   * (default `8rem`) — the table scrolls horizontally instead. `auto`: the browser sizes columns by their
   * current content.
   */
  layout?: "fixed" | "auto";
  /** Classes for the table's bordered, scrolling container. */
  containerClassName?: string;
  /**
   * Makes body rows activatable (e.g. open a detail sheet): called on a click on the row and on Enter / Space while
   * the row has focus. Activatable rows are focusable (`tabIndex={0}`), show a pointer cursor and carry
   * `data-activatable`. Clicks on interactive elements inside the row (buttons, links, inputs, checkboxes, menus,
   * `[data-row-activation="ignore"]`) and in columns with `meta.rowActivation: false` don't activate it.
   */
  onRowActivate?: (row: DataTableRow<TData>, event: MouseEvent<HTMLTableRowElement> | KeyboardEvent<HTMLTableRowElement>) => void;
  /**
   * Mouse-only row click with the same filtering as `onRowActivate` (interactive elements are ignored). Rows get a
   * pointer cursor but no tab stop — prefer `onRowActivate` so keyboard users can open rows too.
   */
  onRowClick?: (row: DataTableRow<TData>, event: MouseEvent<HTMLTableRowElement>) => void;
  /**
   * Extra props per body row (classes, `data-*`, `aria-*`, handlers). `className` is merged; `onClick` /
   * `onKeyDown` run before the row activation and can stop it with `event.preventDefault()`.
   */
  getRowProps?: (row: DataTableRow<TData>) => DataTableRowProps;
}

/** Smallest width of a column without `meta.width` in the fixed layout (`meta.minWidth` overrides it). */
const DEFAULT_MIN_COLUMN_WIDTH = "8rem";

/**
 * Data table built on TanStack Table v9 and the preUI `Table` parts: optional search toolbar with column
 * visibility, sortable headers (`DataTableColumnHeader`), row selection and client-side pagination.
 * Use `meta: { align: "right" }` on money/number columns.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  filterColumn,
  filterPlaceholder,
  enableRowSelection = false,
  onRowSelectionChange,
  enableColumnVisibility = false,
  viewOptionsProps,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 40, 50],
  paginationProps,
  emptyMessage = "No results.",
  toolbar,
  getRowId,
  initialSorting,
  initialColumnVisibility,
  className,
  tableClassName,
  layout = "fixed",
  containerClassName,
  onRowActivate,
  onRowClick,
  getRowProps,
}: DataTableProps<TData>) {
  const selectable = enableRowSelection !== false;

  const tableColumns = useMemo(
    () =>
      selectable && !columns.some((column) => column.id === "select")
        ? [createSelectColumn<TData>(), ...columns]
        : columns,
    [columns, selectable],
  );

  // Row selection is controlled so changes can be reported; every other slice is owned by the table.
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectionRef = useRef(rowSelection);
  selectionRef.current = rowSelection;
  const onSelectionChangeRef = useRef(onRowSelectionChange);
  onSelectionChangeRef.current = onRowSelectionChange;

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const next = functionalUpdate(updater, selectionRef.current);
    selectionRef.current = next;
    setRowSelection(next);
    const notify = onSelectionChangeRef.current;
    if (notify) {
      const rowsById = table.getCoreRowModel().rowsById;
      notify(
        next,
        Object.keys(next)
          .filter((id) => next[id] && rowsById[id])
          .map((id) => rowsById[id]!.original),
      );
    }
  };

  const table = useTable({
    features: dataTableFeatures,
    columns: tableColumns,
    data,
    getRowId,
    enableRowSelection,
    initialState: {
      sorting: initialSorting ?? [],
      columnVisibility: initialColumnVisibility ?? {},
      pagination: { pageIndex: 0, pageSize },
    },
    state: { rowSelection },
    onRowSelectionChange: handleRowSelectionChange,
  });

  const rows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const showToolbar = filterColumn != null || enableColumnVisibility || toolbar != null;
  const activatable = onRowActivate != null;
  const clickable = activatable || onRowClick != null;

  const renderRow = (row: DataTableRow<TData>) => {
    const { className: rowClassName, onClick, onKeyDown, ...rowProps } = getRowProps?.(row) ?? {};
    const cellActivates = (target: EventTarget | null) => {
      const cell = target instanceof Element ? target.closest("td") : null;
      const cellId = cell?.getAttribute("data-column-id");
      if (!cellId) return true;
      return table.getColumn(cellId)?.columnDef.meta?.rowActivation !== false;
    };
    return (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() ? "selected" : undefined}
        data-activatable={activatable ? "" : undefined}
        tabIndex={activatable ? 0 : undefined}
        {...rowProps}
        className={cn(
          clickable && "cursor-pointer",
          activatable &&
            "focus-visible:bg-pui-accent/40 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-pui-ring",
          rowClassName,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (!clickable || event.defaultPrevented) return;
          if (!isRowActivationTarget(event.currentTarget, event.target) || !cellActivates(event.target)) return;
          onRowClick?.(row, event);
          onRowActivate?.(row, event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!activatable || event.defaultPrevented || event.target !== event.currentTarget) return;
          if (event.key !== "Enter" && event.key !== " ") return;
          if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
          event.preventDefault(); // Space would scroll the page
          onRowActivate(row, event);
        }}
      >
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta;
          return (
            <TableCell
              key={cell.id}
              data-column-id={clickable ? cell.column.id : undefined}
              className={cn(getAlignClass(meta?.align), clickable && meta?.rowActivation === false && "cursor-auto", meta?.cellClassName)}
            >
              <table.FlexRender cell={cell} />
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  // table-layout: fixed ignores min-width on cells, so the table itself gets the sum of the column widths
  // (unsized columns count with their minimum) as min-width.
  const visibleColumns = table.getVisibleLeafColumns();
  const tableMinWidth =
    layout === "fixed" && visibleColumns.length > 0
      ? `calc(${visibleColumns
          .map((column) => column.columnDef.meta?.width ?? column.columnDef.meta?.minWidth ?? DEFAULT_MIN_COLUMN_WIDTH)
          .join(" + ")})`
      : undefined;

  return (
    <div data-slot="data-table" className={cn("flex flex-col gap-3", className)}>
      {showToolbar && (
        <DataTableToolbar
          table={table}
          filterColumn={filterColumn}
          filterPlaceholder={filterPlaceholder}
          enableColumnVisibility={enableColumnVisibility}
          viewOptionsProps={viewOptionsProps}
        >
          {toolbar}
        </DataTableToolbar>
      )}
      <div data-slot="data-table-content">
        <Table
          className={cn(layout === "fixed" && "table-fixed", tableClassName)}
          style={tableMinWidth ? { minWidth: tableMinWidth } : undefined}
          containerClassName={containerClassName}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan > 1 ? header.colSpan : undefined}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      style={meta?.width ? { width: meta.width } : undefined}
                      className={cn(getAlignClass(meta?.align), meta?.headerClassName)}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map(renderRow)
            ) : (
              <TableRow>
                <TableCell
                  data-slot="data-table-empty"
                  colSpan={visibleColumnCount}
                  className="h-24 text-center text-pui-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <DataTablePagination
          table={table}
          pageSizeOptions={pageSizeOptions}
          showSelectedCount={selectable}
          {...paginationProps}
        />
      </div>
    </div>
  );
}
