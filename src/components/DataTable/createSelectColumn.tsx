import type { RowData } from "@tanstack/react-table";
import { Checkbox } from "../Checkbox/Checkbox";
import type { DataTableColumnDef } from "./features";

export interface CreateSelectColumnOptions {
  /** Column id. Defaults to `"select"`. */
  id?: string;
  /** Accessible label of the header checkbox. */
  selectAllLabel?: string;
  /** Accessible label of each row checkbox. */
  selectRowLabel?: string;
}

/**
 * A checkbox column for row selection: the header checkbox toggles every row on the current page (indeterminate
 * while only some are selected), each cell toggles its row. Not sortable, not hideable.
 */
export function createSelectColumn<TData extends RowData>({
  id = "select",
  selectAllLabel = "Select all",
  selectRowLabel = "Select row",
}: CreateSelectColumnOptions = {}): DataTableColumnDef<TData> {
  return {
    id,
    header: ({ table }) => {
      const all = table.getIsAllPageRowsSelected();
      // v9: getIsSomePageRowsSelected() is also true when all are selected.
      const some = table.getIsSomePageRowsSelected() && !all;
      return (
        <Checkbox
          checked={all}
          indeterminate={some}
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
          aria-label={selectAllLabel}
          className="align-middle"
        />
      );
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(checked) => row.toggleSelected(checked)}
        aria-label={selectRowLabel}
        className="align-middle"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
    meta: { width: "2.75rem" },
  };
}
