import { render, screen } from "@testing-library/react";
import { Separator } from "./Separator";

describe("Separator", () => {
  it("renders a horizontal separator by default", () => {
    render(<Separator />);
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("data-orientation", "horizontal");
    expect(separator).toHaveClass("shrink-0", "bg-pui-border", "data-[orientation=horizontal]:h-px");
  });

  it("renders a vertical separator", () => {
    render(<Separator orientation="vertical" />);
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("data-orientation", "vertical");
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
  });

  it("merges className, including the function form", () => {
    const { rerender } = render(<Separator className="bg-pui-input" />);
    expect(screen.getByRole("separator")).toHaveClass("bg-pui-input");
    expect(screen.getByRole("separator")).not.toHaveClass("bg-pui-border");
    rerender(<Separator orientation="vertical" className={(state) => `is-${state.orientation}`} />);
    expect(screen.getByRole("separator")).toHaveClass("is-vertical", "shrink-0");
  });

  it("sets data-slot, overridable by wrappers", () => {
    const { rerender } = render(<Separator />);
    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "separator");
    rerender(<Separator data-slot="item-separator" />);
    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "item-separator");
  });
});
