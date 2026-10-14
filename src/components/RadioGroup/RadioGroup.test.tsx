import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup, RadioGroupItem } from "./RadioGroup";

function Storage(props: { disabled?: boolean; onValueChange?: (value: unknown) => void }) {
  return (
    <RadioGroup aria-label="Speicher" defaultValue="ssd" {...props}>
      <label>
        <RadioGroupItem value="ssd" />
        SSD
      </label>
      <label>
        <RadioGroupItem value="hdd" />
        HDD
      </label>
    </RadioGroup>
  );
}

describe("RadioGroup", () => {
  it("renders a radiogroup with styled radios", () => {
    render(<Storage />);
    expect(screen.getByRole("radiogroup", { name: "Speicher" })).toHaveClass("flex", "flex-col", "gap-2");
    const ssd = screen.getByRole("radio", { name: "SSD" });
    expect(ssd).toHaveAttribute("aria-checked", "true");
    expect(ssd).toHaveClass("size-4", "rounded-full", "data-[checked]:bg-pui-primary");
  });

  it("keeps the focus ring visible on the primary fill (1px offset)", () => {
    render(<Storage />);
    expect(screen.getByRole("radio", { name: "SSD" })).toHaveClass("focus-visible:ring-pui", "focus-visible:ring-offset-pui", "focus-visible:ring-offset-pui-background");
  });

  it("selects another option", async () => {
    const onValueChange = vi.fn();
    render(<Storage onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "HDD" }));
    expect(screen.getByRole("radio", { name: "HDD" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "SSD" })).toHaveAttribute("aria-checked", "false");
    expect(onValueChange).toHaveBeenCalledWith("hdd", expect.anything());
  });

  it("renders the dot indicator only for the checked radio", () => {
    render(<Storage />);
    expect(screen.getByRole("radio", { name: "SSD" }).querySelector(".bg-pui-primary-foreground")).not.toBeNull();
    expect(screen.getByRole("radio", { name: "HDD" }).querySelector(".bg-pui-primary-foreground")).toBeNull();
  });

  it("merges className, including the function form", () => {
    render(
      <RadioGroup aria-label="G" className="gap-4">
        <RadioGroupItem value="a" aria-label="a" className={(state) => (state.checked ? "is-on" : "is-off")} />
      </RadioGroup>,
    );
    expect(screen.getByRole("radiogroup")).toHaveClass("gap-4");
    expect(screen.getByRole("radiogroup")).not.toHaveClass("gap-2");
    expect(screen.getByRole("radio")).toHaveClass("is-off", "size-4");
  });

  it("does not change when disabled", async () => {
    render(<Storage disabled />);
    await userEvent.click(screen.getByRole("radio", { name: "HDD" }));
    expect(screen.getByRole("radio", { name: "HDD" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "HDD" })).toHaveAttribute("data-disabled");
  });
});

describe("RadioGroup items", () => {
  const items = [
    { value: "cash", label: "Bargeld", end: "1.200 $" },
    { value: "bank", label: "Bankkonto", description: "Girokonto bei Fleeca" },
    { value: "finance", label: "Mit Blaine County Savings finanzieren", description: "Keine Bank finanziert das", disabled: true },
  ];

  it("renders a clickable row per item and selects it by its label", async () => {
    const onValueChange = vi.fn();
    render(<RadioGroup aria-label="Zahlung" items={items} defaultValue="cash" onValueChange={onValueChange} />);
    const bank = screen.getByRole("radio", { name: /Bankkonto/ });
    expect(bank).toHaveAttribute("data-slot", "radio-group-option");
    // The label is part of the control, so clicking the text selects the choice.
    await userEvent.click(screen.getByText("Bankkonto"));
    expect(onValueChange).toHaveBeenCalledWith("bank", expect.anything());
    expect(bank).toHaveAttribute("aria-checked", "true");
    // The second line is the description, so the name stays the label alone.
    expect(bank).toHaveAccessibleName("Bankkonto");
    expect(bank).toHaveAccessibleDescription("Girokonto bei Fleeca");
  });

  it("stretches the rows in the vertical layout so long labels wrap", () => {
    render(<RadioGroup aria-label="Zahlung" items={items} />);
    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByRole("radiogroup")).not.toHaveClass("items-start");
    expect(screen.getByRole("radio", { name: /Bargeld/ })).toHaveClass("w-full");
  });

  it("lays the rows out in a row that wraps when horizontal", () => {
    render(<RadioGroup aria-label="Größe" orientation="horizontal" items={[{ value: "s", label: "S" }, { value: "m", label: "M" }]} />);
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("data-orientation", "horizontal");
    expect(group).toHaveClass("flex-row", "flex-wrap");
    expect(screen.getByRole("radio", { name: "S" })).toHaveClass("w-auto");
  });

  it("greys out a disabled item with its label and second line", async () => {
    const onValueChange = vi.fn();
    render(<RadioGroup aria-label="Zahlung" items={items} onValueChange={onValueChange} />);
    const locked = screen.getByRole("radio", { name: /finanzieren/ });
    expect(locked).toHaveAttribute("data-disabled");
    expect(locked).toHaveClass("data-[disabled]:opacity-50");
    await userEvent.click(screen.getByText("Keine Bank finanziert das"));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("shows the end slot and the description in their own slots", () => {
    const { container } = render(<RadioGroup aria-label="Zahlung" items={items} itemClassName="px-1" />);
    expect(container.querySelector("[data-slot=radio-group-option-end]")?.textContent).toBe("1.200 $");
    expect(container.querySelector("[data-slot=radio-group-option-description]")).toHaveClass("text-pui-muted-foreground");
    expect(screen.getByRole("radio", { name: /Bargeld/ })).toHaveClass("px-1");
  });

  it("shows the dot only in the checked row", () => {
    render(<RadioGroup aria-label="Zahlung" items={items} defaultValue="cash" />);
    expect(screen.getByRole("radio", { name: /Bargeld/ }).querySelector("[data-slot=radio-group-indicator]")).not.toBeNull();
    expect(screen.getByRole("radio", { name: /Bankkonto/ }).querySelector("[data-slot=radio-group-indicator]")).toBeNull();
  });
});

describe("RadioGroup data attributes", () => {
  it("marks group, items and indicator", () => {
    render(<Storage />);
    expect(screen.getByRole("radiogroup", { name: "Speicher" })).toHaveAttribute("data-slot", "radio-group");
    const ssd = screen.getByRole("radio", { name: "SSD" });
    expect(ssd).toHaveAttribute("data-slot", "radio-group-item");
    expect(ssd.querySelector("[data-slot=radio-group-indicator]")).not.toBeNull();
  });
});
