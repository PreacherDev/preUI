import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("renders a button with aria-pressed and default size", () => {
    render(<Toggle aria-label="Fett">B</Toggle>);
    const toggle = screen.getByRole("button", { name: "Fett" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveClass("h-pui-control", "data-[pressed]:bg-pui-accent");
  });

  it("toggles on click", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<Toggle onPressedChange={onPressedChange}>Fett</Toggle>);
    const toggle = screen.getByRole("button");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(toggle).toHaveAttribute("data-pressed");
    expect(onPressedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it("applies size and variant classes", () => {
    render(
      <>
        <Toggle size="segment">Seg</Toggle>
        <Toggle size="sm" variant="outline">
          Klein
        </Toggle>
      </>,
    );
    const segment = screen.getByRole("button", { name: "Seg" });
    expect(segment).toHaveClass("h-6", "rounded-pui-sm", "hover:bg-transparent");
    expect(segment).not.toHaveClass("rounded-pui-md", "hover:bg-pui-accent/60");
    expect(screen.getByRole("button", { name: "Klein" })).toHaveClass("h-pui-control-sm", "border-pui-border");
  });

  it("merges className, including the function form", () => {
    render(
      <Toggle defaultPressed className={(state) => (state.pressed ? "is-on h-12" : "is-off")}>
        An
      </Toggle>,
    );
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveClass("is-on", "h-12");
    expect(toggle).not.toHaveClass("h-pui-control");
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    render(<Toggle disabled>Fett</Toggle>);
    const toggle = screen.getByRole("button");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle).toBeDisabled();
  });
});

describe("Toggle data attributes", () => {
  it("exposes data-slot, data-variant and data-size", () => {
    render(
      <Toggle aria-label="Fett" variant="outline" size="sm">
        B
      </Toggle>,
    );
    const toggle = screen.getByRole("button", { name: "Fett" });
    expect(toggle).toHaveAttribute("data-slot", "toggle");
    expect(toggle).toHaveAttribute("data-variant", "outline");
    expect(toggle).toHaveAttribute("data-size", "sm");
    expect(toggle).toHaveClass("h-pui-control-sm", "focus-visible:ring-pui");
  });
});
