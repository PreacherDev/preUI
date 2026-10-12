import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SortableItem, SortableItemHandle, SortableList, moveItem, type SortableListProps } from "./Sortable";

type Item = { id: string; title: string };

const initial: Item[] = [
  { id: "a", title: "Sportwagen" },
  { id: "b", title: "Motorräder" },
  { id: "c", title: "Geländewagen" },
  { id: "d", title: "Transporter" },
];

function List({
  onMove,
  handle = true,
  disabledItem,
  readOnly,
  onItemClick,
  ...props
}: Partial<SortableListProps> & {
  handle?: boolean;
  disabledItem?: string;
  readOnly?: boolean;
  onItemClick?: (id: string) => void;
}) {
  const [items, setItems] = useState(initial);
  return (
    <SortableList
      data-testid="list"
      aria-label="Kategorien"
      onMove={
        readOnly
          ? undefined
          : (from, to) => {
              onMove?.(from, to);
              setItems((current) => moveItem(current, from, to));
            }
      }
      {...props}
    >
      {items.map((item) => (
        <SortableItem key={item.id} id={item.id} disabled={item.id === disabledItem} onClick={() => onItemClick?.(item.id)}>
          {handle && <SortableItemHandle />}
          <span>{item.title}</span>
          <input aria-label={`Name ${item.id}`} defaultValue={item.title} />
        </SortableItem>
      ))}
    </SortableList>
  );
}

const list = () => screen.getByTestId("list");
const items = () => Array.from(list().querySelectorAll<HTMLElement>('[data-slot="sortable-item"]'));
const item = (id: string) => list().querySelector<HTMLElement>(`[data-sortable-id="${id}"]`)!;
const handleOf = (id: string) => item(id).querySelector<HTMLElement>('[data-slot="sortable-item-handle"]')!;
const order = () => items().map((el) => el.dataset.sortableId).join("");
const status = () => screen.getByRole("status");

/** Lays the list out: items 40px tall with 8px gaps from the list's top (jsdom has no layout). */
function layout(listTop = 0) {
  const rect = (top: number, height: number) =>
    ({ x: 0, y: top, left: 0, top, width: 300, height, right: 300, bottom: top + height, toJSON: () => ({}) }) as DOMRect;
  list().getBoundingClientRect = () => rect(listTop, 4 * 48 - 8);
  items().forEach((el, index) => {
    el.getBoundingClientRect = () => rect(listTop + index * 48, 40);
  });
}

function press(target: HTMLElement, y: number) {
  fireEvent.pointerDown(target, { button: 0, clientX: 10, clientY: y, pointerId: 1 });
}

function moveTo(y: number) {
  act(() => {
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: y }));
  });
}

const release = () =>
  act(() => {
    window.dispatchEvent(new MouseEvent("pointerup", {}));
  });

const preview = () => document.querySelector<HTMLElement>('[data-slot="sortable-drag-preview"]');

afterEach(() => {
  document.querySelectorAll('[data-slot="sortable-drag-preview"]').forEach((el) => el.parentElement?.remove());
});

describe("moveItem", () => {
  it("moves an item to its new index without mutating the input", () => {
    const input = ["a", "b", "c", "d"];
    expect(moveItem(input, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(input, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(input, 1, 1)).toEqual(input);
    expect(moveItem(input, 5, 0)).toEqual(input);
    expect(moveItem(input, 0, -1)).toEqual(input);
    expect(input).toEqual(["a", "b", "c", "d"]);
  });
});

describe("SortableList", () => {
  it("renders a list with items, handles and slots", () => {
    render(<List />);
    expect(screen.getByRole("list", { name: "Kategorien" })).toHaveAttribute("data-slot", "sortable-list");
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    const handle = handleOf("a");
    expect(handle).toHaveAccessibleName("Drag to reorder");
    expect(handle).toHaveAttribute("aria-pressed", "false");
    expect(handle).toHaveAccessibleDescription(/Press Space or Enter to pick the item up/);
    // With a handle the item itself is no tab stop.
    expect(item("a")).not.toHaveAttribute("tabindex");
    expect(list()).toHaveClass("flex", "flex-col", "gap-2");
  });

  it("merges classNames", () => {
    render(
      <SortableList className="custom-list">
        <SortableItem id="x" className="custom-item">
          X
        </SortableItem>
      </SortableList>,
    );
    expect(screen.getByRole("list")).toHaveClass("custom-list", "flex");
    expect(screen.getByRole("listitem")).toHaveClass("custom-item", "rounded-pui-md");
  });

  it("moves an item with the pointer: the others slide live, a see-through copy follows, the drop reports from/to", () => {
    const onMove = vi.fn();
    render(<List onMove={onMove} />);
    layout();
    press(handleOf("a"), 20);
    moveTo(22); // below the threshold: still a click
    expect(preview()).toBeNull();
    moveTo(30);
    expect(preview()).not.toBeNull();
    expect(preview()!.parentElement!.style.opacity).toBe("var(--pui-drag-preview-opacity, 0.6)");
    expect(item("a")).toHaveAttribute("data-dragging", "pointer");
    expect(status()).toHaveTextContent("Picked up, position 1 of 4.");
    expect(document.body.style.cursor).toBe("grabbing");

    // Middle of the dragged item passes the middle of b (68) but not of c (116): slot 1.
    moveTo(110);
    expect(item("b").style.transform).toBe("translate3d(0px, -48px, 0px)");
    expect(item("a").style.transform).toBe("translate3d(0px, 48px, 0px)");
    expect(item("c").style.transform).toBe("");
    expect(item("b")).toHaveClass("transition-transform");
    expect(preview()!.parentElement!.style.transform).toBe("translate(0px, 90px)");

    // Further down: slot 3, everything below a slides up.
    moveTo(200);
    expect(item("b").style.transform).toBe("translate3d(0px, -48px, 0px)");
    expect(item("d").style.transform).toBe("translate3d(0px, -48px, 0px)");
    expect(item("a").style.transform).toBe("translate3d(0px, 144px, 0px)");

    release();
    expect(onMove).toHaveBeenCalledWith(0, 3);
    expect(order()).toBe("bcda");
    expect(preview()).toBeNull();
    expect(item("a").style.transform).toBe("");
    expect(item("a")).not.toHaveAttribute("data-dragging");
    // The drop frame renders without transition, so nothing slides back.
    expect(item("b")).not.toHaveClass("transition-transform");
    expect(status()).toHaveTextContent("Dropped at position 4 of 4.");
    expect(document.body.style.cursor).toBe("");
  });

  it("keeps the order when dropped where it started and cancels with Escape", () => {
    const onMove = vi.fn();
    render(<List onMove={onMove} />);
    layout();
    press(handleOf("b"), 68);
    moveTo(80);
    release();
    expect(onMove).not.toHaveBeenCalled();

    press(handleOf("b"), 68);
    moveTo(200);
    expect(item("c").style.transform).not.toBe("");
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => {
      window.dispatchEvent(escape);
    });
    expect(escape.defaultPrevented).toBe(true);
    expect(onMove).not.toHaveBeenCalled();
    expect(preview()).toBeNull();
    expect(item("c").style.transform).toBe("");
    expect(status()).toHaveTextContent("Move cancelled.");
    expect(order()).toBe("abcd");
  });

  it("follows the list when it scrolls during the drag", () => {
    const onMove = vi.fn();
    render(<List onMove={onMove} />);
    layout();
    press(handleOf("a"), 20);
    moveTo(30);
    // The list scrolled up by 96px under a still pointer: the item is now over c / d.
    layout(-96);
    moveTo(30);
    expect(item("a").style.transform).toBe("translate3d(0px, 96px, 0px)");
    release();
    expect(onMove).toHaveBeenCalledWith(0, 2);
  });

  it("does not fire the item's click after a drag, but does for a plain click", async () => {
    const user = userEvent.setup();
    const onItemClick = vi.fn();
    render(<List onItemClick={onItemClick} />);
    layout();
    press(handleOf("a"), 20);
    moveTo(110);
    release();
    // The browser sends the click that ends the drag to the dragged item (or a common ancestor).
    fireEvent.click(item("a"));
    expect(onItemClick).not.toHaveBeenCalled();
    await user.click(screen.getByText("Motorräder"));
    expect(onItemClick).toHaveBeenCalledWith("b");
  });

  it("only starts drags from the handle when there is one", () => {
    const onMove = vi.fn();
    render(<List onMove={onMove} />);
    layout();
    press(screen.getByText("Sportwagen"), 20);
    moveTo(200);
    release();
    expect(onMove).not.toHaveBeenCalled();
    expect(order()).toBe("abcd");
  });

  it("moves with the keyboard: Space lifts, arrows move (announced), Space drops and keeps the focus", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<List onMove={onMove} />);
    layout();
    handleOf("a").focus();
    await user.keyboard(" ");
    expect(item("a")).toHaveAttribute("data-dragging", "keyboard");
    expect(handleOf("a")).toHaveAttribute("aria-pressed", "true");
    expect(status()).toHaveTextContent("Picked up, position 1 of 4.");

    await user.keyboard("{ArrowDown}");
    expect(status()).toHaveTextContent("Position 2 of 4.");
    expect(item("a").style.transform).toBe("translate3d(0px, 48px, 0px)");
    expect(item("b").style.transform).toBe("translate3d(0px, -48px, 0px)");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(status()).toHaveTextContent("Position 4 of 4.");
    await user.keyboard("{Home}");
    expect(status()).toHaveTextContent("Position 1 of 4.");
    await user.keyboard("{End}{ArrowUp}");
    expect(status()).toHaveTextContent("Position 3 of 4.");

    await user.keyboard(" ");
    expect(onMove).toHaveBeenCalledWith(0, 2);
    expect(order()).toBe("bcad");
    expect(status()).toHaveTextContent("Dropped at position 3 of 4.");
    expect(handleOf("a")).toHaveFocus();
    expect(item("a")).not.toHaveAttribute("data-dragging");
  });

  it("cancels a keyboard move with Escape (without reaching a surrounding handler) and on blur", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    const outer = vi.fn();
    render(
      <div onKeyDown={(event) => event.key === "Escape" && outer()}>
        <List onMove={onMove} />
      </div>,
    );
    layout();
    handleOf("b").focus();
    await user.keyboard("{Enter}{ArrowDown}");
    await user.keyboard("{Escape}");
    expect(outer).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(status()).toHaveTextContent("Move cancelled.");
    expect(item("c").style.transform).toBe("");

    await user.keyboard("{Enter}{ArrowDown}");
    expect(item("b")).toHaveAttribute("data-dragging", "keyboard");
    await user.tab();
    expect(item("b")).not.toHaveAttribute("data-dragging");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("makes the whole item the handle without a SortableItemHandle, but not its inputs", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<List onMove={onMove} handle={false} />);
    layout();
    expect(item("a")).toHaveAttribute("tabindex", "0");
    expect(item("a")).toHaveAttribute("aria-roledescription", "Sortable item");
    expect(item("a")).toHaveClass("cursor-grab");

    press(screen.getByRole("textbox", { name: "Name a" }), 20);
    moveTo(200);
    release();
    expect(onMove).not.toHaveBeenCalled();

    press(screen.getByText("Sportwagen"), 20);
    moveTo(110);
    release();
    expect(onMove).toHaveBeenCalledWith(0, 1);

    // Typing a space in an input does not lift the item.
    await user.type(screen.getByRole("textbox", { name: "Name c" }), " ");
    expect(item("c")).not.toHaveAttribute("data-dragging");

    item("c").focus();
    await user.keyboard("{Enter}{ArrowUp}{Enter}");
    expect(onMove).toHaveBeenLastCalledWith(2, 1);
    expect(item("c")).toHaveFocus();
  });

  it("does not move disabled items or anything in a read-only / disabled list", () => {
    const onMove = vi.fn();
    const { unmount } = render(<List onMove={onMove} disabledItem="b" />);
    layout();
    expect(handleOf("b")).toBeDisabled();
    expect(item("b")).toHaveAttribute("data-disabled");
    press(handleOf("b"), 68);
    moveTo(200);
    release();
    expect(onMove).not.toHaveBeenCalled();
    // Others still move past it.
    press(handleOf("a"), 20);
    moveTo(110);
    release();
    expect(onMove).toHaveBeenCalledWith(0, 1);
    unmount();

    render(<List readOnly />);
    expect(handleOf("a")).toBeDisabled();
    expect(handleOf("a")).not.toHaveAttribute("aria-describedby");
  });

  it("disables every handle with `disabled` and uses custom labels", () => {
    const { rerender } = render(<List disabled />);
    expect(handleOf("a")).toBeDisabled();
    rerender(<List labels={{ handle: "Zum Sortieren ziehen", pickedUp: (p, t) => `Aufgenommen, ${p} von ${t}.` }} />);
    expect(handleOf("a")).toHaveAccessibleName("Zum Sortieren ziehen");
    layout();
    press(handleOf("a"), 20);
    moveTo(40);
    expect(status()).toHaveTextContent("Aufgenommen, 1 von 4.");
    release();
  });

  it("removes the drag copy on unmount", () => {
    const { unmount } = render(<List />);
    layout();
    press(handleOf("a"), 20);
    moveTo(60);
    expect(preview()).not.toBeNull();
    unmount();
    expect(preview()).toBeNull();
  });
});
