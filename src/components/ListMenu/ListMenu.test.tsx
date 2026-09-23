import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { vi } from "vitest";
import {
  ListMenu,
  ListMenuContent,
  ListMenuFooter,
  ListMenuGroup,
  ListMenuHeader,
  ListMenuItem,
  ListMenuLabel,
  ListMenuSeparator,
  useListMenu,
} from "./ListMenu";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn() as unknown as Element["scrollIntoView"];
});

function Position() {
  const { highlightedIndex, count, highlightedValue } = useListMenu();
  return (
    <span data-testid="position" data-value={highlightedValue}>
      {highlightedIndex + 1}/{count}
    </span>
  );
}

const highlighted = () => screen.getAllByRole("menuitem").find((item) => item.hasAttribute("data-highlighted"));

describe("ListMenu", () => {
  it("renders the panel parts with slots and roles", () => {
    render(
      <ListMenu className="w-96" data-testid="menu">
        <ListMenuHeader>Garage</ListMenuHeader>
        <ListMenuContent aria-label="Fahrzeuge">
          <ListMenuGroup>
            <ListMenuLabel>Eingeparkt</ListMenuLabel>
            <ListMenuItem value="sultan" icon={<svg data-testid="icon" />} description="LS 42 KRN" suffix="96 %" submenu>
              Sultan RS
            </ListMenuItem>
          </ListMenuGroup>
          <ListMenuSeparator />
          <ListMenuItem value="back">Zurück</ListMenuItem>
        </ListMenuContent>
        <ListMenuFooter>
          <Position />
        </ListMenuFooter>
      </ListMenu>,
    );
    const menu = screen.getByTestId("menu");
    expect(menu).toHaveAttribute("data-slot", "list-menu");
    expect(menu).toHaveClass("w-96", "bg-pui-card", "rounded-pui");
    const list = screen.getByRole("menu", { name: "Fahrzeuge" });
    expect(list).toHaveAttribute("data-slot", "list-menu-content");
    const group = screen.getByRole("group", { name: "Eingeparkt" });
    expect(group).toHaveAttribute("data-slot", "list-menu-group");
    const sultan = screen.getByRole("menuitem", { name: /Sultan RS/ });
    expect(sultan).toHaveAttribute("data-slot", "list-menu-item");
    expect(sultan).toHaveAttribute("aria-haspopup", "menu");
    expect(sultan).toHaveAttribute("data-highlighted");
    expect(list).toHaveAttribute("aria-activedescendant", sultan.id);
    expect(sultan.querySelector("[data-slot=list-menu-item-icon]")).toContainElement(screen.getByTestId("icon"));
    expect(sultan.querySelector("[data-slot=list-menu-item-description]")).toHaveTextContent("LS 42 KRN");
    expect(sultan.querySelector("[data-slot=list-menu-item-suffix]")).toHaveTextContent("96 %");
    expect(sultan.querySelector("[data-slot=list-menu-item-chevron]")).not.toBeNull();
    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "list-menu-separator");
    expect(screen.getByTestId("position")).toHaveTextContent("1/2");
    expect(screen.getByText("Garage")).toHaveAttribute("data-slot", "list-menu-header");
  });

  it("navigates in DOM order, selects and calls item + menu onSelect", async () => {
    const user = userEvent.setup();
    const onItem = vi.fn();
    const onSelect = vi.fn();
    render(
      <ListMenu onSelect={onSelect}>
        <ListMenuContent aria-label="Aktionen">
          <ListMenuItem value="a">Tür öffnen</ListMenuItem>
          <ListMenuItem value="b" disabled>
            Motorhaube
          </ListMenuItem>
          <ListMenuItem value="c" onSelect={onItem}>
            Kofferraum
          </ListMenuItem>
        </ListMenuContent>
        <Position />
      </ListMenu>,
    );
    screen.getByRole("menu").focus();
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Kofferraum");
    expect(screen.getByTestId("position")).toHaveTextContent("3/3");
    await user.keyboard("{Enter}");
    expect(onItem).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("c");
    await user.click(screen.getByRole("menuitem", { name: "Motorhaube" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("menuitem", { name: "Tür öffnen" }));
    expect(onSelect).toHaveBeenLastCalledWith("a");
    expect(screen.getByRole("menuitem", { name: "Motorhaube" })).toHaveAttribute("data-disabled");
  });

  it("keeps disabled items reachable with skipDisabled={false}", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ListMenu skipDisabled={false} onSelect={onSelect}>
        <ListMenuContent aria-label="Aktionen">
          <ListMenuItem value="spawn" disabled description="Das Fahrzeug ist bereits draußen.">
            Ausparken
          </ListMenuItem>
          <ListMenuItem value="rename">Umbenennen</ListMenuItem>
        </ListMenuContent>
      </ListMenu>,
    );
    expect(highlighted()).toHaveTextContent("Ausparken");
    screen.getByRole("menu").focus();
    await user.keyboard("{Enter}");
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Ausparken");
  });

  it("is controllable by value and follows items that mount later", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState("b");
      const [more, setMore] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setMore(true)}>
            mehr
          </button>
          <ListMenu
            highlightedValue={value}
            onHighlightedValueChange={(next, source) => {
              onChange(next, source);
              if (next) setValue(next);
            }}
          >
            <ListMenuContent aria-label="Liste">
              <ListMenuItem value="a">A</ListMenuItem>
              {more && <ListMenuItem value="a2">A2</ListMenuItem>}
              <ListMenuItem value="b">B</ListMenuItem>
            </ListMenuContent>
            <Position />
          </ListMenu>
        </>
      );
    }
    render(<Controlled />);
    expect(highlighted()).toHaveTextContent("B");
    await user.click(screen.getByRole("button", { name: "mehr" }));
    expect(screen.getByTestId("position")).toHaveTextContent("3/3");
    screen.getByRole("menu").focus();
    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenLastCalledWith("a2", "keyboard");
    expect(highlighted()).toHaveTextContent("A2");
    fireEvent.pointerMove(screen.getByRole("menuitem", { name: "A" }));
    expect(onChange).toHaveBeenLastCalledWith("a", "pointer");
  });

  it("listens on window, handles back/close, and pauses when disabled", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <ListMenu keyboardTarget="window" onBack={onBack} onClose={onClose}>
        <ListMenuContent aria-label="Liste">
          <ListMenuItem value="a">Alpha</ListMenuItem>
          <ListMenuItem value="b">Bravo</ListMenuItem>
        </ListMenuContent>
      </ListMenu>,
    );
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Bravo");
    await user.keyboard("b"); // typeahead is off in window mode
    expect(highlighted()).toHaveTextContent("Bravo");
    await user.keyboard("{Backspace}{Escape}");
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <ListMenu keyboardTarget="window" enabled={false} onBack={onBack} onClose={onClose}>
        <ListMenuContent aria-label="Liste">
          <ListMenuItem value="a">Alpha</ListMenuItem>
          <ListMenuItem value="b">Bravo</ListMenuItem>
        </ListMenuContent>
      </ListMenu>,
    );
    await user.keyboard("{ArrowDown}{Escape}");
    expect(highlighted()).toHaveTextContent("Bravo");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has typeahead on the focused list, using textValue or the title", async () => {
    const user = userEvent.setup();
    render(
      <ListMenu>
        <ListMenuContent aria-label="Liste" autoFocus>
          <ListMenuItem value="a" description="Zapfsäule">
            Tanken
          </ListMenuItem>
          <ListMenuItem value="b" textValue="Reparieren">
            <span>Werkstatt</span>
          </ListMenuItem>
          <ListMenuItem value="c">Zoll</ListMenuItem>
        </ListMenuContent>
      </ListMenu>,
    );
    expect(document.activeElement).toBe(screen.getByRole("menu"));
    await user.keyboard("z");
    expect(highlighted()).toHaveTextContent("Zoll"); // description text isn't matched
    await user.keyboard("{Home}");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await user.keyboard("r");
    expect(highlighted()).toHaveTextContent("Werkstatt");
  });

  it("renders items through `render` and merges className", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ListMenu size="lg">
        <ListMenuContent aria-label="Liste" className="max-h-40">
          <ListMenuItem value="a" render={<a href="#shop" />} className="px-5" onClick={onClick}>
            Shop
          </ListMenuItem>
        </ListMenuContent>
      </ListMenu>,
    );
    const item = screen.getByRole("menuitem", { name: "Shop" });
    expect(item.tagName).toBe("A");
    expect(item).toHaveAttribute("data-size", "lg");
    expect(item).toHaveClass("px-5");
    expect(item).not.toHaveClass("px-3");
    expect(screen.getByRole("menu")).toHaveClass("max-h-40");
    await user.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("scrolls a restored highlight into view on mount", () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll as unknown as Element["scrollIntoView"];
    render(
      <ListMenu defaultHighlightedValue="c">
        <ListMenuContent aria-label="Liste">
          <ListMenuItem value="a">A</ListMenuItem>
          <ListMenuItem value="b">B</ListMenuItem>
          <ListMenuItem value="c">C</ListMenuItem>
        </ListMenuContent>
      </ListMenu>,
    );
    expect(highlighted()).toHaveTextContent("C");
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.instances[0]).toBe(screen.getByRole("menuitem", { name: "C" }));
  });

  it("throws outside a ListMenu", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ListMenuItem>X</ListMenuItem>)).toThrow(/inside <ListMenu>/);
    spy.mockRestore();
  });
});
