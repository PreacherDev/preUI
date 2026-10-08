import { render, screen } from "@testing-library/react";
import { Separator } from "./Separator";

describe("Separator", () => {
  it("renders a horizontal separator by default", () => {
    render(<Separator />);
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("data-orientation", "horizontal");
    expect(separator.className.split(" ").sort()).toEqual(["bg-pui-border", "h-px", "shrink-0", "w-full"]);
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
  it("stretches vertically with auto height (no h-full, which is 0 in a content-sized row)", () => {
    render(<Separator orientation="vertical" />);
    const classes = screen.getByRole("separator").className.split(" ");
    expect(classes.sort()).toEqual(["bg-pui-border", "self-stretch", "shrink-0", "w-px"]);
    expect(classes.some((name) => /(^|:)h-/.test(name))).toBe(false);
  });

  it("lets a user height and alignment replace the vertical defaults", () => {
    render(<Separator orientation="vertical" className="h-5 self-center" />);
    const classes = screen.getByRole("separator").className.split(" ");
    expect(classes).toEqual(expect.arrayContaining(["h-5", "self-center", "w-px"]));
    expect(classes).not.toContain("self-stretch");
    // No attribute-variant classes that would outrank the user's classes by specificity.
    expect(classes.some((name) => name.startsWith("data-["))).toBe(false);
  });

  it("centres a vertical separator that has its own height, also behind a variant (shadcn pattern)", () => {
    const { rerender } = render(<Separator orientation="vertical" className="data-[orientation=vertical]:h-5" />);
    let classes = screen.getByRole("separator").className.split(" ");
    expect(classes).toContain("self-center");
    expect(classes).not.toContain("self-stretch");
    rerender(<Separator orientation="vertical" className="h-4" />);
    classes = screen.getByRole("separator").className.split(" ");
    expect(classes).toContain("self-center");
    rerender(<Separator orientation="vertical" className="min-h-0" />);
    classes = screen.getByRole("separator").className.split(" ");
    expect(classes).toContain("self-stretch");
  });
});
