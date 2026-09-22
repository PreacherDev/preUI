import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./Pagination";

function Pager({ onPage }: { onPage?: (page: number) => void }) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" aria-disabled="true" />
        </PaginationItem>
        {[1, 2, 3].map((page) => (
          <PaginationItem key={page}>
            <PaginationLink href="#" isActive={page === 2} onClick={() => onPage?.(page)}>
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

describe("Pagination", () => {
  it("exposes the link variant and size as data attributes", () => {
    render(<Pager />);
    const active = screen.getByRole("link", { name: "2" });
    expect(active).toHaveAttribute("data-slot", "pagination-link");
    expect(active).toHaveAttribute("data-variant", "outline");
    expect(active).toHaveAttribute("data-size", "icon-sm");
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute("data-variant", "ghost");
    expect(screen.getByRole("link", { name: "Go to previous page" })).toHaveAttribute("data-size", "sm");
  });

  it("renders a labelled nav with a pill list", () => {
    render(<Pager />);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(nav).toHaveClass("text-xs", "text-pui-muted-foreground");
    expect(screen.getByRole("list")).toHaveClass("rounded-full", "border-pui-border", "bg-pui-card", "p-0.5");
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("marks the active page", () => {
    render(<Pager />);
    const active = screen.getByRole("link", { name: "2" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveAttribute("data-active");
    expect(active).toHaveClass("bg-pui-accent", "text-pui-foreground", "rounded-full", "size-7");
    const inactive = screen.getByRole("link", { name: "1" });
    expect(inactive).not.toHaveAttribute("aria-current");
    expect(inactive).toHaveClass("text-pui-muted-foreground");
  });

  it("renders previous/next with default labels and icons", () => {
    render(<Pager />);
    const prev = screen.getByRole("link", { name: "Go to previous page" });
    expect(prev).toHaveTextContent("Previous");
    expect(prev).toHaveAttribute("aria-disabled", "true");
    expect(prev).toHaveClass("aria-disabled:pointer-events-none");
    expect(prev.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Go to next page" })).toHaveTextContent("Next");
    expect(screen.getByText("More pages")).toHaveClass("sr-only");
  });

  it("accepts custom labels", () => {
    render(
      <>
        <PaginationPrevious href="#" label="Zurück" aria-label="Vorherige Seite" />
        <PaginationNext href="#" label="Weiter" aria-label="Nächste Seite" />
      </>,
    );
    expect(screen.getByRole("link", { name: "Vorherige Seite" })).toHaveTextContent("Zurück");
    expect(screen.getByRole("link", { name: "Nächste Seite" })).toHaveTextContent("Weiter");
  });

  it("handles clicks", async () => {
    const onPage = vi.fn();
    render(<Pager onPage={onPage} />);
    await userEvent.click(screen.getByRole("link", { name: "3" }));
    expect(onPage).toHaveBeenCalledWith(3);
  });

  it("merges className and supports render", () => {
    render(
      <PaginationLink className="size-9" render={<button type="button" />}>
        4
      </PaginationLink>,
    );
    const button = screen.getByRole("button", { name: "4" });
    expect(button).toHaveClass("size-9");
    expect(button).not.toHaveClass("size-7");
  });
});

describe("Pagination a11y fixes", () => {
  it("PaginationEllipsis: the label is exposed, the icon hidden", () => {
    render(<PaginationEllipsis data-testid="ellipsis" />);
    expect(screen.getByTestId("ellipsis")).not.toHaveAttribute("aria-hidden");
    expect(screen.getByText("More pages").closest("[aria-hidden]")).toBeNull();
  });

  it("an aria-disabled PaginationLink leaves the tab order and doesn't activate", async () => {
    const onClick = vi.fn();
    render(
      <PaginationLink href="#p2" aria-disabled="true" onClick={onClick}>
        2
      </PaginationLink>,
    );
    const link = screen.getByRole("link", { name: "2" });
    expect(link).toHaveAttribute("tabindex", "-1");
    link.focus();
    await userEvent.keyboard("{Enter}");
    link.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("an enabled PaginationLink still calls onClick", async () => {
    const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(<PaginationLink href="#p3" onClick={onClick}>3</PaginationLink>);
    const link = screen.getByRole("link", { name: "3" });
    expect(link).not.toHaveAttribute("tabindex");
    await userEvent.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
