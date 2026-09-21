import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "./NavigationMenu";

function Example() {
  return (
    <NavigationMenu className="custom-root">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className={(state) => (state.open ? "is-open" : "is-closed")}>
            Finanzen
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#konten" active>
              Konten
            </NavigationMenuLink>
            <NavigationMenuLink href="#budgets">Budgets</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger disabled>Berichte</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#monat">Monat</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#hilfe" className={navigationMenuTriggerStyle()}>
            Hilfe
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
      <NavigationMenuViewport className="custom-popup" />
    </NavigationMenu>
  );
}

describe("NavigationMenu", () => {
  it("renders a navigation landmark with styled triggers", () => {
    render(<Example />);
    expect(screen.getByRole("navigation")).toHaveClass("relative", "custom-root");
    const trigger = screen.getByRole("button", { name: "Finanzen" });
    expect(trigger).toHaveClass("h-pui-control", "hover:bg-pui-accent", "is-closed");
    expect(trigger).toHaveAttribute("data-slot", "navigation-menu-trigger");
    expect(trigger.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hilfe" })).toHaveClass("inline-flex", "h-pui-control");
  });

  it("opens the content panel in the floating surface", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Finanzen" });
    await user.click(trigger);

    const link = await screen.findByRole("link", { name: "Konten" });
    expect(link).toHaveClass("rounded-pui-sm");
    // The panel scrolls inside the preUI ScrollArea when it is taller than the available space.
    const viewport = link.closest('[data-slot="scroll-area-viewport"]');
    expect(viewport).toHaveClass("max-h-[calc(var(--available-height)-2px)]");
    expect(viewport).toHaveAttribute("tabindex", "-1");
    expect(link).toHaveAttribute("data-active");
    // The active link keeps a visible hover/focus state (tint 15 % -> 25 %).
    expect(link).toHaveClass("data-[active]:bg-pui-primary/tint", "data-[active]:hover:bg-pui-primary/tint-hover", "data-[active]:focus-visible:bg-pui-primary/tint-hover");
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    expect(trigger).toHaveClass("is-open");
    expect(document.querySelector(".custom-popup")).toHaveClass("bg-pui-popover", "shadow-pui-floating");
  });

  it("rotates the chevron via data-popup-open", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Finanzen" });
    const icon = trigger.querySelector("svg")!.parentElement!;
    expect(icon).toHaveClass("transition-transform", "duration-pui-fast", "ease-pui", "data-[popup-open]:rotate-180");
    await user.click(trigger);
    await waitFor(() => expect(icon).toHaveAttribute("data-popup-open"));
  });

  it("marks disabled triggers", () => {
    render(<Example />);
    expect(screen.getByRole("button", { name: "Berichte" })).toHaveAttribute("data-disabled");
  });
});
