import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  type Cell,
  type Column,
  type ColumnDef,
  type Header,
  type Row,
  type RowData,
  type Table,
} from "@tanstack/react-table";

/** Extra per-column options read by the DataTable parts (set via `meta` on a column definition). */
export interface DataTableColumnMeta {
  /** Horizontal alignment of header and cells. `right` also sets tabular figures — use it for money and numbers. */
  align?: "left" | "center" | "right";
  /**
   * Column width as a CSS length (e.g. `"8rem"`). With the default fixed layout, columns without a
   * width share the remaining space — widths no longer depend on the rows currently shown.
   */
  width?: string;
  /**
   * Fixed layout only: the smallest width (CSS length) a column *without* `width` may shrink to, default `"8rem"`.
   * The table's minimum width is the sum of all widths / minimum widths; on narrower screens it scrolls
   * horizontally instead of squeezing unsized columns to nothing.
   */
  minWidth?: string;
  /** Extra classes for the column's `<th>`. */
  headerClassName?: string;
  /** Extra classes for the column's `<td>`s. */
  cellClassName?: string;
  /** Name shown in the column visibility menu. Defaults to a string `header`, else the column id. */
  label?: string;
}

/**
 * The TanStack Table v9 feature set every DataTable uses: column filtering, sorting, pagination, row selection
 * and column visibility, their client-side row models, all built-in filter/sort functions (so `"auto"` and
 * string names like `"includesString"` resolve) and the typed column `meta` (`DataTableColumnMeta`).
 */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns,
  columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableFeatures = typeof dataTableFeatures;

/** A column definition for `DataTable` (TanStack's `ColumnDef` bound to the DataTable feature set). */
export type DataTableColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<DataTableFeatures, TData, TValue>;
/** The DataTable's table instance (as passed to header/cell renderers and the toolbar/pagination parts). */
export type DataTableInstance<TData extends RowData> = Table<DataTableFeatures, TData>;
export type DataTableColumn<TData extends RowData, TValue = unknown> = Column<DataTableFeatures, TData, TValue>;
export type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>;
export type DataTableCell<TData extends RowData, TValue = unknown> = Cell<DataTableFeatures, TData, TValue>;
export type DataTableHeader<TData extends RowData, TValue = unknown> = Header<DataTableFeatures, TData, TValue>;

/**
 * TanStack's column helper, bound to the DataTable feature set.
 * @example
 * const columnHelper = createDataTableColumnHelper<Payment>();
 * const columns = columnHelper.columns([columnHelper.accessor("amount", { header: "Amount", meta: { align: "right" } })]);
 */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}
