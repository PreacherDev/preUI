import type { RowData, RowSelectionState } from "@tanstack/react-table";
import { Checkbox } from "../Checkbox/Checkbox";
import type { DataTableColumnDef, DataTableInstance, DataTableRow } from "./features";

export interface CreateSelectColumnOptions<TData extends RowData = RowData> {
  /** Column id. Defaults to `"select"`. */
  id?: string;
  /** Accessible label of the header checkbox. */
  selectAllLabel?: string;
  /** Accessible label of each row checkbox. */
  selectRowLabel?: string;
  /** Accessible label of the checkbox of a locked row (`isLocked`). Defaults to `selectRowLabel`. */
  lockedRowLabel?: string;
  /**
   * What the header checkbox selects. `"page"` (default): the selectable rows of the current page. `"filtered"`:
   * every selectable row that matches the current filter, across all pages (in the current sort order).
   */
  scope?: "page" | "filtered";
  /**
   * Most rows that can be selected at once (across the whole table). The header checkbox stops there (first rows
   * in the current order win) and the checkboxes of unselected rows turn disabled once it is reached.
   */
  max?: number;
  /**
   * Rows that are already done (e.g. "already added"): shown checked and disabled, never part of the selection
   * state, ignored by the header checkbox. Combine with `enableRowSelection` for rows that are simply not selectable
   * (those show unchecked and disabled).
   */
  isLocked?: (row: DataTableRow<TData>) => boolean;
}

interface HeaderState<TData extends RowData> {
  /** Rows the header checkbox toggles (selectable, not locked), in display order. */
  selectable: DataTableRow<TData>[];
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  /** Rows that may still be added before `max` (Infinity without `max`). */
  remaining: number;
}

function selectedCount(selection: RowSelectionState) {
  let count = 0;
  for (const id in selection) if (selection[id]) count += 1;
  return count;
}

function headerState<TData extends RowData>(
  table: DataTableInstance<TData>,
  scope: "page" | "filtered",
  max: number | undefined,
  isLocked: ((row: DataTableRow<TData>) => boolean) | undefined,
): HeaderState<TData> {
  const rows = scope === "filtered" ? table.getPrePaginatedRowModel().rows : table.getRowModel().rows;
  const selectable: DataTableRow<TData>[] = [];
  let locked = 0;
  for (const row of rows) {
    if (isLocked?.(row)) locked += 1;
    else if (row.getCanSelect()) selectable.push(row);
  }
  const selected = selectable.filter((row) => row.getIsSelected()).length;
  const remaining = max == null ? Infinity : max - selectedCount(table.atoms.rowSelection.get());
  if (selectable.length === 0) {
    // Nothing to pick: a page of locked rows reads as done, a page of unselectable rows as unavailable.
    return { selectable, checked: rows.length > 0 && locked === rows.length, indeterminate: false, disabled: true, remaining };
  }
  // "Full" also when `max` is reached with some of these rows selected: the next click clears them.
  const full = selected === selectable.length || (remaining <= 0 && selected > 0);
  return {
    selectable,
    checked: full,
    indeterminate: !full && selected > 0,
    disabled: !full && selected === 0 && remaining <= 0,
    remaining,
  };
}

/**
 * A checkbox column for row selection: the header checkbox toggles every selectable row on the current page
 * (`scope: "page"`) or every selectable row matching the filter (`scope: "filtered"`), indeterminate while only
 * some are selected; each cell toggles its row. `max` caps the selection, `isLocked` shows rows as checked and
 * disabled. Not sortable, not hideable.
 */
export function createSelectColumn<TData extends RowData>({
  id = "select",
  selectAllLabel = "Select all",
  selectRowLabel = "Select row",
  lockedRowLabel,
  scope = "page",
  max,
  isLocked,
}: CreateSelectColumnOptions<TData> = {}): DataTableColumnDef<TData> {
  return {
    id,
    header: ({ table }) => {
      const state = headerState(table, scope, max, isLocked);
      return (
        <Checkbox
          checked={state.checked}
          indeterminate={state.indeterminate}
          disabled={state.disabled}
          onCheckedChange={() => {
            const { selectable, checked, remaining } = headerState(table, scope, max, isLocked);
            table.setRowSelection((old) => {
              const next: RowSelectionState = { ...old };
              if (checked) {
                for (const row of selectable) delete next[row.id];
                return next;
              }
              let budget = remaining;
              for (const row of selectable) {
                if (budget <= 0) break;
                if (next[row.id]) continue;
                next[row.id] = true;
                budget -= 1;
              }
              return next;
            });
          }}
          aria-label={selectAllLabel}
          data-scope={scope}
        />
      );
    },
    cell: ({ row, table }) => {
      if (isLocked?.(row)) {
        return <Checkbox checked disabled data-locked="" aria-label={lockedRowLabel ?? selectRowLabel} />;
      }
      const selected = row.getIsSelected();
      const full = max != null && !selected && selectedCount(table.atoms.rowSelection.get()) >= max;
      return (
        <Checkbox
          checked={selected}
          disabled={!row.getCanSelect() || full}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
          aria-label={selectRowLabel}
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
    // A click next to the checkbox should not activate (open) the row.
    meta: { width: "2.75rem", rowActivation: false },
  };
}
