import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../DropdownMenu/DropdownMenu";
import { DataTable } from "./DataTable";
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
