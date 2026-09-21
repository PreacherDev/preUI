import { render, screen } from "@testing-library/react";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./Breadcrumb";

function Trail() {
  return (
    <Breadcrumb>
      <BreadcrumbList className="custom-list">
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Start</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator data-testid="sep" />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Einstellungen</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe("Breadcrumb", () => {
  it("renders a labelled nav with an ordered list", () => {
    render(<Trail />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    const list = nav.querySelector("ol");
    expect(list).toHaveClass("text-sm", "text-pui-muted-foreground", "custom-list");
    expect(list?.querySelectorAll("li")).toHaveLength(5);
  });

  it("marks the current page and hides separators", () => {
    render(<Trail />);
    const page = screen.getByText("Einstellungen");
    expect(page).toHaveAttribute("aria-current", "page");
    expect(page).toHaveClass("text-pui-foreground");
    const sep = screen.getByTestId("sep");
    expect(sep).toHaveAttribute("aria-hidden", "true");
    expect(sep.querySelector("svg")).not.toBeNull();
  });

  it("renders links with hover color and supports the render prop", () => {
    const { rerender } = render(<BreadcrumbLink href="/konto">Konto</BreadcrumbLink>);
    const link = screen.getByRole("link", { name: "Konto" });
    expect(link).toHaveAttribute("href", "/konto");
    expect(link).toHaveClass("hover:text-pui-foreground");
    rerender(
      <BreadcrumbLink className="extra" render={<button type="button" />}>
        Konto
      </BreadcrumbLink>,
    );
    const button = screen.getByRole("button", { name: "Konto" });
    expect(button).toHaveClass("extra", "hover:text-pui-foreground");
  });

  it("accepts a custom aria-label and ellipsis label", () => {
    render(
      <Breadcrumb aria-label="Pfad">
        <BreadcrumbEllipsis label="Mehr" />
      </Breadcrumb>,
    );
    expect(screen.getByRole("navigation", { name: "Pfad" })).toBeInTheDocument();
    expect(screen.getByText("Mehr")).toHaveClass("sr-only");
    // Same 20px line box as the text items, so a collapsed trail is not taller than a full one.
    expect(screen.getByText("Mehr").parentElement).toHaveClass("size-5");
    expect(screen.getByText("Mehr").parentElement).not.toHaveClass("size-9");
  });

  it("uses custom separator children", () => {
    render(
      <ol>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
      </ol>,
    );
    expect(screen.getByText("/")).toBeInTheDocument();
  });
});
