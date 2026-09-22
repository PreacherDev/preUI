import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("renders a switch with track and thumb", () => {
    render(<Switch aria-label="Benachrichtigungen" />);
    const control = screen.getByRole("switch", { name: "Benachrichtigungen" });
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(control).toHaveClass("h-5", "w-9", "rounded-full", "bg-pui-input", "data-[checked]:bg-pui-primary");
    expect(control.firstElementChild).toHaveClass("size-4", "bg-pui-thumb", "data-[checked]:translate-x-4");
  });

  it("keeps the focus ring visible on the primary track (1px offset)", () => {
    render(<Switch aria-label="A" defaultChecked />);
    expect(screen.getByRole("switch")).toHaveClass("focus-visible:ring-pui", "focus-visible:ring-offset-pui", "focus-visible:ring-offset-pui-background");
  });

  it("toggles on click", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="A" onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole("switch");
    await userEvent.click(control);
    expect(control).toHaveAttribute("aria-checked", "true");
    expect(control).toHaveAttribute("data-checked");
    expect(control.firstElementChild).toHaveAttribute("data-checked");
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it("gives the checked thumb the primary foreground, so it stays visible on light accent colours", async () => {
    render(<Switch aria-label="A" defaultChecked />);
    const thumb = screen.getByRole("switch").firstElementChild;
    expect(thumb).toHaveAttribute("data-checked");
    expect(thumb).toHaveClass("bg-pui-thumb", "data-[checked]:bg-pui-primary-foreground");
  });

  it("toggles with the keyboard", async () => {
    render(<Switch aria-label="A" />);
    const control = screen.getByRole("switch");
    control.focus();
    await userEvent.keyboard(" ");
    expect(control).toHaveAttribute("aria-checked", "true");
  });

  it("merges className, including the function form", () => {
    const { rerender } = render(<Switch aria-label="A" className="w-11" thumbClassName="size-3" />);
    const control = screen.getByRole("switch");
    expect(control).toHaveClass("w-11");
    expect(control).not.toHaveClass("w-9");
    expect(control.firstElementChild).toHaveClass("size-3");
    rerender(<Switch aria-label="A" className={(state) => (state.checked ? "is-on" : "is-off")} />);
    expect(screen.getByRole("switch")).toHaveClass("is-off", "h-5");
  });

  it("does not toggle when disabled", async () => {
    render(<Switch aria-label="A" disabled />);
    const control = screen.getByRole("switch");
    await userEvent.click(control);
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(control).toHaveAttribute("data-disabled");
  });
});

describe("Switch data attributes", () => {
  it("marks root and thumb", () => {
    render(<Switch aria-label="An" />);
    const control = screen.getByRole("switch", { name: "An" });
    expect(control).toHaveAttribute("data-slot", "switch");
    expect(control.firstElementChild).toHaveAttribute("data-slot", "switch-thumb");
  });
});
