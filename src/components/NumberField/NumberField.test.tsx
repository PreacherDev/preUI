import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconProvider } from "../../icons";
import { NumberField } from "./NumberField";

describe("NumberField", () => {
  it("renders the stepper layout", () => {
    const { container } = render(<NumberField defaultValue={3} inputProps={{ "aria-label": "Menge" }} />);
    const input = screen.getByRole("textbox", { name: "Menge" });
    expect(input).toHaveValue("3");
    expect(input).toHaveClass("text-center", "tabular-nums");
    expect(container.firstChild).toHaveClass("h-pui-control", "border-pui-input", "focus-within:border-pui-ring");
    expect(screen.getByRole("button", { name: "Decrease" })).toHaveClass("border-r");
    expect(screen.getByRole("button", { name: "Increase" })).toHaveClass("border-l");
  });

  it("steps up and down", async () => {
    const onValueChange = vi.fn();
    render(
      <NumberField
        defaultValue={3}
        onValueChange={onValueChange}
        decrementLabel="Weniger"
        incrementLabel="Mehr"
        inputProps={{ "aria-label": "Menge" }}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Mehr" }));
    expect(screen.getByRole("textbox")).toHaveValue("4");
    await userEvent.click(screen.getByRole("button", { name: "Weniger" }));
    await userEvent.click(screen.getByRole("button", { name: "Weniger" }));
    expect(screen.getByRole("textbox")).toHaveValue("2");
    expect(onValueChange).toHaveBeenLastCalledWith(2, expect.anything());
  });

  it("disables the decrement button at min", () => {
    render(<NumberField defaultValue={0} min={0} inputProps={{ "aria-label": "Menge" }} />);
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
  });

  it("uses the minus/plus icons", () => {
    render(
      <IconProvider icons={{ minus: () => <svg data-testid="minus" />, plus: () => <svg data-testid="plus" /> }}>
        <NumberField defaultValue={1} />
      </IconProvider>,
    );
    expect(screen.getByTestId("minus")).toBeInTheDocument();
    expect(screen.getByTestId("plus")).toBeInTheDocument();
  });

  it("applies size and merges className, including the function form", () => {
    const { container, rerender } = render(<NumberField size="sm" className="w-32" />);
    expect(container.firstChild).toHaveClass("h-pui-control-sm", "w-32");
    expect(container.firstChild).not.toHaveClass("w-full");
    rerender(<NumberField className={(state) => (state.disabled ? "is-off" : "is-on")} />);
    expect(container.firstChild).toHaveClass("is-on", "h-pui-control");
  });

  it("is disabled", () => {
    const { container } = render(<NumberField defaultValue={1} disabled inputProps={{ "aria-label": "Menge" }} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
    expect(container.firstChild).toHaveAttribute("data-disabled");
  });
});

describe("NumberField data attributes", () => {
  it("marks every part and the size", () => {
    const { container } = render(<NumberField size="sm" defaultValue={1} inputProps={{ "aria-label": "Menge" }} />);
    expect(container.firstChild).toHaveAttribute("data-slot", "number-field");
    expect(container.firstChild).toHaveAttribute("data-size", "sm");
    for (const slot of ["number-field-group", "number-field-decrement", "number-field-increment"]) {
      expect(container.querySelector(`[data-slot=${slot}]`)).not.toBeNull();
    }
    expect(screen.getByRole("textbox", { name: "Menge" })).toHaveAttribute("data-slot", "number-field-input");
  });
});
