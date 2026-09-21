import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./InputOTP";

describe("InputOTP", () => {
  it("renders `length` input slots automatically", () => {
    render(<InputOTP length={6} aria-label="Code" />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);
    expect(inputs[0]).toHaveClass("size-pui-control", "rounded-pui-md", "border-pui-input", "text-center");
    expect(screen.getByLabelText("Character 2 of 6")).toBe(inputs[1]);
  });

  it("accepts a custom slot label", () => {
    render(<InputOTP length={4} getSlotLabel={(i, n) => `Zeichen ${i + 1} von ${n}`} />);
    expect(screen.getByLabelText("Zeichen 4 von 4")).toBeInTheDocument();
  });

  it("fills slots while typing and reports completion", async () => {
    const onValueComplete = vi.fn();
    render(<InputOTP length={4} onValueComplete={onValueComplete} />);
    const inputs = screen.getAllByRole("textbox");
    await userEvent.click(inputs[0]);
    await userEvent.keyboard("1234");
    expect(inputs.map((input) => (input as HTMLInputElement).value)).toEqual(["1", "2", "3", "4"]);
    expect(onValueComplete).toHaveBeenCalledWith("1234", expect.anything());
  });

  it("supports grouped layouts with a separator", () => {
    const { container } = render(
      <InputOTP length={4}>
        <InputOTPGroup data-testid="group">
          <InputOTPSlot />
          <InputOTPSlot aria-label="2" />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot aria-label="3" />
          <InputOTPSlot aria-label="4" />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
    expect(screen.getByTestId("group")).toHaveClass("flex", "items-center", "gap-2");
    expect(container.querySelector(".bg-pui-border")).toHaveClass("h-px", "w-3");
  });

  it("merges className, including the function form", () => {
    const { container } = render(
      <InputOTP
        length={2}
        className={(state) => (state.complete ? "is-done" : "is-open")}
        slotClassName="size-11"
      />,
    );
    expect(container.firstChild).toHaveClass("is-open", "flex", "gap-2");
    const [first] = screen.getAllByRole("textbox");
    expect(first).toHaveClass("size-11");
    expect(first).not.toHaveClass("size-pui-control");
  });

  it("is disabled", () => {
    render(<InputOTP length={3} disabled />);
    for (const input of screen.getAllByRole("textbox")) expect(input).toBeDisabled();
  });
});

describe("InputOTP data attributes", () => {
  it("marks root, groups, slots and separator", () => {
    const { container } = render(
      <InputOTP length={4} aria-label="Code">
        <InputOTPGroup>
          <InputOTPSlot />
          <InputOTPSlot />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot />
          <InputOTPSlot />
        </InputOTPGroup>
      </InputOTP>,
    );
    expect(container.querySelector("[data-slot=input-otp]")).not.toBeNull();
    expect(container.querySelectorAll("[data-slot=input-otp-group]")).toHaveLength(2);
    expect(container.querySelectorAll("[data-slot=input-otp-slot]")).toHaveLength(4);
    expect(container.querySelector("[data-slot=input-otp-separator]")).not.toBeNull();
  });
});
