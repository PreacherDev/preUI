import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconProvider } from "../../icons";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("renders an unchecked checkbox with the base styles", () => {
    render(<Checkbox aria-label="AGB" />);
    const checkbox = screen.getByRole("checkbox", { name: "AGB" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    expect(checkbox).toHaveClass("size-4", "rounded-pui-sm", "border-pui-input", "data-[checked]:bg-pui-primary");
  });

  it("keeps the focus ring visible on the primary fill (1px offset)", () => {
    render(<Checkbox aria-label="A" defaultChecked />);
    expect(screen.getByRole("checkbox")).toHaveClass("focus-visible:ring-pui", "focus-visible:ring-offset-pui", "focus-visible:ring-offset-pui-background");
  });

  it("toggles on click and calls onCheckedChange", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="AGB" onCheckedChange={onCheckedChange} />);
    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(checkbox).toHaveAttribute("data-checked");
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it("shows the check icon when checked and the minus icon when indeterminate", () => {
    const Check = () => <svg data-testid="check" />;
    const Minus = () => <svg data-testid="minus" />;
    const { rerender } = render(
      <IconProvider icons={{ check: Check, minus: Minus }}>
        <Checkbox aria-label="A" defaultChecked />
      </IconProvider>,
    );
    expect(screen.getByTestId("check")).toBeInTheDocument();
    rerender(
      <IconProvider icons={{ check: Check, minus: Minus }}>
        <Checkbox aria-label="A" indeterminate />
      </IconProvider>,
    );
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-checked", "mixed");
    expect(screen.getByTestId("minus")).toBeInTheDocument();
    expect(screen.queryByTestId("check")).not.toBeInTheDocument();
  });

  it("toggles via an enclosing label", async () => {
    render(
      <label>
        <Checkbox />
        Angemeldet bleiben
      </label>,
    );
    await userEvent.click(screen.getByText("Angemeldet bleiben"));
    expect(screen.getByRole("checkbox", { name: "Angemeldet bleiben" })).toHaveAttribute("aria-checked", "true");
  });

  it("merges className, including the function form", () => {
    const { rerender } = render(<Checkbox aria-label="A" className="rounded-full" />);
    expect(screen.getByRole("checkbox")).toHaveClass("rounded-full");
    expect(screen.getByRole("checkbox")).not.toHaveClass("rounded-pui-sm");
    rerender(<Checkbox aria-label="A" className={(state) => (state.checked ? "is-on" : "is-off")} />);
    expect(screen.getByRole("checkbox")).toHaveClass("is-off", "size-4");
  });

  it("does not toggle when disabled", async () => {
    render(<Checkbox aria-label="A" disabled />);
    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    expect(checkbox).toHaveAttribute("data-disabled");
  });
});

describe("Checkbox data attributes", () => {
  it("marks root and indicator", () => {
    render(<Checkbox aria-label="AGB" defaultChecked />);
    const checkbox = screen.getByRole("checkbox", { name: "AGB" });
    expect(checkbox).toHaveAttribute("data-slot", "checkbox");
    expect(checkbox.querySelector("[data-slot=checkbox-indicator]")).not.toBeNull();
    expect(checkbox).toHaveClass("focus-visible:ring-pui", "duration-pui-fast", "ease-pui");
  });
});
