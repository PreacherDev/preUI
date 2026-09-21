import type { RowData } from "@tanstack/react-table";
import type { HTMLAttributes, ReactNode } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { Button } from "../Button/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../DropdownMenu/DropdownMenu";
import type { DataTableColumn } from "./features";

export interface DataTableColumnHeaderProps<TData extends RowData, TValue = unknown>
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  column: DataTableColumn<TData, TValue>;
  title: ReactNode;
  /**
   * Opens a menu (ascending / descending / hide) instead of toggling the sort order on click,
   * like the shadcn guide.
   */
  menu?: boolean;
  sortAscLabel?: string;
  sortDescLabel?: string;
  hideLabel?: string;
}

// Ghost button in the header's eyebrow type, pulled out by its padding so the text lines up with the cells.
const headerButtonClass =
  "h-7 gap-1.5 px-2 text-pui-eyebrow font-semibold uppercase data-[sorted]:text-pui-foreground [&_svg]:size-3.5";

/**
 * Sortable column header. Renders the plain title when the column can't be sorted; honours
 * `meta.align: "right"` by moving the button to the right edge.
 */
export function DataTableColumnHeader<TData extends RowData, TValue = unknown>({
  column,
  title,
  menu = false,
  sortAscLabel = "Asc",
  sortDescLabel = "Desc",
  hideLabel = "Hide",
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  const ArrowUp = useIcon("arrowUp");
  const ArrowDown = useIcon("arrowDown");
  const ArrowUpDown = useIcon("arrowUpDown");

  const align = column.columnDef.meta?.align;
  const wrapperClass = cn(
    "flex items-center",
    align === "right" && "justify-end",
    align === "center" && "justify-center",
    className,
  );

  if (!column.getCanSort()) {
    return (
      <div data-slot="data-table-column-header" className={wrapperClass} {...props}>
        {title}
      </div>
    );
  }

  const sorted = column.getIsSorted();
  const SortIcon = sorted === "desc" ? ArrowDown : sorted === "asc" ? ArrowUp : ArrowUpDown;
  const icon = <SortIcon aria-hidden="true" className={cn(!sorted && "opacity-60")} />;
  const buttonClass = cn(headerButtonClass, align === "right" ? "-mr-2" : align === "center" ? undefined : "-ml-2");

  if (!menu) {
    return (
      <div data-slot="data-table-column-header" className={wrapperClass} {...props}>
        <Button
          variant="ghost"
          size="sm"
          className={buttonClass}
          data-sorted={sorted || undefined}
          onClick={() => column.toggleSorting(sorted === "asc")}
        >
          {align === "right" && icon}
          {title}
          {align !== "right" && icon}
        </Button>
      </div>
    );
  }

  return (
    <div data-slot="data-table-column-header" className={wrapperClass} {...props}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="sm" className={buttonClass} data-sorted={sorted || undefined} />}
        >
          {align === "right" && icon}
          {title}
          {align !== "right" && icon}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align === "right" ? "end" : "start"} className="min-w-36">
          <DropdownMenuItem
            icon={<ArrowUp className="size-3.5 text-pui-muted-foreground" />}
            onClick={() => column.toggleSorting(false)}
          >
            {sortAscLabel}
          </DropdownMenuItem>
          <DropdownMenuItem
            icon={<ArrowDown className="size-3.5 text-pui-muted-foreground" />}
            onClick={() => column.toggleSorting(true)}
          >
            {sortDescLabel}
          </DropdownMenuItem>
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem inset onClick={() => column.toggleVisibility(false)}>
                {hideLabel}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
