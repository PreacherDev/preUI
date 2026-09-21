import type { RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useIcon } from "../../icons";
import { Button } from "../Button/Button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../DropdownMenu/DropdownMenu";
import type { DataTableInstance } from "./features";
import { getColumnLabel } from "./utils";

export interface DataTableViewOptionsProps<TData extends RowData> {
  table: DataTableInstance<TData>;
  /** Text of the trigger button. */
  label?: ReactNode;
  /** Eyebrow heading inside the menu. Pass `null` to hide it. */
  heading?: ReactNode;
  className?: string;
}

/**
 * "Columns" dropdown with a checkbox item per hideable column (columns with an accessor or
 * `enableHiding !== false`). Names come from `meta.label`, a string `header`, or the column id.
 */
export function DataTableViewOptions<TData extends RowData>({
  table,
  label = "Columns",
  heading = "Toggle columns",
  className,
}: DataTableViewOptionsProps<TData>) {
  const ChevronDown = useIcon("chevronDown");
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            data-slot="data-table-view-options"
            className={className}
            rightIcon={<ChevronDown />}
          />
        }
      >
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {heading != null && (
          <>
            <DropdownMenuLabel>{heading}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(checked) => column.toggleVisibility(checked)}
          >
            {getColumnLabel(column)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
