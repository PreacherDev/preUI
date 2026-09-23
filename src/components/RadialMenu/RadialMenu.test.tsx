import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  RadialMenu,
  type RadialMenuCenterState,
  type RadialMenuItem,
  type RadialMenuItemState,
  type RadialMenuProps,
} from "./RadialMenu";

const items: RadialMenuItem[] = [
  {
    id: "vehicle",
    label: "Vehicle",
    items: [
      { id: "doors", label: "Doors" },
      { id: "engine", label: "Engine" },
      { id: "trunk", label: "Trunk", disabled: true },
      { id: "hood", label: "Hood" },
    ],
  },
  { id: "person", label: "Person" },
  { id: "emotes", label: "Emotes", disabled: true },
  { id: "invoice", label: "Invoice" },
];

const makeItems = (count: number): RadialMenuItem[] =>
  Array.from({ length: count }, (_, index) => ({ id: `i${index}`, label: `Item ${index}` }));

const menu = () => screen.getByRole("menu");
const key = (name: string) => fireEvent.keyDown(menu(), { key: name });
const highlightedLabel = () => {
  const id = menu().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id)?.textContent : null;
};

/** The menu box sits at (0, 0) with the nominal size, so client coordinates = svg coordinates. */
function mockRect(size = 320) {
  menu().getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: size, bottom: size, width: size, height: size, x: 0, y: 0, toJSON() {} }) as DOMRect;
}

function pointer(x: number, y: number) {
  act(() => {
    menu().dispatchEvent(new MouseEvent("pointermove", { clientX: x, clientY: y, bubbles: true }));
  });
}

describe("RadialMenu", () => {
  it.each([2, 4, 8, 10])("renders one segment and one menuitem per item (%i)", (count) => {
    const { container } = render(<RadialMenu items={makeItems(count)} />);
    expect(container.querySelectorAll('[data-slot="radial-menu-segment"]')).toHaveLength(count);
    expect(screen.getAllByRole("menuitem")).toHaveLength(count);
    for (const path of container.querySelectorAll('[data-slot="radial-menu-segment"] path')) {
      expect(path.getAttribute("d")).not.toMatch(/NaN/);
    }
  });

  it("has menu semantics, data attributes and merges className/style", () => {
    render(<RadialMenu items={items} className="custom" size={240} style={{ margin: 4 }} data-testid="wheel" />);
    const root = menu();
    expect(root).toHaveAttribute("data-slot", "radial-menu");
    expect(root).toHaveAttribute("data-level", "0");
    expect(root).toHaveAttribute("aria-label", "Radial menu");
    expect(root).toHaveAttribute("tabindex", "0");
    expect(root).toHaveClass("custom", "rounded-full");
    expect(root.style.width).toBe("240px");
    expect(root.style.margin).toBe("4px");
    const [vehicle, , emotes] = screen.getAllByRole("menuitem");
    expect(vehicle).toHaveAttribute("aria-haspopup", "menu");
    expect(emotes).toHaveAttribute("aria-disabled", "true");
    expect(emotes).toHaveAttribute("data-disabled", "");
  });

  it("forwards the ref", () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<RadialMenu ref={ref} items={items} />);
    expect(ref.current).toBe(menu());
  });

  it("moves around the ring with the arrow keys, wrapping and skipping disabled items", () => {
    const { container } = render(<RadialMenu items={items} centerLabel="Interact" />);
    const center = () => container.querySelector('[data-slot="radial-menu-center-content"]')!.textContent;
    expect(center()).toBe("Interact");
    expect(menu()).not.toHaveAttribute("aria-activedescendant");

    key("ArrowRight");
    expect(highlightedLabel()).toBe("Vehicle");
    expect(center()).toBe("Vehicle");
    key("ArrowDown");
    expect(highlightedLabel()).toBe("Person");
    key("ArrowRight"); // skips the disabled "Emotes"
    expect(highlightedLabel()).toBe("Invoice");
    key("ArrowRight"); // wraps
    expect(highlightedLabel()).toBe("Vehicle");
    key("ArrowLeft"); // wraps backwards
    expect(highlightedLabel()).toBe("Invoice");
    key("ArrowUp"); // skips "Emotes" backwards
    expect(highlightedLabel()).toBe("Person");
    key("End");
    expect(highlightedLabel()).toBe("Invoice");
    key("Home");
    expect(highlightedLabel()).toBe("Vehicle");

    const segments = container.querySelectorAll('[data-slot="radial-menu-segment"]');
    expect(segments[0]).toHaveAttribute("data-highlighted", "");
    expect(segments[1]).not.toHaveAttribute("data-highlighted");
  });

  it("opens a submenu, goes back and reports the path on select", () => {
    const onSelect = vi.fn();
    const { container } = render(<RadialMenu items={items} onSelect={onSelect} keepOpenOnSelect />);
    key("ArrowRight");
    key("Enter");
    expect(menu()).toHaveAttribute("data-level", "1");
    expect(menu()).toHaveAttribute("aria-label", "Radial menu: Vehicle");
    expect(screen.getAllByRole("menuitem")).toHaveLength(4);
    expect(highlightedLabel()).toBe("Doors");
    expect(onSelect).not.toHaveBeenCalled();

    key("ArrowRight");
    key("ArrowRight"); // skips "Trunk"
    expect(highlightedLabel()).toBe("Hood");
    key(" ");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "hood" }), ["vehicle", "hood"]);
    expect(menu()).toHaveAttribute("data-level", "1");

    key("Backspace");
    expect(menu()).toHaveAttribute("data-level", "0");
    expect(highlightedLabel()).toBe("Vehicle");

    key("Enter");
    key("Escape");
    expect(menu()).toHaveAttribute("data-level", "0");
    // Not closable (no open/onOpenChange): the centre has no action on the root level.
    expect(container.querySelector('[data-slot="radial-menu-center"]')).not.toHaveAttribute("data-action");
  });

  it("does not select disabled items", () => {
    const onSelect = vi.fn();
    render(<RadialMenu items={[{ id: "a", label: "A", disabled: true }, { id: "b", label: "B", disabled: true }]} onSelect={onSelect} />);
    key("ArrowRight");
    expect(menu()).not.toHaveAttribute("aria-activedescendant");
    key("Enter");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("closes with Escape on the root level and after a selection (onOpenChange)", () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            open
          </button>
          <RadialMenu
            items={items}
            open={open}
            onSelect={onSelect}
            onOpenChange={(next) => {
              onOpenChange(next);
              setOpen(next);
            }}
          />
        </>
      );
    }
    render(<Controlled />);
    key("ArrowRight");
    key("Enter"); // into "Vehicle"
    key("Escape"); // back, not close
    expect(onOpenChange).not.toHaveBeenCalled();
    key("Escape");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByText("open"));
    expect(menu()).toHaveAttribute("data-level", "0");
    key("End");
    key("Enter");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "invoice" }), ["invoice"]);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("never closes itself without open/onOpenChange", () => {
    const onSelect = vi.fn();
    render(<RadialMenu items={items} onSelect={onSelect} />);
    key("Escape");
    key("End");
    key("Enter");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(menu()).toBeInTheDocument();
  });

  it("highlights by pointer angle, also outside the ring, but not in the centre", () => {
    const { container } = render(<RadialMenu items={items} />);
    mockRect();
    // Centre is (160, 160). 4 items: 0 = top, 1 = right, 2 = bottom (disabled), 3 = left.
    pointer(160, 20);
    expect(highlightedLabel()).toBe("Vehicle");
    pointer(1000, 170); // far outside, to the right
    expect(highlightedLabel()).toBe("Person");
    pointer(160, 300); // bottom = disabled
    expect(menu()).not.toHaveAttribute("aria-activedescendant");
    pointer(10, 150);
    expect(highlightedLabel()).toBe("Invoice");
    pointer(165, 165); // centre
    expect(menu()).not.toHaveAttribute("aria-activedescendant");
    expect(container.querySelector('[data-slot="radial-menu-center"]')).not.toHaveAttribute("data-active");
  });

  it("selects and opens submenus with clicks; the centre goes back", () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    const { container } = render(<RadialMenu items={items} onSelect={onSelect} onOpenChange={onOpenChange} />);
    mockRect();
    const center = container.querySelector('[data-slot="radial-menu-center"]')!;

    fireEvent.click(menu(), { clientX: 160, clientY: 10 }); // top = Vehicle → submenu
    expect(menu()).toHaveAttribute("data-level", "1");
    // Submenu with 4 items: the pointer is still at the top → "Doors" is highlighted.
    expect(highlightedLabel()).toBe("Doors");

    pointer(160, 160);
    expect(center).toHaveAttribute("data-action", "back");
    expect(center).toHaveAttribute("data-active", "");
    expect(container.querySelector('[data-slot="radial-menu-center-content"]')!.textContent).toBe("Back");
    fireEvent.click(menu(), { clientX: 160, clientY: 160 });
    expect(menu()).toHaveAttribute("data-level", "0");

    fireEvent.click(menu(), { clientX: 160, clientY: 310 }); // bottom = disabled
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(menu(), { clientX: 310, clientY: 160 });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "person" }), ["person"]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clicking the centre on the root level closes when closable", () => {
    const onOpenChange = vi.fn();
    render(<RadialMenu items={items} defaultOpen onOpenChange={onOpenChange} />);
    mockRect();
    fireEvent.click(menu(), { clientX: 160, clientY: 160 });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("with pointerTracking='element' clears the highlight when the pointer leaves", () => {
    render(<RadialMenu items={items} pointerTracking="element" />);
    mockRect();
    fireEvent.pointerMove(menu(), { clientX: 160, clientY: 20 });
    expect(highlightedLabel()).toBe("Vehicle");
    fireEvent.pointerLeave(menu());
    expect(menu()).not.toHaveAttribute("aria-activedescendant");
  });

  describe("customisation", () => {
    it("renderItem replaces the segment content inside the menuitem and gets the item state", () => {
      const renderItem = vi.fn((item: RadialMenuItem, state: RadialMenuItemState) => (
        <b data-testid={`custom-${item.id}`}>
          {item.label}
          {state.highlighted ? "!" : ""}
        </b>
      ));
      const { container } = render(<RadialMenu items={items} renderItem={renderItem} />);
      expect(container.querySelector('[data-slot="radial-menu-label"]')).toBeNull();
      const [vehicle] = screen.getAllByRole("menuitem");
      expect(vehicle).toContainElement(screen.getByTestId("custom-vehicle"));
      expect(renderItem).toHaveBeenCalledWith(expect.objectContaining({ id: "emotes" }), {
        highlighted: false,
        disabled: true,
        level: 0,
        index: 2,
        count: 4,
        hasSubmenu: false,
      });

      renderItem.mockClear();
      key("ArrowRight");
      expect(highlightedLabel()).toBe("Vehicle!");
      expect(renderItem).toHaveBeenCalledWith(expect.objectContaining({ id: "vehicle" }), {
        highlighted: true,
        disabled: false,
        level: 0,
        index: 0,
        count: 4,
        hasSubmenu: true,
      });

      key("Enter");
      expect(renderItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: "hood" }),
        expect.objectContaining({ level: 1, index: 3, count: 4, hasSubmenu: false }),
      );
      // aria-activedescendant still points at a menuitem.
      expect(document.getElementById(menu().getAttribute("aria-activedescendant")!)).toHaveAttribute("role", "menuitem");
    });

    it("renderCenter replaces the centre content and gets the centre state", () => {
      const renderCenter = vi.fn((state: RadialMenuCenterState) => (
        <span>{state.highlighted ? state.highlighted.label : `level ${state.level} ${state.action}`}</span>
      ));
      const { container } = render(
        <RadialMenu items={items} renderCenter={renderCenter} onOpenChange={() => {}} centerLabel="Interact" />,
      );
      const center = () => container.querySelector('[data-slot="radial-menu-center-content"]')!;
      expect(center().textContent).toBe("level 0 close");
      expect(renderCenter).toHaveBeenLastCalledWith({
        highlighted: null,
        level: 0,
        path: [],
        action: "close",
        centerActive: false,
      });
      key("ArrowRight");
      expect(center().textContent).toBe("Vehicle");
      key("Enter");
      expect(renderCenter).toHaveBeenLastCalledWith(
        expect.objectContaining({
          highlighted: expect.objectContaining({ id: "doors" }),
          level: 1,
          path: [expect.objectContaining({ id: "vehicle" })],
          action: "back",
        }),
      );
      expect(center().querySelector('[data-slot="radial-menu-center-label"]')).toBeNull();
    });

    it("merges classNames into every part (conflicting Tailwind classes win)", () => {
      const { container } = render(
        <RadialMenu
          items={items}
          className="custom"
          centerLabel="Interact"
          classNames={{
            root: "rounded-none",
            ring: "ring-part",
            segment: "fill-pui-background",
            segmentHighlight: "fill-pui-accent",
            item: "item-part",
            icon: "icon-part",
            label: "text-sm",
            center: "stroke-pui-primary",
            centerContent: "text-lg",
            centerLabel: "center-label-part",
          }}
        />,
      );
      const q = (slot: string) => container.querySelector(`[data-slot="${slot}"]`)!;
      expect(menu()).toHaveClass("rounded-none", "custom");
      expect(menu()).not.toHaveClass("rounded-full");
      expect(q("radial-menu-ring")).toHaveClass("ring-part", "absolute");
      expect(q("radial-menu-segment-shape")).toHaveClass("fill-pui-background", "stroke-pui-border");
      expect(q("radial-menu-segment-shape")).not.toHaveClass("fill-pui-card");
      expect(q("radial-menu-segment-highlight")).toHaveClass("fill-pui-accent");
      expect(q("radial-menu-segment-highlight")).not.toHaveClass("fill-pui-primary/tint");
      expect(q("radial-menu-item")).toHaveClass("item-part", "absolute");
      expect(q("radial-menu-label")).toHaveClass("text-sm");
      expect(q("radial-menu-label")).not.toHaveClass("text-xs");
      expect(q("radial-menu-center")).toHaveClass("stroke-pui-primary");
      expect(q("radial-menu-center")).not.toHaveClass("stroke-pui-border");
      expect(q("radial-menu-center-content")).toHaveClass("text-lg");
      expect(q("radial-menu-center-content")).not.toHaveClass("text-sm");
      expect(q("radial-menu-center-label")).toHaveClass("center-label-part");

      const { container: withIcon } = render(
        <RadialMenu items={[{ id: "a", label: "A", icon: <svg />, className: "own-item" }, { id: "b", label: "B" }]} classNames={{ icon: "icon-part" }} />,
      );
      expect(withIcon.querySelector('[data-slot="radial-menu-icon"]')).toHaveClass("icon-part");
      expect(withIcon.querySelector('[data-slot="radial-menu-item"]')).toHaveClass("own-item");
    });

    it("startAngle rotates the layout and the pointer mapping", () => {
      const { container, unmount } = render(<RadialMenu items={makeItems(4)} startAngle={45} />);
      mockRect();
      // Item 0 is centred at 45° (top right), item 1 at 135° (bottom right) …
      pointer(300, 20);
      expect(highlightedLabel()).toBe("Item 0");
      pointer(300, 300);
      expect(highlightedLabel()).toBe("Item 1");
      pointer(20, 300);
      expect(highlightedLabel()).toBe("Item 2");
      pointer(20, 20);
      expect(highlightedLabel()).toBe("Item 3");
      const first = container.querySelector<HTMLElement>('[data-slot="radial-menu-item"]')!;
      expect(parseFloat(first.style.left)).toBeGreaterThan(50);
      expect(parseFloat(first.style.top)).toBeLessThan(50);

      unmount();

      // -90°: item 0 at 9 o'clock, the top now belongs to item 1.
      render(<RadialMenu items={makeItems(4)} startAngle={-90} />);
      mockRect();
      pointer(10, 160);
      expect(highlightedLabel()).toBe("Item 0");
      pointer(160, 10);
      expect(highlightedLabel()).toBe("Item 1");
    });

    it("gap and outerPadding change the segment geometry", () => {
      const pathOf = (props: Partial<RadialMenuProps>) => {
        const { container, unmount } = render(<RadialMenu items={makeItems(4)} {...props} />);
        const d = container.querySelector('[data-slot="radial-menu-segment-shape"]')!.getAttribute("d");
        unmount();
        return d;
      };
      const base = pathOf({});
      expect(pathOf({ gap: 4, outerPadding: 1 })).toBe(base);
      expect(pathOf({ gap: 0 })).not.toBe(base);
      expect(pathOf({ outerPadding: 20 })).not.toBe(base);
      expect(pathOf({ gap: 12, outerPadding: 30 })).not.toMatch(/NaN/);
    });

    it("outerPadding shrinks the ring but keeps the centre hit zone in sync", () => {
      const onOpenChange = vi.fn();
      render(<RadialMenu items={items} outerPadding={40} innerRadius={0.5} onOpenChange={onOpenChange} />);
      mockRect();
      // outer = 120, inner = 60, centre radius = 56: 50px from the centre is still the centre.
      pointer(210, 160);
      expect(menu()).not.toHaveAttribute("aria-activedescendant");
      pointer(230, 160);
      expect(highlightedLabel()).toBe("Person");
    });

    it("tone sets data-tone and the highlight colour; description shows in the centre", () => {
      const toned: RadialMenuItem[] = [
        { id: "cuff", label: "Cuff" },
        { id: "arrest", label: "Arrest", tone: "destructive", description: "Takes the person into custody" },
        { id: "heal", label: "Heal", tone: "positive" },
      ];
      const { container } = render(<RadialMenu items={toned} />);
      const segments = container.querySelectorAll('[data-slot="radial-menu-segment"]');
      const menuItems = screen.getAllByRole("menuitem");
      expect(segments[0]).toHaveAttribute("data-tone", "default");
      expect(segments[1]).toHaveAttribute("data-tone", "destructive");
      expect(menuItems[1]).toHaveAttribute("data-tone", "destructive");
      expect(segments[1].querySelector('[data-slot="radial-menu-segment-highlight"]')).toHaveClass(
        "fill-pui-negative/tint",
        "stroke-pui-negative/tint-border",
      );
      expect(segments[2].querySelector('[data-slot="radial-menu-segment-highlight"]')).toHaveClass("fill-pui-positive/tint");
      expect(segments[0].querySelector('[data-slot="radial-menu-segment-highlight"]')).toHaveClass("fill-pui-primary/tint");
      expect(menuItems[1]).toHaveClass("data-[highlighted]:text-pui-negative");
      expect(menuItems[1]).toHaveAccessibleDescription("Takes the person into custody");

      key("ArrowRight");
      key("ArrowRight");
      expect(highlightedLabel()).toBe("Arrest");
      expect(menuItems[1].querySelector('[data-slot="radial-menu-label"]')).toHaveClass("text-pui-negative");
      const center = container.querySelector('[data-slot="radial-menu-center-content"]')!;
      expect(center.querySelector('[data-slot="radial-menu-center-label"]')).toHaveClass("text-pui-negative");
      expect(center.querySelector('[data-slot="radial-menu-center-description"]')!.textContent).toBe(
        "Takes the person into custody",
      );
    });
  });

  it("uses custom labels and renders nothing while closed", () => {
    const { rerender } = render(
      <RadialMenu items={items} open labels={{ menu: "Interaktion", back: "Zurück" }} onOpenChange={() => {}} />,
    );
    expect(menu()).toHaveAttribute("aria-label", "Interaktion");
    key("Home");
    key("Enter");
    key("Escape");
    key("Enter");
    expect(menu()).toHaveAttribute("aria-label", "Interaktion: Vehicle");
    rerender(<RadialMenu items={items} open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
