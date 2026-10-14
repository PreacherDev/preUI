import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Button } from "../Button/Button";
import { moveItem } from "../Sortable/Sortable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../DropdownMenu/DropdownMenu";
import { createDragColumn } from "./createDragColumn";
import { createSelectColumn } from "./createSelectColumn";
import { DataTable, type DataTableProps } from "./DataTable";
import { DataTableColumnHeader } from "./DataTableColumnHeader";
import { createDataTableColumnHelper } from "./features";

interface Booking {
  id: string;
  description: string;
  amount: number;
}

const bookings: Booking[] = Array.from({ length: 25 }, (_, i) => ({
  id: `b${i + 1}`,
  description: i % 2 === 0 ? `Tanken ${i + 1}` : `Lieferung ${i + 1}`,
  amount: (i + 1) * 100,
}));

const helper = createDataTableColumnHelper<Booking>();
const columns = helper.columns([
  helper.accessor("description", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Beschreibung" />,
    meta: { label: "Beschreibung" },
  }),
  helper.accessor("amount", {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Betrag" />,
    cell: ({ getValue }) => `$${getValue()}`,
    meta: { align: "right", label: "Betrag" },
  }),
]);

function bodyRows() {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body!).getAllByRole("row");
}

function firstCellTexts() {
  return bodyRows().map((row) => within(row).getAllByRole("cell")[0]!.textContent);
}

describe("DataTable", () => {
  it("renders headers and the first page of rows", () => {
    render(<DataTable columns={columns} data={bookings} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Beschreibung" })).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(10);
    expect(firstCellTexts()[0]).toBe("Tanken 1");
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("aligns right-aligned columns with tabular figures", () => {
    render(<DataTable columns={columns} data={bookings} />);
    const amountCell = within(bodyRows()[0]!).getAllByRole("cell")[1]!;
    expect(amountCell).toHaveClass("text-right", "tabular-nums");
    expect(amountCell).toHaveTextContent("$100");
    expect(screen.getByRole("columnheader", { name: "Betrag" })).toHaveClass("text-right");
  });

  it("toggles the sort order from the column header", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={bookings} />);
    const header = screen.getByRole("columnheader", { name: "Betrag" });
    const button = within(header).getByRole("button", { name: "Betrag" });

    await user.click(button);
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(within(bodyRows()[0]!).getAllByRole("cell")[1]).toHaveTextContent("$100");

    await user.click(button);
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(within(bodyRows()[0]!).getAllByRole("cell")[1]).toHaveTextContent("$2500");
  });

  it("applies the initial sorting", () => {
    render(<DataTable columns={columns} data={bookings} initialSorting={[{ id: "amount", desc: true }]} />);
    expect(within(bodyRows()[0]!).getAllByRole("cell")[1]).toHaveTextContent("$2500");
  });

  it("narrows the rows with the filter input", async () => {
    const user = userEvent.setup();
    render(
      <DataTable columns={columns} data={bookings} filterColumn="description" filterPlaceholder="Suchen…" />,
    );
    await user.type(screen.getByRole("searchbox", { name: "Suchen…" }), "tanken 2");
    expect(firstCellTexts()).toEqual(["Tanken 21", "Tanken 23", "Tanken 25"]);
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("hides the native search clear button of the filter input", () => {
    render(<DataTable columns={columns} data={bookings} filterColumn="description" />);
    expect(screen.getByRole("searchbox")).toHaveClass("pl-9", "[&::-webkit-search-cancel-button]:appearance-none");
  });

  it("shows the empty message when nothing matches", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <DataTable columns={columns} data={bookings} filterColumn="description" filterPlaceholder="Suchen" />,
    );
    await user.type(screen.getByRole("searchbox"), "xyz");
    const cell = screen.getByRole("cell", { name: "No results." });
    expect(cell).toHaveAttribute("colspan", "2");

    rerender(<DataTable columns={columns} data={[]} emptyMessage="Keine Buchungen." />);
    expect(screen.getByRole("cell", { name: "Keine Buchungen." })).toBeInTheDocument();
  });

  it("pages forward and back and changes the page size", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={bookings} />);
    const previous = screen.getByRole("button", { name: "Go to previous page" });
    const next = screen.getByRole("button", { name: "Go to next page" });
    expect(previous).toBeDisabled();

    await user.click(next);
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(firstCellTexts()[0]).toBe("Tanken 11");

    await user.click(screen.getByRole("button", { name: "Go to last page" }));
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(5);
    expect(next).toBeDisabled();

    await user.click(previous);
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Go to first page" }));
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
    await user.click(await screen.findByRole("option", { name: "20" }));
    expect(bodyRows()).toHaveLength(20);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });

  it("uses custom pagination labels and page size", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={bookings}
        pageSize={5}
        pageSizeOptions={[10, 25]}
        paginationProps={{
          rowsPerPageLabel: "Zeilen pro Seite",
          pageLabel: (page, count) => `Seite ${page} von ${count}`,
        }}
      />,
    );
    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByText("Seite 1 von 5")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Zeilen pro Seite" }));
    const options = await screen.findAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["5", "10", "25"]);
  });

  it("selects rows, marks them and updates the counter", async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={bookings}
        enableRowSelection
        getRowId={(row) => row.id}
        onRowSelectionChange={onRowSelectionChange}
      />,
    );
    expect(screen.getByText("0 of 25 row(s) selected.")).toBeInTheDocument();

    const rowBoxes = screen.getAllByRole("checkbox", { name: "Select row" });
    await user.click(rowBoxes[1]!);
    expect(bodyRows()[1]).toHaveAttribute("data-state", "selected");
    expect(bodyRows()[0]).not.toHaveAttribute("data-state");
    expect(screen.getByText("1 of 25 row(s) selected.")).toBeInTheDocument();
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({ b2: true }, [bookings[1]]);

    const selectAll = screen.getByRole("checkbox", { name: "Select all" });
    expect(selectAll).toHaveAttribute("aria-checked", "mixed");
    await user.click(selectAll);
    expect(screen.getByText("10 of 25 row(s) selected.")).toBeInTheDocument();
    expect(selectAll).toHaveAttribute("aria-checked", "true");

    await user.click(selectAll);
    expect(screen.getByText("0 of 25 row(s) selected.")).toBeInTheDocument();
  });

  it("hides a column from the column visibility menu", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={bookings} enableColumnVisibility viewOptionsProps={{ label: "Spalten" }} />);
    expect(screen.getByRole("columnheader", { name: "Betrag" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Spalten" }));
    const item = await screen.findByRole("menuitemcheckbox", { name: "Betrag" });
    expect(item).toHaveAttribute("aria-checked", "true");
    await user.click(item);

    expect(screen.queryByRole("columnheader", { name: "Betrag" })).not.toBeInTheDocument();
    expect(within(bodyRows()[0]!).getAllByRole("cell")).toHaveLength(1);
  });

  it("sorts and hides through the header menu", async () => {
    const user = userEvent.setup();
    const menuColumns = helper.columns([
      helper.accessor("description", { header: "Beschreibung" }),
      helper.accessor("amount", {
        header: ({ column }) => <DataTableColumnHeader column={column} title="Betrag" menu />,
      }),
    ]);
    render(<DataTable columns={menuColumns} data={bookings} />);

    await user.click(screen.getByRole("button", { name: "Betrag" }));
    await user.click(await screen.findByRole("menuitem", { name: "Desc" }));
    expect(screen.getByRole("columnheader", { name: "Betrag" })).toHaveAttribute("aria-sort", "descending");
    expect(firstCellTexts()[0]).toBe("Tanken 25");

    await user.click(screen.getByRole("button", { name: "Betrag" }));
    await user.click(await screen.findByRole("menuitem", { name: "Hide" }));
    expect(screen.queryByRole("columnheader", { name: "Betrag" })).not.toBeInTheDocument();
  });

  it("uses a fixed layout with meta.width so columns don't jump while sorting", () => {
    const sized = helper.columns([
      helper.accessor("description", { header: "Beschreibung" }),
      helper.accessor("amount", { header: "Betrag", meta: { width: "8rem" } }),
    ]);
    const { rerender } = render(<DataTable columns={sized} data={bookings} />);
    expect(screen.getByRole("table")).toHaveClass("table-fixed");
    expect(screen.getByRole("columnheader", { name: "Betrag" })).toHaveStyle({ width: "8rem" });
    rerender(<DataTable columns={sized} data={bookings} layout="auto" />);
    expect(screen.getByRole("table")).not.toHaveClass("table-fixed");
  });

  it("renders the toolbar slot and merges classNames", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={bookings}
        toolbar={<button type="button">Export</button>}
        className="custom-root"
        containerClassName="custom-container"
      />,
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("custom-root", "flex");
    expect(container.querySelector('[data-slot="table-container"]')).toHaveClass("custom-container");
  });
});

describe("DataTable in a fixed-height parent", () => {
  it("keeps the flex chain from the root to the table container, pagination does not shrink", () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={bookings}
        className="min-h-0 flex-1"
        containerClassName="min-h-0 flex-1"
        paginationProps={{ className: "custom-pagination" }}
      />,
    );
    expect(container.querySelector('[data-slot="data-table"]')).toHaveClass("flex", "flex-col", "min-h-0", "flex-1");
    expect(container.querySelector('[data-slot="data-table-content"]')).toHaveClass("flex", "min-h-0", "flex-1", "flex-col");
    expect(container.querySelector('[data-slot="table-container"]')).toHaveClass("min-h-0", "flex-1");
    expect(container.querySelector('[data-slot="data-table-pagination"]')).toHaveClass("shrink-0", "custom-pagination");
  });

  it("does not let the root shrink on its own (only with the user's min-h-0)", () => {
    const { container } = render(<DataTable columns={columns} data={bookings} />);
    expect(container.querySelector('[data-slot="data-table"]')).not.toHaveClass("min-h-0");
  });
});

describe("DataTable slots", () => {
  it("marks toolbar, content, header, pagination and view options with data-slot", () => {
    const { container } = render(
      <DataTable columns={columns} data={bookings} filterColumn="description" enableColumnVisibility />,
    );
    for (const slot of [
      "data-table",
      "data-table-toolbar",
      "data-table-filter",
      "data-table-content",
      "data-table-column-header",
      "data-table-pagination",
      "data-table-pagination-selected",
      "data-table-pagination-controls",
      "data-table-pagination-page-size",
      "data-table-pagination-nav",
      "data-table-pagination-page",
    ]) {
      expect(container.querySelector(`[data-slot="${slot}"]`), slot).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Columns" })).toHaveAttribute("data-slot", "data-table-view-options");
  });

  it("marks the empty state", () => {
    const { container } = render(<DataTable columns={columns} data={[]} />);
    expect(container.querySelector('[data-slot="data-table-empty"]')).toBeInTheDocument();
  });
});

describe("DataTable fixed layout minimum width", () => {
  it("gives the table the sum of widths / minimum widths as min-width", () => {
    const sized = helper.columns([
      helper.accessor("description", { header: "Beschreibung" }),
      helper.accessor("amount", { header: "Betrag", meta: { width: "6rem" } }),
      helper.accessor("id", { header: "Nr.", meta: { minWidth: "4rem" } }),
    ]);
    render(<DataTable columns={sized} data={bookings} />);
    // jsdom folds the calc(); in the browser it stays "calc(8rem + 6rem + 4rem)".
    expect(screen.getByRole("table").style.minWidth).toMatch(/^calc\((18rem|8rem \+ 6rem \+ 4rem)\)$/);
  });

  it("leaves the auto layout alone", () => {
    render(<DataTable columns={columns} data={bookings} layout="auto" />);
    expect(screen.getByRole("table").style.minWidth).toBe("");
  });
});

describe("DataTable row activation", () => {
  const actionColumns = helper.columns([
    ...columns,
    helper.display({
      id: "actions",
      header: "Aktionen",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="sm" variant="ghost" />}>Menü {row.original.id}</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      meta: { rowActivation: false },
    }),
  ]);

  it("activates a row on click and on Enter / Space, rows are focusable", async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    render(<DataTable columns={columns} data={bookings} onRowActivate={onRowActivate} />);
    const [first, second] = bodyRows();
    expect(first).toHaveAttribute("tabindex", "0");
    expect(first).toHaveAttribute("data-activatable");
    expect(first).toHaveClass("cursor-pointer");

    await user.click(within(first!).getByText("Tanken 1"));
    expect(onRowActivate).toHaveBeenCalledTimes(1);
    expect(onRowActivate.mock.calls[0]![0].original.id).toBe("b1");

    second!.focus();
    await user.keyboard("{Enter}");
    expect(onRowActivate).toHaveBeenCalledTimes(2);
    expect(onRowActivate.mock.lastCall![0].original.id).toBe("b2");
    await user.keyboard(" ");
    expect(onRowActivate).toHaveBeenCalledTimes(3);
    await user.keyboard("a");
    expect(onRowActivate).toHaveBeenCalledTimes(3);
  });

  it("is not activatable (no tab stop, no pointer) without handlers", () => {
    render(<DataTable columns={columns} data={bookings} />);
    const [first] = bodyRows();
    expect(first).not.toHaveAttribute("tabindex");
    expect(first).not.toHaveAttribute("data-activatable");
    expect(first).not.toHaveClass("cursor-pointer");
  });

  it("ignores clicks on interactive elements, portaled menus and rowActivation: false columns", async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    render(<DataTable columns={actionColumns} data={bookings} onRowActivate={onRowActivate} enableRowSelection />);
    const [first] = bodyRows();

    await user.click(within(first!).getByRole("checkbox", { name: "Select row" }));
    expect(first).toHaveAttribute("data-state", "selected");
    // The cell around the checkbox (select column) does not activate either.
    await user.click(within(first!).getAllByRole("cell")[0]!);
    await user.click(within(first!).getByRole("button", { name: "Menü b1" }));
    await user.click(await screen.findByRole("menuitem", { name: "Bearbeiten" }));
    expect(onRowActivate).not.toHaveBeenCalled();

    // A key press on a focused button inside the row does not activate the row.
    within(first!).getByRole("button", { name: "Menü b1" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");
    expect(onRowActivate).not.toHaveBeenCalled();

    await user.click(within(first!).getByText("Tanken 1"));
    expect(onRowActivate).toHaveBeenCalledTimes(1);
  });

  it("onRowClick gets row and event but no tab stop", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={bookings} onRowClick={onRowClick} />);
    const [first] = bodyRows();
    expect(first).toHaveClass("cursor-pointer");
    expect(first).not.toHaveAttribute("tabindex");
    await user.click(within(first!).getByText("$100"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0]![0].original.id).toBe("b1");
    expect(onRowClick.mock.calls[0]![1].type).toBe("click");
  });

  it("getRowProps adds attributes and classes and can cancel the activation", async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={bookings}
        onRowActivate={onRowActivate}
        getRowProps={(row) => ({
          className: row.original.amount > 200 ? "text-pui-warning" : undefined,
          "data-booking": row.original.id,
          "aria-label": `Buchung ${row.original.id}`,
          onClick: (event) => {
            if (row.original.id === "b2") event.preventDefault();
          },
        })}
      />,
    );
    const [first, second, third] = bodyRows();
    expect(first).toHaveAttribute("data-booking", "b1");
    expect(first).toHaveAttribute("aria-label", "Buchung b1");
    expect(first).toHaveClass("cursor-pointer");
    expect(first).not.toHaveClass("text-pui-warning");
    expect(third).toHaveClass("text-pui-warning", "cursor-pointer");
    await user.click(within(second!).getByText("Lieferung 2"));
    expect(onRowActivate).not.toHaveBeenCalled();
    await user.click(within(third!).getByText("Tanken 3"));
    expect(onRowActivate).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Row reorder
// ---------------------------------------------------------------------------------------------------------------------

function ReorderTable({
  onRowMove,
  extra,
  ...props
}: Partial<DataTableProps<Booking>> & { extra?: Partial<DataTableProps<Booking>> }) {
  const [data, setData] = useState(bookings);
  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      filterColumn="description"
      onRowMove={(from, to) => {
        onRowMove?.(from, to);
        setData((current) => moveItem(current, from, to));
      }}
      {...props}
      {...extra}
    />
  );
}

const handles = () => screen.queryAllByRole("button", { name: "Drag to reorder" });
const descriptions = () => bodyRows().map((row) => within(row).getAllByRole("cell")[1]!.textContent);

/** Rows 41px tall without gaps from the body's top (jsdom has no layout). */
function layoutRows() {
  const [, body] = screen.getAllByRole("rowgroup");
  const rect = (top: number, height: number) =>
    ({ x: 0, y: top, left: 0, top, width: 600, height, right: 600, bottom: top + height, toJSON: () => ({}) }) as DOMRect;
  body!.getBoundingClientRect = () => rect(40, 410);
  bodyRows().forEach((row, index) => {
    row.getBoundingClientRect = () => rect(40 + index * 41, 41);
  });
}

function pointerDrag(handle: HTMLElement, fromY: number, toY: number) {
  fireEvent.pointerDown(handle, { button: 0, clientX: 10, clientY: fromY, pointerId: 1 });
  act(() => {
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: fromY + 10 }));
  });
  act(() => {
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: toY }));
  });
}

const releasePointer = () =>
  act(() => {
    window.dispatchEvent(new MouseEvent("pointerup", {}));
  });

afterEach(() => {
  document.querySelectorAll('[data-slot="data-table-drag-preview"]').forEach((el) => el.parentElement?.remove());
});

describe("DataTable row reorder", () => {
  it("prepends a drag column with a handle per row and a hidden header", () => {
    render(<ReorderTable />);
    expect(handles()).toHaveLength(10);
    expect(handles()[0]).toHaveAttribute("data-slot", "data-table-drag-handle");
    expect(handles()[0]).toHaveAccessibleDescription(/Press Space or Enter to pick the row up/);
    const [dragHeader] = screen.getAllByRole("columnheader");
    expect(dragHeader).toHaveTextContent("Reorder");
    expect(dragHeader).toHaveStyle({ width: "2.75rem" });
    expect(bodyRows()[0]).toHaveAttribute("data-sortable-id", "b1");
  });

  it("moves a row with the pointer: rows slide live, a table-shaped copy follows, onRowMove gets data indexes", () => {
    const onRowMove = vi.fn();
    render(<ReorderTable onRowMove={onRowMove} />);
    layoutRows();
    pointerDrag(handles()[0]!, 60, 150);
    const preview = document.querySelector<HTMLElement>('[data-slot="data-table-drag-preview"]')!;
    expect(preview.tagName).toBe("TR");
    expect(preview.closest("table")).not.toBeNull();
    expect(preview.parentElement!.closest("div")!.style.opacity).toBe("var(--pui-drag-preview-opacity, 0.6)");
    expect(bodyRows()[0]).toHaveAttribute("data-dragging", "pointer");
    // Middle of row 1 at 20.5 + 90 = 110.5: past the middles of rows 2 (61.5) and 3 (102.5), not 4 (143.5).
    expect(bodyRows()[1]!.style.transform).toBe("translate3d(0px, -41px, 0px)");
    expect(bodyRows()[2]!.style.transform).toBe("translate3d(0px, -41px, 0px)");
    expect(bodyRows()[0]!.style.transform).toBe("translate3d(0px, 82px, 0px)");
    releasePointer();
    expect(onRowMove).toHaveBeenCalledWith(0, 2);
    expect(descriptions().slice(0, 3)).toEqual(["Lieferung 2", "Tanken 3", "Tanken 1"]);
    expect(bodyRows()[0]!.style.transform).toBe("");
  });

  it("reports indexes in data on later pages", async () => {
    const user = userEvent.setup();
    const onRowMove = vi.fn();
    render(<ReorderTable onRowMove={onRowMove} />);
    await user.click(screen.getByRole("button", { name: "Go to next page" }));
    layoutRows();
    pointerDrag(handles()[3]!, 40 + 3 * 41 + 20, 60);
    releasePointer();
    expect(onRowMove).toHaveBeenCalledWith(13, 10);
    expect(descriptions()[0]).toBe("Lieferung 14");
  });

  it("moves a row with the keyboard and keeps the focus on its handle", async () => {
    const user = userEvent.setup();
    const onRowMove = vi.fn();
    render(<ReorderTable onRowMove={onRowMove} />);
    layoutRows();
    handles()[1]!.focus();
    await user.keyboard(" ");
    expect(bodyRows()[1]).toHaveAttribute("data-dragging", "keyboard");
    expect(screen.getByText("Picked up row 2 of 10.")).toHaveAttribute("role", "status");
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("status")).toHaveTextContent("Row 1 of 10.");
    expect(bodyRows()[0]!.style.transform).toBe("translate3d(0px, 41px, 0px)");
    await user.keyboard("{Enter}");
    expect(onRowMove).toHaveBeenCalledWith(1, 0);
    expect(descriptions()[0]).toBe("Lieferung 2");
    expect(within(bodyRows()[0]!).getByRole("button", { name: "Drag to reorder" })).toHaveFocus();
  });

  it("does not activate the row with a drag or the handle", async () => {
    const user = userEvent.setup();
    const onRowActivate = vi.fn();
    render(<ReorderTable extra={{ onRowActivate }} />);
    layoutRows();
    pointerDrag(handles()[0]!, 60, 150);
    releasePointer();
    fireEvent.click(bodyRows()[2]!);
    await user.click(handles()[4]!);
    expect(onRowActivate).not.toHaveBeenCalled();
    await user.click(within(bodyRows()[5]!).getByText("Lieferung 6"));
    expect(onRowActivate).toHaveBeenCalledTimes(1);
  });

  it("disables the handles with a reason while sorted or filtered", async () => {
    const user = userEvent.setup();
    const onRowMove = vi.fn();
    const sortable = helper.columns([
      helper.accessor("description", { header: "Beschreibung" }),
      helper.accessor("amount", {
        header: ({ column }) => <DataTableColumnHeader column={column} title="Betrag" />,
      }),
    ]);
    render(<ReorderTable onRowMove={onRowMove} columns={sortable} rowMoveLabels={{ blocked: "Erst Sortierung aufheben." }} />);
    const header = within(screen.getByRole("columnheader", { name: "Betrag" })).getByRole("button");
    await user.click(header);
    expect(handles()[0]).toHaveAttribute("aria-disabled", "true");
    expect(handles()[0]).toHaveAttribute("data-blocked");
    expect(handles()[0]).toHaveAccessibleDescription("Erst Sortierung aufheben.");
    layoutRows();
    pointerDrag(handles()[0]!, 60, 150);
    releasePointer();
    handles()[0]!.focus();
    await user.keyboard(" {ArrowDown} ");
    expect(onRowMove).not.toHaveBeenCalled();

    // Sorting off again (asc → desc → off).
    await user.click(header);
    await user.click(header);
    expect(handles()[0]).not.toHaveAttribute("aria-disabled");

    await user.type(screen.getByRole("searchbox"), "tanken");
    expect(handles()[0]).toHaveAttribute("aria-disabled", "true");
    await user.clear(screen.getByRole("searchbox"));
    expect(handles()[0]).not.toHaveAttribute("aria-disabled");
  });

  it("offers Clear sort in the header menu of a reorderable table", async () => {
    const user = userEvent.setup();
    const menuColumns = helper.columns([
      helper.accessor("description", { header: "Beschreibung" }),
      helper.accessor("amount", {
        header: ({ column }) => <DataTableColumnHeader column={column} title="Betrag" menu clearSortLabel="Unsortiert" />,
      }),
    ]);
    render(<ReorderTable columns={menuColumns} />);
    await user.click(screen.getByRole("button", { name: "Betrag" }));
    expect(screen.queryByRole("menuitem", { name: "Unsortiert" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("menuitem", { name: "Desc" }));
    expect(handles()[0]).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "Betrag" }));
    await user.click(await screen.findByRole("menuitem", { name: "Unsortiert" }));
    expect(screen.getByRole("columnheader", { name: "Betrag" })).not.toHaveAttribute("aria-sort");
    expect(handles()[0]).not.toHaveAttribute("aria-disabled");
  });

  it("uses a drag column from columns instead of adding one, also next to the select column", () => {
    render(<ReorderTable columns={[...columns, createDragColumn<Booking>()]} extra={{ enableRowSelection: true }} />);
    expect(handles()).toHaveLength(10);
    const cells = within(bodyRows()[0]!).getAllByRole("cell");
    // select column first (prepended), then the data columns, then the drag column.
    expect(within(cells[0]!).getByRole("checkbox")).toBeInTheDocument();
    expect(within(cells[3]!).getByRole("button", { name: "Drag to reorder" })).toBeInTheDocument();
  });

  it("renders disabled handles from createDragColumn without onRowMove", () => {
    render(<DataTable columns={[createDragColumn<Booking>(), ...columns]} data={bookings} />);
    expect(handles()[0]).toBeDisabled();
    expect(bodyRows()[0]).not.toHaveAttribute("data-sortable-id");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Select column: scope, max, locked rows
// ---------------------------------------------------------------------------------------------------------------------

describe("DataTable select column options", () => {
  const counter = () => screen.getByText(/row\(s\) selected\./);
  const selectAll = () => screen.getByRole("checkbox", { name: "Select all" });
  const rowBox = (index: number) => within(bodyRows()[index]!).getByRole("checkbox");

  it('scope "filtered" selects every matching row across pages', async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={[createSelectColumn<Booking>({ scope: "filtered" }), ...columns]}
        data={bookings}
        getRowId={(row) => row.id}
        enableRowSelection
        filterColumn="description"
      />,
    );
    await user.type(screen.getByRole("searchbox"), "tanken");
    expect(bodyRows()).toHaveLength(10);
    expect(selectAll()).toHaveAttribute("data-scope", "filtered");
    await user.click(selectAll());
    expect(counter()).toHaveTextContent("13 of 13 row(s) selected.");
    expect(selectAll()).toHaveAttribute("aria-checked", "true");

    await user.click(rowBox(0));
    expect(selectAll()).toHaveAttribute("aria-checked", "mixed");
    await user.click(selectAll());
    expect(counter()).toHaveTextContent("13 of 13 row(s) selected.");
    await user.click(selectAll());
    expect(counter()).toHaveTextContent("0 of 13 row(s) selected.");
  });

  it('scope "page" (default) still selects only the current page', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={[createSelectColumn<Booking>(), ...columns]} data={bookings} enableRowSelection />);
    await user.click(selectAll());
    expect(counter()).toHaveTextContent("10 of 25 row(s) selected.");
  });

  it("stops at max: first rows in the current order, other checkboxes disabled, the header clears again", async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    render(
      <DataTable
        columns={[createSelectColumn<Booking>({ scope: "filtered", max: 3 }), ...columns]}
        data={bookings}
        getRowId={(row) => row.id}
        enableRowSelection
        onRowSelectionChange={onRowSelectionChange}
        initialSorting={[{ id: "amount", desc: true }]}
      />,
    );
    await user.click(selectAll());
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({ b25: true, b24: true, b23: true }, expect.any(Array));
    expect(selectAll()).toHaveAttribute("aria-checked", "true");
    expect(rowBox(0)).toHaveAttribute("aria-checked", "true");
    expect(rowBox(3)).toHaveAttribute("aria-disabled", "true");
    // A selected row can still be unselected, which frees a slot.
    await user.click(rowBox(1));
    expect(rowBox(3)).not.toHaveAttribute("aria-disabled");
    expect(selectAll()).toHaveAttribute("aria-checked", "mixed");
    await user.click(rowBox(5));
    expect(selectAll()).toHaveAttribute("aria-checked", "true");
    await user.click(selectAll());
    expect(counter()).toHaveTextContent("0 of 25 row(s) selected.");
  });

  it("shows locked rows checked and disabled, outside the selection and the header logic", async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    const locked = new Set(["b1", "b2"]);
    render(
      <DataTable
        columns={[
          createSelectColumn<Booking>({ isLocked: (row) => locked.has(row.original.id), lockedRowLabel: "Bereits hinzugefügt" }),
          ...columns,
        ]}
        data={bookings}
        getRowId={(row) => row.id}
        enableRowSelection
        onRowSelectionChange={onRowSelectionChange}
      />,
    );
    const lockedBox = screen.getAllByRole("checkbox", { name: "Bereits hinzugefügt" })[0]!;
    expect(lockedBox).toHaveAttribute("aria-checked", "true");
    expect(lockedBox).toHaveAttribute("aria-disabled", "true");
    expect(lockedBox).toHaveAttribute("data-locked");
    expect(selectAll()).toHaveAttribute("aria-checked", "false");

    await user.click(selectAll());
    const [selection] = onRowSelectionChange.mock.lastCall!;
    expect(Object.keys(selection)).toHaveLength(8);
    expect(selection.b1).toBeUndefined();
    expect(selectAll()).toHaveAttribute("aria-checked", "true");
  });

  it("handles a page where no row can be picked", async () => {
    const user = userEvent.setup();
    // Page 1 (b1–b10): all locked → reads as done. Page 2 (b11–b20): not selectable → unavailable.
    const { unmount } = render(
      <DataTable
        columns={[createSelectColumn<Booking>({ isLocked: (row) => Number(row.original.id.slice(1)) <= 10 }), ...columns]}
        data={bookings}
        getRowId={(row) => row.id}
        enableRowSelection={(row) => Number(row.original.id.slice(1)) > 20}
      />,
    );
    expect(selectAll()).toHaveAttribute("aria-checked", "true");
    expect(selectAll()).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(selectAll()).toHaveAttribute("aria-checked", "false");
    expect(selectAll()).toHaveAttribute("aria-disabled", "true");
    expect(rowBox(0)).toHaveAttribute("aria-disabled", "true");
    expect(rowBox(0)).toHaveAttribute("aria-checked", "false");
    unmount();

    // With scope "filtered" the header still reaches the selectable rows on other pages.
    render(
      <DataTable
        columns={[createSelectColumn<Booking>({ scope: "filtered" }), ...columns]}
        data={bookings}
        getRowId={(row) => row.id}
        enableRowSelection={(row) => Number(row.original.id.slice(1)) > 20}
      />,
    );
    expect(selectAll()).not.toHaveAttribute("aria-disabled");
    await user.click(selectAll());
    expect(counter()).toHaveTextContent("5 of 25 row(s) selected.");
    expect(selectAll()).toHaveAttribute("aria-checked", "true");
  });
});

describe("DataTable with server data", () => {
  it("pages manually with a row count and reports the new page", async () => {
    const user = userEvent.setup();
    const onPaginationChange = vi.fn();
    // The server sent the first page only; the footer still knows there are four.
    render(
      <DataTable
        columns={columns}
        data={bookings.slice(0, 10)}
        manualPagination
        rowCount={37}
        onPaginationChange={onPaginationChange}
      />,
    );
    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByText("Page 1 of 4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(onPaginationChange).toHaveBeenLastCalledWith({ pageIndex: 1, pageSize: 10 });
    expect(screen.getByText("Page 2 of 4")).toBeInTheDocument();
  });

  it("takes pageCount over rowCount and keeps the page controlled", async () => {
    const user = userEvent.setup();
    const onPaginationChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={bookings.slice(0, 5)}
        manualPagination
        pageCount={9}
        paginationState={{ pageIndex: 2, pageSize: 5 }}
        onPaginationChange={onPaginationChange}
      />,
    );
    expect(screen.getByText("Page 3 of 9")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Go to last page" }));
    expect(onPaginationChange).toHaveBeenLastCalledWith({ pageIndex: 8, pageSize: 5 });
    // Controlled: the page only changes when the prop does.
    expect(screen.getByText("Page 3 of 9")).toBeInTheDocument();
  });

  it("leaves the row order to the server with manualSorting", async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={bookings.slice(0, 3)}
        manualSorting
        sorting={[{ id: "amount", desc: true }]}
        onSortingChange={onSortingChange}
      />,
    );
    const header = screen.getByRole("columnheader", { name: "Betrag" });
    expect(header).toHaveAttribute("aria-sort", "descending");
    // Rows stay in the order the server sent them.
    expect(firstCellTexts()).toEqual(["Tanken 1", "Lieferung 2", "Tanken 3"]);

    await user.click(within(header).getByRole("button", { name: "Betrag" }));
    expect(onSortingChange).toHaveBeenLastCalledWith([{ id: "amount", desc: false }]);
    expect(firstCellTexts()).toEqual(["Tanken 1", "Lieferung 2", "Tanken 3"]);
  });

  it("reports the sorting without controlling it", async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    render(<DataTable columns={columns} data={bookings} onSortingChange={onSortingChange} />);
    await user.click(within(screen.getByRole("columnheader", { name: "Betrag" })).getByRole("button"));
    expect(onSortingChange).toHaveBeenLastCalledWith([{ id: "amount", desc: false }]);
    // Not controlled: the table still sorts itself.
    expect(within(bodyRows()[0]!).getAllByRole("cell")[1]).toHaveTextContent("$100");
  });

  it("hides the footer and shows every row with pagination={false}", () => {
    render(<DataTable columns={columns} data={bookings} pagination={false} />);
    expect(bodyRows()).toHaveLength(25);
    expect(document.querySelector("[data-slot=data-table-pagination]")).toBeNull();
  });

  it("shows the footer in auto mode only for more than one page", () => {
    const { unmount } = render(<DataTable columns={columns} data={bookings.slice(0, 7)} pagination="auto" />);
    expect(document.querySelector("[data-slot=data-table-pagination]")).toBeNull();
    expect(bodyRows()).toHaveLength(7);
    unmount();

    render(<DataTable columns={columns} data={bookings} pagination="auto" />);
    expect(document.querySelector("[data-slot=data-table-pagination]")).not.toBeNull();
    expect(bodyRows()).toHaveLength(10);
  });

  it("controls the toolbar search from outside", async () => {
    const user = userEvent.setup();
    const onFilterValueChange = vi.fn();
    function Example() {
      const [value, setValue] = useState("");
      return (
        <>
          <Button
            onClick={() => {
              setValue("");
              onFilterValueChange("");
            }}
          >
            Zurücksetzen
          </Button>
          <DataTable
            columns={columns}
            data={bookings}
            filterColumn="description"
            filterPlaceholder="Suchen…"
            filterValue={value}
            onFilterValueChange={(next) => {
              setValue(next);
              onFilterValueChange(next);
            }}
          />
        </>
      );
    }
    render(<Example />);
    const search = screen.getByRole("searchbox", { name: "Suchen…" });
    await user.type(search, "tanken 2");
    expect(onFilterValueChange).toHaveBeenLastCalledWith("tanken 2");
    expect(search).toHaveValue("tanken 2");
    expect(firstCellTexts()).toEqual(["Tanken 21", "Tanken 23", "Tanken 25"]);

    await user.click(screen.getByRole("button", { name: "Zurücksetzen" }));
    expect(search).toHaveValue("");
    expect(bodyRows()).toHaveLength(10);
  });

  it("filters from a controlled filterValue alone", () => {
    render(
      <DataTable columns={columns} data={bookings} filterColumn="description" filterValue="lieferung 1" />,
    );
    expect(firstCellTexts()).toEqual(["Lieferung 10", "Lieferung 12", "Lieferung 14", "Lieferung 16", "Lieferung 18"]);
    expect(screen.getByRole("searchbox")).toHaveValue("lieferung 1");
  });

  it("reports the search without controlling it", async () => {
    const user = userEvent.setup();
    const onFilterValueChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={bookings}
        filterColumn="description"
        onFilterValueChange={onFilterValueChange}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "tanken 25");
    expect(onFilterValueChange).toHaveBeenLastCalledWith("tanken 25");
    expect(firstCellTexts()).toEqual(["Tanken 25"]);
  });

  it("moves rows across the whole list without paging", async () => {
    const onRowMove = vi.fn();
    function Example() {
      const [data, setData] = useState(bookings.slice(0, 12));
      return (
        <DataTable
          columns={columns}
          data={data}
          getRowId={(row) => row.id}
          pagination={false}
          onRowMove={(from, to) => {
            onRowMove(from, to);
            setData((current) => moveItem(current, from, to));
          }}
        />
      );
    }
    render(<Example />);
    const handles = screen.getAllByRole("button", { name: "Drag to reorder" });
    expect(handles).toHaveLength(12);
    // Keyboard move: the first row walks down to the last one, which lives on page 2 with the default page size.
    handles[0]!.focus();
    await userEvent.keyboard(" ");
    for (let i = 0; i < 11; i += 1) await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    expect(onRowMove).toHaveBeenLastCalledWith(0, 11);
    // Cell 0 is the drag handle column, cell 1 the description.
    expect(within(bodyRows()[11]!).getAllByRole("cell")[1]).toHaveTextContent("Tanken 1");
  });
});

describe("DataTablePagination tooltips", () => {
  it("shows the page-button labels as tooltips", async () => {
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={bookings}
        pageSize={5}
        paginationProps={{ nextPageLabel: "Naechste Seite", pageTooltip: { delay: 0, side: "top" } }}
      />,
    );
    await user.hover(screen.getByRole("button", { name: "Naechste Seite" }));
    const popup = await screen.findByText("Naechste Seite");
    expect(popup).toHaveAttribute("data-slot", "tooltip-content");
    expect(popup).toHaveAttribute("data-side", "top");
  });

  it("can be turned off and still pages", async () => {
    const user = userEvent.setup();
    render(
      <DataTable columns={columns} data={bookings} pageSize={5} paginationProps={{ pageTooltip: false }} />,
    );
    const next = screen.getByRole("button", { name: "Go to next page" });
    expect(next).not.toHaveAttribute("data-slot", "tooltip-trigger");
    await user.click(next);
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });
});
