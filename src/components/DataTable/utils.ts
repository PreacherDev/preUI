import type { RowData } from "@tanstack/react-table";
import type { DataTableColumn, DataTableColumnMeta } from "./features";

const alignClasses: Record<NonNullable<DataTableColumnMeta["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right tabular-nums",
};

/** Text-alignment classes for a column's `meta.align`. */
export function getAlignClass(align: DataTableColumnMeta["align"]): string | undefined {
  return align ? alignClasses[align] : undefined;
}

/** Human-readable column name: `meta.label`, else a string `header`, else the column id. */
export function getColumnLabel<TData extends RowData>(column: DataTableColumn<TData>): string {
  const { meta, header } = column.columnDef;
  if (meta?.label) return meta.label;
  if (typeof header === "string") return header;
  return column.id;
}
