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

  it("keeps the header divider on the sticky header (inset shadow, not the scrolling row border)", () => {
    renderTable();
    const thead = screen.getByRole("columnheader", { name: "Datum" }).closest("thead")!;
    expect(thead).toHaveClass(
      "[&>tr]:border-b-0",
      "[&>tr>*]:shadow-[inset_0_-1px_0_hsl(var(--pui-border)/var(--pui-border-opacity,1))]",
    );
  });

  it("gives the container the card text colour (not inherited, e.g. muted in AccordionContent)", () => {
    renderTable();
    expect(screen.getByRole("table").closest("[data-slot=table-container]")).toHaveClass("text-pui-card-foreground");
  });

  it("wraps long unbreakable cell text without changing the auto-layout min-content", () => {
    renderTable();
    const cell = screen.getByRole("cell", { name: "$1.200" });
    expect(cell).toHaveClass("break-words");
    expect(cell.className).not.toContain("anywhere");
    expect(screen.getByRole("columnheader", { name: "Datum" })).toHaveClass("whitespace-nowrap");
  });

  it("centres checkboxes and switches in cells and headers", () => {
    renderTable();
    for (const el of [screen.getByRole("cell", { name: "$1.200" }), screen.getByRole("columnheader", { name: "Datum" })]) {
      expect(el).toHaveClass("[&>[role=checkbox]]:align-top", "[&>[role=checkbox]]:my-0.5", "[&>[role=switch]]:align-top");
    }
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

  it("starts the vertical scrollbar below the header (--pui-table-header-height), 0 without a header", () => {
    const height = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.tagName === "THEAD" ? 40 : 0;
    });
    try {
      const { unmount } = renderTable();
      const container = screen.getByRole("table").closest<HTMLElement>("[data-slot=table-container]")!;
      expect(container.style.getPropertyValue("--pui-table-header-height")).toBe("40px");
      expect(container.querySelector("[data-slot=scroll-area]")).toHaveClass(
        "[&>[data-slot=scroll-area-scrollbar][data-orientation=vertical]]:!top-[var(--pui-table-header-height,0px)]",
      );
      unmount();
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Ohne Kopf</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      const plain = screen.getByRole("table").closest<HTMLElement>("[data-slot=table-container]")!;
      expect(plain.style.getPropertyValue("--pui-table-header-height")).toBe("0px");
    } finally {
      height.mockRestore();
    }
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
  it("reserveTrack reserves the scrollbar room per axis", () => {
    const { unmount } = renderTable();
    const content = () => document.querySelector("[data-slot=scroll-area-content]")!;
    expect(content()).not.toHaveClass("pb-2.5");
    unmount();
    render(
      <Table reserveTrack="horizontal">
        <TableBody>
          <TableRow>
            <TableCell>Zelle</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(content()).toHaveClass("pb-2.5");
    expect(content()).not.toHaveClass("pr-2.5");
  });
});
