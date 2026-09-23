import { render, screen } from "@testing-library/react";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
  itemVariants,
} from "./Item";

describe("Item", () => {
  it("renders the full structure", () => {
    render(
      <ItemGroup>
        <Item data-testid="item">
          <ItemHeader>Kopf</ItemHeader>
          <ItemMedia variant="icon" data-testid="media">
            <svg />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Lagerhalle Nord</ItemTitle>
            <ItemDescription>Kapazität 1.200 Einheiten</ItemDescription>
          </ItemContent>
          <ItemActions>
            <button type="button">Öffnen</button>
          </ItemActions>
          <ItemFooter>Fuß</ItemFooter>
        </Item>
        <ItemSeparator />
        <Item>Zweites</Item>
      </ItemGroup>,
    );
    expect(screen.getByRole("list")).toHaveClass("flex-col");
    expect(screen.getByRole("separator")).toHaveClass("bg-pui-border", "my-0");
    const item = screen.getByTestId("item");
    expect(item).toHaveAttribute("data-variant", "default");
    expect(item).toHaveAttribute("data-size", "default");
    expect(item).toHaveClass("p-4", "gap-4", "rounded-pui");
    expect(screen.getByTestId("media")).toHaveClass("size-8", "bg-pui-muted");
    expect(screen.getByText("Lagerhalle Nord")).toHaveClass("font-medium");
    expect(screen.getByText("Kapazität 1.200 Einheiten")).toHaveClass("text-pui-muted-foreground", "line-clamp-2");
    expect(screen.getByRole("button", { name: "Öffnen" })).toBeInTheDocument();
    expect(screen.getByText("Kopf")).toHaveClass("basis-full");
  });

  it("applies variants and sizes", () => {
    render(
      <>
        <Item data-testid="outline" variant="outline" size="sm" />
        <Item data-testid="muted" variant="muted" />
        <ItemMedia data-testid="image" variant="image" />
      </>,
    );
    expect(screen.getByTestId("outline")).toHaveClass("border-pui-border", "py-3", "px-4", "gap-2.5");
    expect(screen.getByTestId("muted")).toHaveClass("bg-pui-muted/50");
    expect(screen.getByTestId("image")).toHaveClass("size-10", "overflow-hidden");
  });

  it("renders as a link through the render prop", () => {
    render(
      <Item render={<a href="/lager" />} className="extra">
        <ItemContent>
          <ItemTitle>Lager</ItemTitle>
        </ItemContent>
      </Item>,
    );
    const link = screen.getByRole("link", { name: "Lager" });
    expect(link).toHaveAttribute("href", "/lager");
    expect(link).toHaveAttribute("data-slot", "item");
    expect(link).toHaveClass("extra", "[a&]:hover:bg-pui-accent");
  });

  it("merges className", () => {
    render(<Item data-testid="item" className="p-2" />);
    expect(screen.getByTestId("item")).toHaveClass("p-2");
    expect(screen.getByTestId("item")).not.toHaveClass("p-4");
  });

  it("gives the raw outline classes no conflicting transparent border (used without tailwind-merge)", () => {
    const outline = itemVariants({ variant: "outline" }).split(/\s+/);
    expect(outline).toContain("border-pui-border");
    expect(outline).not.toContain("border-transparent");
    expect(itemVariants().split(/\s+/)).toContain("border-transparent");
  });
});

describe("Item highlighted state", () => {
  it("styles data-highlighted rows like a menu item (for useListNavigation)", () => {
    render(
      <Item data-highlighted="" data-testid="row">
        <ItemContent>Sultan RS</ItemContent>
      </Item>,
    );
    const row = screen.getByTestId("row");
    expect(row).toHaveClass("data-[highlighted]:bg-pui-accent", "data-[highlighted]:text-pui-accent-foreground");
    expect(row).toHaveAttribute("data-highlighted", "");
  });
});

describe("Item list semantics", () => {
  it("plain items inside ItemGroup are list items; render items keep their role", () => {
    render(
      <>
        <ItemGroup>
          <Item>Eins</Item>
          <Item render={<a href="#zwei" />}>Zwei</Item>
        </ItemGroup>
        <Item data-testid="standalone">Drei</Item>
      </>,
    );
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("listitem")).toHaveTextContent("Eins");
    expect(screen.getByRole("link", { name: "Zwei" })).toBeInTheDocument();
    expect(screen.getByTestId("standalone")).not.toHaveAttribute("role");
  });
});
