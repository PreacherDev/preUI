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

describe("NumberField sizes and invalid focus", () => {
  it("uses the Input text size per size; the input inherits it", () => {
    const { container } = render(<NumberField size="sm" inputProps={{ "aria-label": "Menge" }} />);
    expect(container.firstChild).toHaveClass("h-pui-control-sm", "text-xs");
    expect(container.firstChild).not.toHaveClass("text-sm");
    const input = screen.getByRole("textbox", { name: "Menge" });
    expect(input).toHaveClass("text-[length:inherit]");
    expect(input).not.toHaveClass("text-sm");
  });

  it("shows focus on an invalid field with a ring in the negative colour", () => {
    const { container } = render(<NumberField inputProps={{ "aria-label": "Menge" }} />);
    expect(container.firstChild).toHaveClass(
      "data-[invalid]:focus-within:ring-pui",
      "data-[invalid]:focus-within:ring-pui-negative",
    );
  });
});

describe("NumberField without steppers", () => {
  it("leaves out the -/+ buttons and pads like a plain Input per size", () => {
    const { container, rerender } = render(
      <NumberField steppers={false} defaultValue={4000} inputProps={{ "aria-label": "Preis" }} />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("[data-slot=number-field-decrement]")).toBeNull();
    expect(container.firstChild).toHaveAttribute("data-steppers", "false");
    expect(container.firstChild).toHaveClass("h-pui-control", "rounded-pui-md", "border-pui-input", "text-sm");
    const input = screen.getByRole("textbox", { name: "Preis" });
    expect(input).toHaveValue("4,000");
    expect(input).toHaveClass("px-3", "text-left", "tabular-nums");
    expect(input).not.toHaveClass("px-2", "text-center");

    rerender(<NumberField steppers={false} size="sm" inputProps={{ "aria-label": "Preis" }} />);
    expect(screen.getByRole("textbox")).toHaveClass("px-2.5");
    rerender(<NumberField steppers={false} size="lg" inputProps={{ "aria-label": "Preis" }} />);
    expect(screen.getByRole("textbox")).toHaveClass("px-3.5");
  });

  it("still steps with the keyboard", async () => {
    const onValueChange = vi.fn();
    render(
      <NumberField steppers={false} defaultValue={3} onValueChange={onValueChange} inputProps={{ "aria-label": "Menge" }} />,
    );
    const input = screen.getByRole("textbox", { name: "Menge" });
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowDown}");
    expect(input).toHaveValue("4");
    expect(onValueChange).toHaveBeenLastCalledWith(4, expect.anything());
  });

  it("keeps the stepper layout by default", () => {
    const { container } = render(<NumberField inputProps={{ "aria-label": "Menge" }} />);
    expect(container.firstChild).not.toHaveAttribute("data-steppers");
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("textbox")).toHaveClass("px-2", "text-center");
  });
});

describe("NumberField stepper tooltips", () => {
  it("shows the stepper labels as tooltips", async () => {
    const user = userEvent.setup();
    render(
      <NumberField
        defaultValue={3}
        decrementLabel="Weniger"
        incrementLabel="Mehr"
        stepperTooltip={{ delay: 0 }}
        inputProps={{ "aria-label": "Menge" }}
      />,
    );
    await user.hover(screen.getByRole("button", { name: "Weniger" }));
    expect(await screen.findByText("Weniger")).toHaveAttribute("data-slot", "tooltip-content");
    await user.unhover(screen.getByRole("button", { name: "Weniger" }));
    await user.hover(screen.getByRole("button", { name: "Mehr" }));
    expect(await screen.findByText("Mehr")).toBeInTheDocument();
  });

  it("still steps while the tooltip is wired up", async () => {
    const user = userEvent.setup();
    render(<NumberField defaultValue={3} stepperTooltip={{ delay: 0 }} inputProps={{ "aria-label": "Menge" }} />);
    await user.click(screen.getByRole("button", { name: "Increase" }));
    expect(screen.getByRole("textbox")).toHaveValue("4");
  });

  it("can be turned off", async () => {
    const user = userEvent.setup();
    render(<NumberField defaultValue={3} stepperTooltip={false} inputProps={{ "aria-label": "Menge" }} />);
    const button = screen.getByRole("button", { name: "Increase" });
    await user.hover(button);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(button).not.toHaveAttribute("data-slot", "tooltip-trigger");
  });
});
