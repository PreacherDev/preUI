import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  moveSlotGridItems,
  SlotGrid,
  SlotGridGroup,
  SlotGridItem,
  type SlotGridDisplace,
  type SlotGridMoveEvent,
} from "./SlotGrid";

type Item = { id: string; grid: string; slot: number };

function Inventory({
  initial,
  onMove,
  displace,
  canDrop,
  trunkSlots = 4,
}: {
  initial: Item[];
  onMove?: (event: SlotGridMoveEvent) => void;
  displace?: SlotGridDisplace;
  canDrop?: (event: SlotGridMoveEvent) => boolean;
  trunkSlots?: number;
}) {
  const [items, setItems] = useState(initial);
  return (
    <SlotGridGroup
      displace={displace}
      canDrop={canDrop}
      onMove={(event) => {
        onMove?.(event);
        setItems((current) => moveSlotGridItems(current, event));
      }}
    >
      {[
        { id: "bag", label: "Backpack", columns: 3, slots: 6 },
        { id: "trunk", label: "Trunk", columns: 2, slots: trunkSlots },
      ].map((grid) => (
        <SlotGrid key={grid.id} id={grid.id} label={grid.label} columns={grid.columns} slots={grid.slots}>
          {items
            .filter((item) => item.grid === grid.id)
            .map((item) => (
              <SlotGridItem key={item.id} id={item.id} slot={item.slot}>
                {item.id}
              </SlotGridItem>
            ))}
        </SlotGrid>
      ))}
    </SlotGridGroup>
  );
}

const grid = (id: string) => document.querySelector<HTMLElement>(`[data-grid-id="${id}"]`)!;
const cell = (id: string, slot: number) => grid(id).querySelector<HTMLElement>(`[data-cell-index="${slot}"]`)!;
const item = (id: string) => document.querySelector<HTMLElement>(`[data-slot="slot-grid-item"][data-item-id="${id}"]`)!;

/** Lays the grids out: cells 50px apart, the trunk 1000px to the right (jsdom has no layout). */
function layout() {
  const rect = (x: number, y: number) =>
    ({ x, y, left: x, top: y, width: 48, height: 48, right: x + 48, bottom: y + 48, toJSON: () => ({}) }) as DOMRect;
  [
    ["bag", 3, 0],
    ["trunk", 2, 1000],
  ].forEach(([id, columns, left]) => {
    grid(id as string)
      .querySelectorAll<HTMLElement>('[data-slot="slot-grid-cell"]')
      .forEach((element) => {
        const slot = Number(element.dataset.cellIndex);
        element.getBoundingClientRect = () => rect((left as number) + (slot % (columns as number)) * 50, Math.floor(slot / (columns as number)) * 50);
      });
  });
}

function drag(source: HTMLElement, over: Element) {
  fireEvent.pointerDown(source, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
  document.elementFromPoint = vi.fn(() => over) as typeof document.elementFromPoint;
  act(() => {
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 20, clientY: 20 }));
  });
  act(() => {
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 40, clientY: 40 }));
  });
}
const release = () =>
  act(() => {
    window.dispatchEvent(new MouseEvent("pointerup", {}));
  });

afterEach(() => {
  document.querySelectorAll('[data-slot="slot-grid-drag-preview"]').forEach((element) => element.parentElement?.remove());
});

describe("SlotGrid", () => {
  it("renders fixed cells and places items in their slots", () => {
    render(<Inventory initial={[{ id: "water", grid: "bag", slot: 4 }]} />);
    expect(grid("bag")).toHaveAttribute("role", "group");
    expect(grid("bag")).toHaveAccessibleName("Backpack");
    expect(grid("bag").querySelectorAll('[data-slot="slot-grid-cell"]')).toHaveLength(6);
    // Slot 4 of 3 columns: column 2, row 2.
    expect(item("water").style.gridColumn).toBe("2");
    expect(item("water").style.gridRow).toBe("2");
    expect(item("water")).toHaveAttribute("aria-roledescription", "Movable item");
  });

  it("moves an item to a free slot", () => {
    const onMove = vi.fn();
    render(<Inventory initial={[{ id: "water", grid: "bag", slot: 0 }]} onMove={onMove} />);
    layout();
    drag(item("water"), cell("bag", 5));
    expect(cell("bag", 5)).toHaveAttribute("data-target", "pointer");
    expect(item("water")).toHaveAttribute("data-away");
    release();
    expect(onMove).toHaveBeenCalledWith({ itemId: "water", from: { gridId: "bag", slot: 0 }, to: { gridId: "bag", slot: 5 } });
    expect(item("water").style.gridColumn).toBe("3");
    expect(document.querySelector('[data-slot="slot-grid-drag-preview"]')).toBeNull();
  });

  it("pushes the item on a taken slot to the nearest free one, gliding while dragging", () => {
    const onMove = vi.fn();
    // bag: water 0, burger 1, apple 2; free: 3, 4, 5. Dropping water on burger (slot 1): water's old slot 0 is free
    // and nearest (50px), so the burger goes there.
    render(
      <Inventory
        initial={[
          { id: "water", grid: "bag", slot: 0 },
          { id: "burger", grid: "bag", slot: 1 },
          { id: "apple", grid: "bag", slot: 2 },
        ]}
        onMove={onMove}
      />,
    );
    layout();
    drag(item("water"), item("burger"));
    expect(item("burger")).toHaveAttribute("data-displaced");
    expect(item("burger").style.transform).toBe("translate3d(-50px, 0px, 0px)");
    release();
    expect(onMove).toHaveBeenCalledWith({
      itemId: "water",
      from: { gridId: "bag", slot: 0 },
      to: { gridId: "bag", slot: 1 },
      displaced: { itemId: "burger", from: { gridId: "bag", slot: 1 }, to: { gridId: "bag", slot: 0 } },
    });
  });

  it("from another grid: the nearest free slot of the target grid; swaps into the old slot when that grid is full", () => {
    const onMove = vi.fn();
    const { unmount } = render(
      <Inventory
        initial={[
          { id: "water", grid: "bag", slot: 0 },
          { id: "burger", grid: "trunk", slot: 0 },
        ]}
        onMove={onMove}
      />,
    );
    layout();
    drag(item("water"), item("burger"));
    release();
    // Trunk slot 1 (right of slot 0) is the nearest free one.
    expect(onMove).toHaveBeenLastCalledWith(
      expect.objectContaining({ displaced: { itemId: "burger", from: { gridId: "trunk", slot: 0 }, to: { gridId: "trunk", slot: 1 } } }),
    );
    unmount();

    // A full trunk (one slot): the burger swaps into the backpack slot the water left.
    render(
      <Inventory
        trunkSlots={1}
        initial={[
          { id: "water", grid: "bag", slot: 2 },
          { id: "burger", grid: "trunk", slot: 0 },
        ]}
        onMove={onMove}
      />,
    );
    layout();
    drag(item("water"), item("burger"));
    release();
    expect(onMove).toHaveBeenLastCalledWith(
      expect.objectContaining({ displaced: { itemId: "burger", from: { gridId: "trunk", slot: 0 }, to: { gridId: "bag", slot: 2 } } }),
    );
    expect(item("burger").closest('[data-slot="slot-grid"]')).toHaveAttribute("data-grid-id", "bag");
  });

  it("refuses a drop canDrop says no to, and a taken slot with displace='none'", () => {
    const onMove = vi.fn();
    const canDrop = vi.fn((move: SlotGridMoveEvent) => move.to.gridId !== "trunk");
    const { unmount } = render(<Inventory initial={[{ id: "water", grid: "bag", slot: 0 }]} onMove={onMove} canDrop={canDrop} />);
    layout();
    drag(item("water"), cell("trunk", 1));
    expect(cell("trunk", 1)).toHaveAttribute("data-target", "refused");
    release();
    expect(onMove).not.toHaveBeenCalled();
    expect(canDrop).toHaveBeenCalledWith({ itemId: "water", from: { gridId: "bag", slot: 0 }, to: { gridId: "trunk", slot: 1 } });
    unmount();

    render(
      <Inventory
        displace="none"
        initial={[
          { id: "water", grid: "bag", slot: 0 },
          { id: "burger", grid: "bag", slot: 1 },
        ]}
        onMove={onMove}
      />,
    );
    layout();
    drag(item("water"), item("burger"));
    expect(cell("bag", 1)).toHaveAttribute("data-target", "refused");
    release();
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getAllByRole("status").some((status) => status.textContent === "Move cancelled.")).toBe(true);
  });

  it("moves with the keyboard in two dimensions and on into the next grid", () => {
    const onMove = vi.fn();
    render(<Inventory initial={[{ id: "water", grid: "bag", slot: 1 }]} onMove={onMove} />);
    layout();
    const water = item("water");
    water.focus();
    fireEvent.keyDown(water, { key: "Enter" });
    expect(water).toHaveAttribute("data-dragging", "keyboard");
    fireEvent.keyDown(water, { key: "ArrowDown" }); // slot 4
    fireEvent.keyDown(water, { key: "ArrowRight" }); // slot 5
    expect(cell("bag", 5)).toHaveAttribute("data-target", "keyboard");
    // The item itself travels there (one column right, one row down).
    expect(water.style.transform).toBe("translate3d(50px, 50px, 0px)");
    fireEvent.keyDown(water, { key: "ArrowRight" }); // past the edge: trunk, same row → slot 2
    expect(cell("trunk", 2)).toHaveAttribute("data-target", "keyboard");
    fireEvent.keyDown(water, { key: " " });
    expect(onMove).toHaveBeenCalledWith({ itemId: "water", from: { gridId: "bag", slot: 1 }, to: { gridId: "trunk", slot: 2 } });
  });

  it("a single grid takes the settings itself; disabled items can't move", () => {
    const onMove = vi.fn();
    render(
      <SlotGrid columns={2} slots={4} label="Shelf" onMove={onMove}>
        <SlotGridItem id="a" slot={0} disabled>
          A
        </SlotGridItem>
      </SlotGrid>,
    );
    const a = item("a");
    fireEvent.keyDown(a, { key: "Enter" });
    expect(a).not.toHaveAttribute("data-dragging");
    expect(a).not.toHaveClass("cursor-grab");
    expect(screen.getByRole("group", { name: "Shelf" })).not.toHaveAttribute("onmove");
  });

  it("requires a SlotGrid around its items", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<SlotGridItem id="x" slot={0} />)).toThrow(/within <SlotGrid/);
    vi.mocked(console.error).mockRestore();
  });
});

describe("moveSlotGridItems", () => {
  it("moves the item and the displaced one without mutating the list", () => {
    const items: Item[] = [
      { id: "water", grid: "bag", slot: 0 },
      { id: "burger", grid: "trunk", slot: 0 },
    ];
    const next = moveSlotGridItems(items, {
      itemId: "water",
      from: { gridId: "bag", slot: 0 },
      to: { gridId: "trunk", slot: 0 },
      displaced: { itemId: "burger", from: { gridId: "trunk", slot: 0 }, to: { gridId: "bag", slot: 0 } },
    });
    expect(next).toEqual([
      { id: "water", grid: "trunk", slot: 0 },
      { id: "burger", grid: "bag", slot: 0 },
    ]);
    expect(items[0].grid).toBe("bag");
  });
});
