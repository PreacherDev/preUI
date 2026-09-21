import { render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./Table";

function renderTable() {
  return render(
    <Table>
      <TableCaption>Buchungen im September</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead className="text-right">Betrag</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>01.09.</TableCell>
          <TableCell className="text-right">$1.200</TableCell>
        </TableRow>
        <TableRow data-state="selected">
          <TableCell>02.09.</TableCell>
          <TableCell className="text-right">$340</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>Summe</TableCell>
          <TableCell className="text-right">$1.540</TableCell>
        </TableRow>
      </TableFooter>
    </Table>,
  );
}

describe("Table", () => {
  it("renders a table inside the bordered wrapper", () => {
    renderTable();
    const table = screen.getByRole("table", { name: "Buchungen im September" });
    expect(table).toHaveClass("w-full", "text-sm");
    const container = table.closest("[data-slot=table-container]")!;
    expect(container).toHaveClass("overflow-hidden", "rounded-pui", "border", "bg-pui-card");
    // The table scrolls in a preUI ScrollArea (both axes) inside the rounded container — no native overflow.
    const viewport = table.closest("[data-slot=scroll-area-viewport]")!;
    expect(viewport).toBeInTheDocument();
    expect(container).toContainElement(viewport as HTMLElement);
    expect(container.querySelector("[data-slot=scroll-area]")).toBeInTheDocument();
    expect(container).not.toHaveClass("overflow-auto");
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });

  it("styles header, rows and cells", () => {
    renderTable();
    const head = screen.getByRole("columnheader", { name: "Datum" });
    expect(head).toHaveClass("h-10", "px-4", "uppercase", "text-pui-eyebrow");
    expect(head.closest("thead")).toHaveClass("sticky", "top-0", "bg-pui-card");
    const cell = screen.getByRole("cell", { name: "$1.200" });
    expect(cell).toHaveClass("px-4", "py-2.5", "tabular-nums", "text-right");
    const row = cell.closest("tr")!;
    expect(row).toHaveClass("border-b", "hover:bg-pui-accent/40", "data-[state=selected]:bg-pui-accent");
    const selected = screen.getByRole("cell", { name: "$340" }).closest("tr")!;
    expect(selected).toHaveAttribute("data-state", "selected");
    expect(row.parentElement).toHaveClass("[&_tr:last-child]:border-0");
    expect(within(screen.getByText("Summe").closest("tfoot")!).getByText("$1.540")).toBeInTheDocument();
  });

  it("merges className on table and container and forwards refs", () => {
    const ref = createRef<HTMLTableElement>();
    render(
      <Table ref={ref} className="text-xs" containerClassName="max-h-64 rounded-none">
        <TableBody>
          <TableRow className="border-0">
            <TableCell>Zelle</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const table = screen.getByRole("table");
    expect(ref.current).toBe(table);
    expect(table).toHaveClass("text-xs");
    expect(table).not.toHaveClass("text-sm");
    const container = table.closest("[data-slot=table-container]")!;
    expect(container).toHaveClass("max-h-64", "rounded-none");
    expect(container).not.toHaveClass("rounded-pui");
    expect(screen.getByRole("row")).toHaveClass("border-0");
  });
});

describe("Table tokens + slots", () => {
  it("marks every part with data-slot and uses the motion tokens", () => {
    const { container } = renderTable();
    for (const slot of ["table-container", "table", "table-header", "table-body", "table-footer", "table-row", "table-head", "table-cell", "table-caption"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toBeInTheDocument();
    }
    expect(container.querySelector('[data-slot="table-row"]')).toHaveClass("duration-pui-fast", "ease-pui");
  });
});
