import type { RowData } from "@tanstack/react-table";
import { createContext, useContext, type ButtonHTMLAttributes } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import type { SortEngine, SortLabels } from "../../utils/pointer-drag-sort";
import { Tooltip, TooltipContent, TooltipTrigger } from "../Tooltip/Tooltip";
import type { DataTableColumnDef, DataTableRow } from "./features";

/** Screen-reader and hint texts of the DataTable row reorder (positions are 1-based, within the current page). */
export interface DataTableRowMoveLabels extends Omit<SortLabels, "item"> {
  /** Hidden header text of the drag column. */
  column: string;
  /** Why the handles are disabled while the table is sorted or filtered (tooltip and description of the handle). */
  blocked: string;
}

export const defaultDataTableRowMoveLabels: DataTableRowMoveLabels = {
  column: "Reorder",
  handle: "Drag to reorder",
  blocked: "Clear sorting and filters to reorder rows.",
  instructions:
    "Press Space or Enter to pick the row up. Move it with the arrow keys, press Space or Enter to drop it, Escape to cancel.",
  pickedUp: (position, total) => `Picked up row ${position} of ${total}.`,
  moving: (position, total) => `Row ${position} of ${total}.`,
  dropped: (position, total) => `Dropped at row ${position} of ${total}.`,
  cancelled: "Move cancelled.",
};

/** What the DataTable hands its drag handles (only while `onRowMove` is set). */
export interface DataTableRowMoveContextValue {
  engine: SortEngine;
  /** Sorted or filtered: handles are shown disabled with `labels.blocked`. */
  blocked: boolean;
  labels: DataTableRowMoveLabels;
  instructionsId: string;
  blockedId: string;
}

export const DataTableRowMoveContext = /* @__PURE__ */ createContext<DataTableRowMoveContextValue | null>(null);

export interface DataTableDragHandleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The row the handle moves (only its `id` is read). */
  row: Pick<DataTableRow<RowData>, "id">;
}

const handleClass =
  "inline-flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-pui-sm align-middle text-pui-muted-foreground " +
  "outline-none transition-colors duration-pui-fast ease-pui hover:bg-pui-accent hover:text-pui-foreground " +
  "focus-visible:ring-pui focus-visible:ring-pui-ring " +
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:hover:text-pui-muted-foreground " +
  "disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent";

/**
 * The grip that moves a DataTable row (pointer drag or Space/Enter + arrows). Rendered by `createDragColumn`; use it
 * directly to put the handle into a column of your own. Disabled without `onRowMove`; while the table is sorted or
 * filtered it stays focusable and shows why it can't move (tooltip).
 */
export function DataTableDragHandle({ row, className, onKeyDown, onBlur, onPointerDown, children, ...props }: DataTableDragHandleProps) {
  const context = useContext(DataTableRowMoveContext);
  const GripVertical = useIcon("gripVertical");
  const labels = context?.labels ?? defaultDataTableRowMoveLabels;
  const icon = children ?? <GripVertical aria-hidden="true" className="size-4" />;

  if (!context) {
    return (
      <button type="button" disabled aria-label={labels.handle} data-slot="data-table-drag-handle" className={cn(handleClass, className)} {...props}>
        {icon}
      </button>
    );
  }

  const { engine, blocked, instructionsId, blockedId } = context;
  if (blocked) {
    return (
      <Tooltip>
        <TooltipTrigger
          aria-disabled="true"
          aria-label={labels.handle}
          aria-describedby={blockedId}
          data-slot="data-table-drag-handle"
          data-blocked=""
          className={cn(handleClass, className)}
          {...props}
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent>{labels.blocked}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      data-slot="data-table-drag-handle"
      data-sortable-handle=""
      aria-label={labels.handle}
      aria-describedby={instructionsId}
      aria-pressed={engine.drag?.id === row.id}
      className={cn(handleClass, className)}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (!event.defaultPrevented) engine.startPointer(event, row.id);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) engine.handleKeyDown(event, row.id);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        engine.cancelKeyboard(row.id);
      }}
      {...props}
    >
      {icon}
    </button>
  );
}

export interface CreateDragColumnOptions {
  /** Column id. Defaults to `"drag"`. */
  id?: string;
}

/**
 * A narrow column with the row's drag handle (`DataTableDragHandle`). `DataTable` prepends one by itself when
 * `onRowMove` is set; add it to `columns` yourself to choose its place (keep the id `"drag"` or the table adds a
 * second one). Not sortable, not hideable, clicks next to the handle don't activate the row.
 */
export function createDragColumn<TData extends RowData>({ id = "drag" }: CreateDragColumnOptions = {}): DataTableColumnDef<TData> {
  return {
    id,
    header: () => <DragColumnHeader />,
    cell: ({ row }) => <DataTableDragHandle row={row} />,
    enableSorting: false,
    enableHiding: false,
    enableColumnFilter: false,
    meta: { width: "2.75rem", rowActivation: false, headerClassName: "pr-0", cellClassName: "py-1.5 pr-0" },
  };
}

function DragColumnHeader() {
  const labels = useContext(DataTableRowMoveContext)?.labels ?? defaultDataTableRowMoveLabels;
  return <span className="sr-only">{labels.column}</span>;
}
