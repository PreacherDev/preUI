import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import {
  Kanban,
  KanbanCard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHeader,
  KanbanColumnTitle,
  moveKanbanItem,
  type KanbanMoveEvent,
} from "./Kanban";

type Item = { id: string; title: string };

const initial: Record<string, Item[]> = {
  todo: [
    { id: "a", title: "Anfrage prüfen" },
    { id: "b", title: "Ware bestellen" },
  ],
  doing: [{ id: "c", title: "Lieferung fahren" }],
  done: [],
};

function Board({
  onMove,
  disabledColumn,
  readOnly,
}: {
  onMove?: (event: KanbanMoveEvent) => void;
  disabledColumn?: string;
  readOnly?: boolean;
}) {
  const [board, setBoard] = useState(initial);
  return (
    <Kanban
      data-testid="board"
      onCardMove={
        readOnly
          ? undefined
          : (event) => {
              onMove?.(event);
              setBoard((current) => moveKanbanItem(current, event));
            }
      }
    >
      {Object.entries(board).map(([columnId, items]) => (
        <KanbanColumn key={columnId} id={columnId} label={columnId} disabled={columnId === disabledColumn}>
          <KanbanColumnHeader>
            <KanbanColumnTitle>{columnId}</KanbanColumnTitle>
          </KanbanColumnHeader>
          <KanbanColumnContent empty="Leer" data-testid={`content-${columnId}`}>
            {items.map((item) => (
              <KanbanCard key={item.id} id={item.id}>
                {item.title}
              </KanbanCard>
            ))}
          </KanbanColumnContent>
        </KanbanColumn>
      ))}
    </Kanban>
  );
}

const card = (text: string) => screen.getByText(text).closest<HTMLElement>('[data-slot="kanban-card"]')!;
const column = (id: string) => document.querySelector<HTMLElement>(`[data-column-id="${id}"]`)!;
const titles = (id: string) =>
  Array.from(column(id).querySelectorAll('[data-slot="kanban-card"]')).map((el) => el.textContent);

/** Lays the board out: columns 300px apart, cards 60px tall with 8px gaps (jsdom has no layout). */
function layout() {
  const rect = (x: number, y: number, width: number, height: number) =>
    ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height, toJSON: () => ({}) }) as DOMRect;
  ["todo", "doing", "done"].forEach((id, columnIndex) => {
    const col = column(id);
    const left = columnIndex * 300;
    col.getBoundingClientRect = () => rect(left, 0, 288, 600);
    const content = col.querySelector<HTMLElement>('[data-slot="kanban-column-content"]')!;
    content.getBoundingClientRect = () => rect(left, 44, 288, 556);
    col.querySelectorAll<HTMLElement>('[data-slot="kanban-card"]').forEach((el, index) => {
      el.getBoundingClientRect = () => rect(left + 8, 52 + index * 68, 272, 60);
    });
  });
}

function pointAt(target: Element | null) {
  document.elementFromPoint = vi.fn(() => target) as typeof document.elementFromPoint;
}

function drag(from: HTMLElement, to: { x: number; y: number; over: Element | null }) {
  fireEvent.pointerDown(from, { button: 0, clientX: 20, clientY: 70, pointerId: 1 });
  pointAt(to.over);
  act(() => {
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: 30, clientY: 80 }));
  });
  act(() => {
    window.dispatchEvent(new MouseEvent("pointermove", { clientX: to.x, clientY: to.y }));
  });
}

const release = () =>
  act(() => {
    window.dispatchEvent(new MouseEvent("pointerup", {}));
  });

afterEach(() => {
  document.querySelectorAll('[data-slot="kanban-drag-preview"]').forEach((el) => el.parentElement?.remove());
});

describe("Kanban", () => {
  it("renders columns, headers, cards and the empty state", () => {
    render(<Board />);
    expect(screen.getByTestId("board")).toHaveAttribute("data-slot", "kanban");
    expect(screen.getByRole("group", { name: "todo" })).toHaveAttribute("data-slot", "kanban-column");
    expect(card("Anfrage prüfen")).toHaveAttribute("data-card-id", "a");
    expect(card("Anfrage prüfen")).toHaveAttribute("aria-roledescription", "Draggable card");
    expect(card("Anfrage prüfen")).toHaveAttribute("tabindex", "0");
    expect(screen.getByText("Leer")).toHaveAttribute("data-slot", "kanban-column-empty");
    expect(screen.getByText("todo")).toHaveAttribute("data-slot", "kanban-column-title");
  });

  it("is read-only without onCardMove", () => {
    render(<Board readOnly />);
    const first = card("Anfrage prüfen");
    expect(first).not.toHaveAttribute("aria-roledescription");
    expect(first).not.toHaveClass("cursor-grab");
    fireEvent.keyDown(first, { key: " " });
    expect(first).not.toHaveAttribute("data-dragging");
  });

  it("moves a card to another column with the pointer, showing preview and drop line", () => {
    const onMove = vi.fn();
    render(<Board onMove={onMove} />);
    layout();
    const source = card("Anfrage prüfen");
    // Over "doing", below its only card → index 1.
    drag(source, { x: 320, y: 200, over: column("doing") });
    expect(source).toHaveAttribute("data-dragging");
    expect(document.querySelector('[data-slot="kanban-drag-preview"]')).not.toBeNull();
    expect(column("doing")).toHaveAttribute("data-drop-target");
    expect(column("doing").querySelector('[data-slot="kanban-drop-indicator"]')).not.toBeNull();
    release();
    expect(onMove).toHaveBeenCalledWith({
      cardId: "a",
      from: { columnId: "todo", index: 0 },
      to: { columnId: "doing", index: 1 },
    });
    expect(titles("doing")).toEqual(["Lieferung fahren", "Anfrage prüfen"]);
    expect(titles("todo")).toEqual(["Ware bestellen"]);
    expect(document.querySelector('[data-slot="kanban-drag-preview"]')).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Dropped in doing, position 2.");
  });

  it("reorders inside a column and ignores drops at the same place", () => {
    const onMove = vi.fn();
    render(<Board onMove={onMove} />);
    layout();
    // "a" below "b" (b's middle is at 52 + 68 + 30 = 150 in the original layout).
    drag(card("Anfrage prüfen"), { x: 20, y: 190, over: column("todo") });
    release();
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ to: { columnId: "todo", index: 1 } }));
    expect(titles("todo")).toEqual(["Ware bestellen", "Anfrage prüfen"]);
    layout();
    // Dropped where it already is: no event.
    onMove.mockClear();
    drag(card("Ware bestellen"), { x: 20, y: 60, over: column("todo") });
    release();
    expect(onMove).not.toHaveBeenCalled();
  });

  it("cancels on Escape, outside every column and on disabled columns", () => {
    const onMove = vi.fn();
    render(<Board onMove={onMove} disabledColumn="done" />);
    layout();
    drag(card("Anfrage prüfen"), { x: 320, y: 200, over: column("doing") });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(card("Anfrage prüfen")).not.toHaveAttribute("data-dragging");
    release();
    drag(card("Anfrage prüfen"), { x: 2000, y: 200, over: document.body });
    release();
    drag(card("Anfrage prüfen"), { x: 620, y: 100, over: column("done") });
    expect(column("done")).not.toHaveAttribute("data-drop-target");
    release();
    expect(onMove).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Move cancelled.");
  });

  it("does not start a drag below the threshold and keeps clicks working", () => {
    const onClick = vi.fn();
    render(
      <Kanban onCardMove={() => {}}>
        <KanbanColumn id="todo">
          <KanbanColumnContent>
            <KanbanCard id="a" onClick={onClick}>
              A
            </KanbanCard>
          </KanbanColumnContent>
        </KanbanColumn>
      </Kanban>,
    );
    const a = card("A");
    fireEvent.pointerDown(a, { button: 0, clientX: 10, clientY: 10 });
    act(() => {
      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 12, clientY: 11 }));
    });
    expect(a).not.toHaveAttribute("data-dragging");
    release();
    fireEvent.click(a);
    expect(onClick).toHaveBeenCalledTimes(1);
    // The click that ends a real drag of the card is swallowed — once.
    pointAt(null);
    fireEvent.pointerDown(a, { button: 0, clientX: 10, clientY: 10 });
    act(() => {
      window.dispatchEvent(new MouseEvent("pointermove", { clientX: 60, clientY: 60 }));
    });
    release();
    fireEvent.click(a);
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.click(a);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("moves with the keyboard across columns, skipping disabled ones", () => {
    const onMove = vi.fn();
    render(<Board onMove={onMove} disabledColumn="doing" />);
    layout();
    const b = card("Ware bestellen");
    b.focus();
    fireEvent.keyDown(b, { key: "Enter" });
    expect(b).toHaveAttribute("data-dragging");
    expect(b).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Picked up from todo, position 2.");
    fireEvent.keyDown(b, { key: "ArrowUp" });
    expect(screen.getByRole("status")).toHaveTextContent("todo, position 1.");
    fireEvent.keyDown(b, { key: "ArrowRight" }); // "doing" is disabled → "done"
    expect(column("done")).toHaveAttribute("data-drop-target");
    fireEvent.keyDown(b, { key: "ArrowRight" }); // no further column: stays
    fireEvent.keyDown(b, { key: " " });
    expect(onMove).toHaveBeenCalledWith({
      cardId: "b",
      from: { columnId: "todo", index: 1 },
      to: { columnId: "done", index: 0 },
    });
    expect(titles("done")).toEqual(["Ware bestellen"]);
  });

  it("cancels a keyboard move with Escape or when the card loses focus", () => {
    const onMove = vi.fn();
    render(<Board onMove={onMove} />);
    layout();
    const a = card("Anfrage prüfen");
    fireEvent.keyDown(a, { key: " " });
    fireEvent.keyDown(a, { key: "ArrowDown" });
    fireEvent.keyDown(a, { key: "Escape" });
    expect(a).not.toHaveAttribute("data-dragging");
    fireEvent.keyDown(a, { key: " " });
    fireEvent.blur(a);
    expect(a).not.toHaveAttribute("data-dragging");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("does not move disabled cards and merges classNames", () => {
    const onMove = vi.fn();
    render(
      <Kanban onCardMove={onMove} className="gap-6" data-testid="board">
        <KanbanColumn id="todo" className="w-80" data-testid="col">
          <KanbanColumnContent>
            <KanbanCard id="a" disabled className="bg-pui-card">
              A
            </KanbanCard>
          </KanbanColumnContent>
        </KanbanColumn>
      </Kanban>,
    );
    const a = card("A");
    fireEvent.keyDown(a, { key: "Enter" });
    expect(a).not.toHaveAttribute("data-dragging");
    expect(a).toHaveClass("bg-pui-card");
    expect(a).not.toHaveClass("bg-pui-background");
    expect(screen.getByTestId("board")).toHaveClass("gap-6");
    expect(screen.getByTestId("col")).toHaveClass("w-80");
    expect(screen.getByTestId("col")).not.toHaveClass("w-72");
  });

  it("requires a Kanban around its parts", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<KanbanCard id="x">X</KanbanCard>)).toThrow(/within <Kanban/);
    vi.mocked(console.error).mockRestore();
  });
});

describe("moveKanbanItem", () => {
  it("moves between columns and inside a column without mutating the input", () => {
    const moved = moveKanbanItem(initial, { cardId: "a", from: { columnId: "todo", index: 0 }, to: { columnId: "done", index: 0 } });
    expect(moved.todo.map((i) => i.id)).toEqual(["b"]);
    expect(moved.done.map((i) => i.id)).toEqual(["a"]);
    expect(initial.todo).toHaveLength(2);
    const reordered = moveKanbanItem(initial, { cardId: "a", from: { columnId: "todo", index: 0 }, to: { columnId: "todo", index: 1 } });
    expect(reordered.todo.map((i) => i.id)).toEqual(["b", "a"]);
    expect(moveKanbanItem(initial, { cardId: "zz", from: { columnId: "todo", index: 0 }, to: { columnId: "done", index: 0 } })).toBe(initial);
  });
});
