import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./Select";

const items = [
  { value: "all", label: "Alle" },
  { value: "income", label: "Einnahmen" },
  { value: "expense", label: "Ausgaben" },
];

function Example(props: { onValueChange?: (value: string | null) => void; disabled?: boolean }) {
  return (
    <Select items={items} onValueChange={props.onValueChange} disabled={props.disabled}>
      <SelectTrigger className={(state) => (state.open ? "is-open" : "is-closed")}>
        <SelectValue placeholder="Kategorie wählen" />
      </SelectTrigger>
      <SelectContent className="custom-popup">
        <SelectGroup>
          <SelectLabel>Buchungen</SelectLabel>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} disabled={item.value === "expense"}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("marks every part with data-slot (and the trigger with data-size)", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("data-slot", "select-trigger");
    expect(trigger).toHaveAttribute("data-size", "default");
    expect(screen.getByText("Kategorie wählen")).toHaveAttribute("data-slot", "select-value");
    await user.click(trigger);
    const listbox = await screen.findByRole("listbox");
    // The list keeps the ScrollArea viewport slot; the popup around it is the select content.
    expect(listbox).toHaveAttribute("data-slot", "scroll-area-viewport");
    expect(listbox.closest('[data-slot="select-content"]')).toHaveClass("custom-popup");
    expect(screen.getByRole("option", { name: "Alle" })).toHaveAttribute("data-slot", "select-item");
    expect(screen.getByText("Buchungen")).toHaveAttribute("data-slot", "select-label");
    expect(screen.getByRole("group")).toHaveAttribute("data-slot", "select-group");
    expect(document.querySelector('[data-slot="select-separator"]')).toBeInTheDocument();
  });

  it("renders a field-styled combobox trigger with placeholder", () => {
    render(<Example />);
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveClass("h-pui-control", "border-pui-input", "bg-pui-background", "is-closed");
    expect(screen.getByText("Kategorie wählen")).toHaveAttribute("data-placeholder");
    expect(trigger.querySelector("svg")).toBeInTheDocument();
  });

  it("opens, shows styled options and selects one", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    await user.click(screen.getByRole("combobox"));

    const listbox = await screen.findByRole("listbox");
    expect(listbox).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveClass("is-open");
    const option = screen.getByRole("option", { name: "Einnahmen" });
    expect(option).toHaveClass("py-1.5", "pl-2", "pr-8", "rounded-pui-sm");
    expect(screen.getByText("Buchungen")).toHaveClass("text-pui-eyebrow");
    expect(screen.getByRole("group", { name: "Buchungen" })).toBeInTheDocument();
    expect(document.querySelector(".custom-popup")).toHaveClass("bg-pui-popover", "shadow-pui-floating");

    await user.click(option);
    expect(onValueChange).toHaveBeenCalledWith("income", expect.anything());
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveTextContent("Einnahmen"));
  });

  it("marks disabled options", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Ausgaben" })).toHaveAttribute("data-disabled");
  });

  it("renders styled scroll buttons with chevrons", () => {
    render(
      <Select open items={items}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectScrollUpButton keepMounted data-testid="up" />
          <SelectScrollDownButton keepMounted data-testid="down" className="h-8" />
        </SelectContent>
      </Select>,
    );
    const up = screen.getAllByTestId("up")[0];
    expect(up).toHaveClass("top-0", "bg-pui-popover", "text-pui-muted-foreground");
    expect(up.querySelector("svg")).toBeInTheDocument();
    const down = screen.getAllByTestId("down")[0];
    expect(down).toHaveClass("bottom-0", "h-8");
    expect(down).not.toHaveClass("h-6");
  });

  it("renders the list as a ScrollArea viewport that keeps the popup's max height", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    // The listbox itself is the scroll container: the preUI ScrollArea viewport (no native scrollbar).
    expect(listbox).toHaveAttribute("data-slot", "scroll-area-viewport");
    expect(listbox.parentElement).toHaveAttribute("data-slot", "scroll-area");
    // Not an extra Tab stop inside the popup.
    expect(listbox).toHaveAttribute("tabindex", "-1");
    // The popup adds p-1 + border (0.625rem) around the list: subtract it from the available height,
    // otherwise the popup sticks out of the viewport when it has to shrink.
    expect(listbox.className).toContain("max-h-[min(18rem,calc(var(--available-height)-0.625rem))]");
    expect(listbox).toHaveClass("scroll-py-1");
  });

  it("keeps items clear of the scroll arrows when scrollButtons is on", async () => {
    const user = userEvent.setup();
    render(
      <Select items={items}>
        <SelectTrigger>
          <SelectValue placeholder="Kategorie wählen" />
        </SelectTrigger>
        <SelectContent scrollButtons listClassName="max-h-40">
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    // Keyboard/selected scroll-into-view keeps items clear of the 1.5rem (h-6) scroll arrows.
    expect(listbox).toHaveClass("scroll-py-6", "max-h-40");
    expect(listbox).not.toHaveClass("scroll-py-1");
  });

  it("can be disabled", () => {
    render(<Example disabled />);
    expect(screen.getByRole("combobox")).toHaveAttribute("data-disabled");
  });
});
