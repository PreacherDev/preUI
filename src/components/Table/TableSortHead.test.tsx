import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./Table";
import { TableSortHead, type TableSortDirection } from "./TableSortHead";

function renderHead(props: Parameters<typeof TableSortHead>[0]) {
  return render(
    <Table>
      <TableHeader>
        <TableRow>
          <TableSortHead {...props} />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>01.09.</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

describe("TableSortHead", () => {
  it("renders a plain header cell without onSort", () => {
    renderHead({ children: "Datum" });
    const head = screen.getByRole("columnheader", { name: "Datum" });
    expect(head).toHaveAttribute("data-slot", "table-sort-head");
    expect(head).not.toHaveAttribute("aria-sort");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("reports the sort direction with aria-sort", () => {
    const { unmount } = renderHead({ children: "Datum", sorted: false, onSort: () => {} });
    expect(screen.getByRole("columnheader", { name: "Datum" })).toHaveAttribute("aria-sort", "none");
    unmount();

    renderHead({ children: "Datum", sorted: "desc", onSort: () => {} });
    expect(screen.getByRole("columnheader", { name: "Datum" })).toHaveAttribute("aria-sort", "descending");
  });

  it("cycles ascending, descending and back on click", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const { rerender } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableSortHead sorted={false} onSort={onSort}>
              Datum
            </TableSortHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    await user.click(screen.getByRole("button", { name: "Datum" }));
    expect(onSort).toHaveBeenLastCalledWith("asc");

    const head = (sorted: TableSortDirection) => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableSortHead sorted={sorted} onSort={onSort}>
              Datum
            </TableSortHead>
          </TableRow>
        </TableHeader>
      </Table>
    );
    rerender(head("asc"));
    await user.click(screen.getByRole("button", { name: "Datum" }));
    expect(onSort).toHaveBeenLastCalledWith("desc");

    rerender(head("desc"));
    await user.click(screen.getByRole("button", { name: "Datum" }));
    expect(onSort).toHaveBeenLastCalledWith("asc");
  });

  it("starts descending and clears with descFirst and clearable", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    const { rerender } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableSortHead sorted={false} descFirst clearable onSort={onSort}>
              Betrag
            </TableSortHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    await user.click(screen.getByRole("button", { name: "Betrag" }));
    expect(onSort).toHaveBeenLastCalledWith("desc");

    rerender(
      <Table>
        <TableHeader>
          <TableRow>
            <TableSortHead sorted="asc" descFirst clearable onSort={onSort}>
              Betrag
            </TableSortHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );
    await user.click(screen.getByRole("button", { name: "Betrag" }));
    expect(onSort).toHaveBeenLastCalledWith(false);
  });

  it("drives a server sort as the single source of truth", async () => {
    const user = userEvent.setup();
    function Example() {
      const [sorted, setSorted] = useState<TableSortDirection>(false);
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableSortHead sorted={sorted} onSort={setSorted}>
                Datum
              </TableSortHead>
            </TableRow>
          </TableHeader>
        </Table>
      );
    }
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Datum" }));
    expect(screen.getByRole("columnheader", { name: "Datum" })).toHaveAttribute("aria-sort", "ascending");
    await user.click(screen.getByRole("button", { name: "Datum" }));
    expect(screen.getByRole("columnheader", { name: "Datum" })).toHaveAttribute("aria-sort", "descending");
  });

  it("aligns to the right and merges the class name", () => {
    renderHead({ children: "Betrag", sorted: "asc", align: "right", className: "w-28", onSort: () => {} });
    const head = screen.getByRole("columnheader", { name: "Betrag" });
    expect(head).toHaveClass("text-right", "w-28");
    expect(head.querySelector("[data-slot=table-sort-head-inner]")).toHaveClass("justify-end");
    expect(screen.getByRole("button", { name: "Betrag" })).toHaveAttribute("data-sorted", "asc");
  });
});
