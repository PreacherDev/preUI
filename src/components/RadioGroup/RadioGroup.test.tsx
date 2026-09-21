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

describe("RadioGroup data attributes", () => {
  it("marks group, items and indicator", () => {
    render(<Storage />);
    expect(screen.getByRole("radiogroup", { name: "Speicher" })).toHaveAttribute("data-slot", "radio-group");
    const ssd = screen.getByRole("radio", { name: "SSD" });
    expect(ssd).toHaveAttribute("data-slot", "radio-group-item");
    expect(ssd.querySelector("[data-slot=radio-group-indicator]")).not.toBeNull();
  });
});
