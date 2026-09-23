import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { vi } from "vitest";
import { useListNavigation, type UseListNavigationOptions } from "./use-list-navigation";

const fruits = ["Apfel", "Birne", "Kirsche", "Banane", "Dattel"];

function List({
  labels = fruits,
  disabled = [] as number[],
  ...options
}: Partial<UseListNavigationOptions> & { labels?: string[]; disabled?: number[] }) {
  const nav = useListNavigation({
    count: labels.length,
    isDisabled: (index) => disabled.includes(index),
    ...options,
  });
  return (
    <div {...nav.getListProps({ "aria-label": "Obst" })}>
      {labels.map((label, index) => (
        <div key={label} {...nav.getItemProps(index)}>
          {label}
        </div>
      ))}
    </div>
  );
}

const highlighted = () => screen.getAllByRole("option").find((option) => option.hasAttribute("data-highlighted"));

describe("useListNavigation", () => {
  let scrollIntoView: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as Element["scrollIntoView"];
  });

  it("sets listbox ARIA and aria-activedescendant", () => {
    render(<List />);
    const list = screen.getByRole("listbox", { name: "Obst" });
    expect(list).toHaveAttribute("tabindex", "0");
    expect(list).toHaveAttribute("aria-orientation", "vertical");
    const first = screen.getByRole("option", { name: "Apfel" });
    expect(list).toHaveAttribute("aria-activedescendant", first.id);
    expect(first).toHaveAttribute("data-highlighted");
    expect(first).not.toHaveAttribute("tabindex");
  });

  it("moves with arrows, Home/End, PageUp/PageDown and wraps", async () => {
    const user = userEvent.setup();
    render(<List pageSize={2} />);
    screen.getByRole("listbox").focus();
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Birne");
    await user.keyboard("{End}");
    expect(highlighted()).toHaveTextContent("Dattel");
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Apfel");
    await user.keyboard("{ArrowUp}");
    expect(highlighted()).toHaveTextContent("Dattel");
    await user.keyboard("{Home}");
    expect(highlighted()).toHaveTextContent("Apfel");
    await user.keyboard("{PageDown}");
    expect(highlighted()).toHaveTextContent("Kirsche");
    await user.keyboard("{PageDown}{PageDown}");
    expect(highlighted()).toHaveTextContent("Dattel");
    await user.keyboard("{PageUp}");
    expect(highlighted()).toHaveTextContent("Kirsche");
  });

  it("stops at the ends with loop={false}", async () => {
    const user = userEvent.setup();
    render(<List loop={false} />);
    screen.getByRole("listbox").focus();
    await user.keyboard("{ArrowUp}");
    expect(highlighted()).toHaveTextContent("Apfel");
    await user.keyboard("{End}{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Dattel");
  });

  it("skips disabled items, or keeps them reachable with skipDisabled={false}", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { unmount } = render(<List disabled={[0, 2]} onSelect={onSelect} />);
    expect(highlighted()).toHaveTextContent("Birne"); // first enabled
    expect(screen.getByRole("option", { name: "Apfel" })).toHaveAttribute("aria-disabled", "true");
    screen.getByRole("listbox").focus();
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Banane");
    await user.keyboard("{Home}");
    expect(highlighted()).toHaveTextContent("Birne");
    await user.keyboard("{ArrowUp}");
    expect(highlighted()).toHaveTextContent("Dattel");
    unmount();

    render(<List disabled={[0, 2]} skipDisabled={false} onSelect={onSelect} />);
    expect(highlighted()).toHaveTextContent("Apfel");
    screen.getByRole("listbox").focus();
    await user.keyboard("{Enter}");
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Kirsche");
  });

  it("selects with Enter/Space and click, goes back with Backspace/ArrowLeft, closes with Escape", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onBack = vi.fn();
    const onClose = vi.fn();
    render(<List onSelect={onSelect} onBack={onBack} onClose={onClose} disabled={[4]} />);
    screen.getByRole("listbox").focus();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith(1);
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
    await user.keyboard("{Backspace}{ArrowLeft}");
    expect(onBack).toHaveBeenCalledTimes(2);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("option", { name: "Kirsche" }));
    expect(onSelect).toHaveBeenLastCalledWith(2);
    expect(highlighted()).toHaveTextContent("Kirsche");
    await user.click(screen.getByRole("option", { name: "Dattel" }));
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it("leaves keys it has no callback for alone", () => {
    render(<List />);
    const list = screen.getByRole("listbox");
    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    list.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    const backspace = new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true });
    list.dispatchEvent(backspace);
    expect(backspace.defaultPrevented).toBe(false);
  });

  it("uses custom keys", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const onClose = vi.fn();
    render(<List onBack={onBack} onClose={onClose} keys={{ back: ["q"], close: ["x"] }} />);
    screen.getByRole("listbox").focus();
    await user.keyboard("{Backspace}{Escape}");
    expect(onBack).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await user.keyboard("qx");
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("highlights on pointer move (not on enter) and ignores disabled items when skipping", () => {
    render(<List disabled={[3]} />);
    const kirsche = screen.getByRole("option", { name: "Kirsche" });
    fireEvent.pointerEnter(kirsche);
    expect(highlighted()).toHaveTextContent("Apfel");
    fireEvent.pointerMove(kirsche);
    expect(highlighted()).toHaveTextContent("Kirsche");
    fireEvent.pointerMove(screen.getByRole("option", { name: "Banane" }));
    expect(highlighted()).toHaveTextContent("Kirsche");
  });

  it("scrolls the item into view on keyboard moves, not on hover", async () => {
    const user = userEvent.setup();
    render(<List />);
    scrollIntoView.mockClear();
    screen.getByRole("listbox").focus();
    await user.keyboard("{ArrowDown}");
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
    expect(scrollIntoView.mock.instances[0]).toBe(screen.getByRole("option", { name: "Birne" }));
    fireEvent.pointerMove(screen.getByRole("option", { name: "Dattel" }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("can turn scrolling off", async () => {
    const user = userEvent.setup();
    render(<List scrollIntoView={false} />);
    scrollIntoView.mockClear();
    screen.getByRole("listbox").focus();
    await user.keyboard("{ArrowDown}");
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("listens on window with keyboardTarget='window' while enabled, ignoring inputs", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    function Menu({ enabled }: { enabled: boolean }) {
      return (
        <>
          <input aria-label="Name" />
          <List keyboardTarget="window" enabled={enabled} onSelect={onSelect} />
        </>
      );
    }
    const { rerender } = render(<Menu enabled />);
    expect(document.activeElement).toBe(document.body);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(highlighted()).toHaveTextContent("Kirsche");
    expect(onSelect).toHaveBeenCalledWith(2);

    await user.click(screen.getByRole("textbox", { name: "Name" }));
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Kirsche");
    (document.activeElement as HTMLElement).blur();

    rerender(<Menu enabled={false} />);
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Kirsche");
    rerender(<Menu enabled />);
    await user.keyboard("{ArrowUp}");
    expect(highlighted()).toHaveTextContent("Birne");
  });

  it("supports roving tabindex and moves focus", async () => {
    const user = userEvent.setup();
    render(<List focusMode="roving" />);
    const list = screen.getByRole("listbox");
    expect(list).not.toHaveAttribute("aria-activedescendant");
    const [apfel, birne] = screen.getAllByRole("option");
    expect(apfel).toHaveAttribute("tabindex", "0");
    expect(birne).toHaveAttribute("tabindex", "-1");
    apfel.focus();
    await user.keyboard("{ArrowDown}");
    expect(birne).toHaveAttribute("tabindex", "0");
    expect(document.activeElement).toBe(birne);
  });

  it("does not select twice when a native button gets Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    function Buttons() {
      const nav = useListNavigation({ count: 2, focusMode: "roving", onSelect, role: "menu" });
      return (
        <div {...nav.getListProps()}>
          {["Eins", "Zwei"].map((label, index) => (
            <button key={label} type="button" {...nav.getItemProps(index)}>
              {label}
            </button>
          ))}
        </div>
      );
    }
    render(<Buttons />);
    screen.getByRole("menuitem", { name: "Eins" }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("supports typeahead", async () => {
    const user = userEvent.setup();
    render(<List typeahead={(index) => fruits[index]} disabled={[1]} />);
    screen.getByRole("listbox").focus();
    await user.keyboard("k");
    expect(highlighted()).toHaveTextContent("Kirsche");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await user.keyboard("b"); // Birne is disabled
    expect(highlighted()).toHaveTextContent("Banane");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await user.keyboard("da");
    expect(highlighted()).toHaveTextContent("Dattel");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await user.keyboard("bb"); // a repeated letter cycles through the matches (Banane is the only enabled one)
    expect(highlighted()).toHaveTextContent("Banane");
    await user.keyboard("{Home} x"); // no match: stays; a lone Space still selects nothing here
    expect(highlighted()).toHaveTextContent("Apfel");
  });

  it("works horizontally and as a grid", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<List orientation="horizontal" />);
    screen.getByRole("listbox").focus();
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-orientation", "horizontal");
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Apfel");
    await user.keyboard("{ArrowRight}");
    expect(highlighted()).toHaveTextContent("Birne");
    unmount();

    // 3 columns: Apfel Birne Kirsche / Banane Dattel
    render(<List orientation="grid" columns={3} />);
    screen.getByRole("listbox").focus();
    await user.keyboard("{ArrowDown}");
    expect(highlighted()).toHaveTextContent("Banane");
    await user.keyboard("{ArrowRight}");
    expect(highlighted()).toHaveTextContent("Dattel");
    await user.keyboard("{ArrowDown}"); // wraps within the column
    expect(highlighted()).toHaveTextContent("Birne");
    await user.keyboard("{ArrowUp}");
    expect(highlighted()).toHaveTextContent("Dattel");
  });

  it("can be controlled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Controlled() {
      const [index, setIndex] = useState(3);
      return (
        <List
          activeIndex={index}
          onActiveIndexChange={(next, source) => {
            onChange(next, source);
            setIndex(next);
          }}
        />
      );
    }
    render(<Controlled />);
    expect(highlighted()).toHaveTextContent("Banane");
    screen.getByRole("listbox").focus();
    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith(4, "keyboard");
    expect(highlighted()).toHaveTextContent("Dattel");
    fireEvent.pointerMove(screen.getByRole("option", { name: "Apfel" }));
    expect(onChange).toHaveBeenLastCalledWith(0, "pointer");
  });

  it("exposes setActiveIndex and clamps when the list shrinks", () => {
    let api: ReturnType<typeof useListNavigation> | undefined;
    function Probe({ count }: { count: number }) {
      api = useListNavigation({ count });
      return <div {...api.getListProps()} />;
    }
    const { rerender } = render(<Probe count={5} />);
    act(() => api!.setActiveIndex(4));
    expect(api!.activeIndex).toBe(4);
    rerender(<Probe count={2} />);
    expect(api!.activeIndex).toBe(1);
    rerender(<Probe count={0} />);
    expect(api!.activeIndex).toBe(-1);
  });
});
