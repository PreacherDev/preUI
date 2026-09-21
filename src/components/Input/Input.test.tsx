import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("renders a styled text field", () => {
    render(<Input placeholder="Firmenname" />);
    const input = screen.getByPlaceholderText("Firmenname");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveClass("h-pui-control", "border-pui-input", "rounded-pui-md", "focus-visible:border-pui-ring");
  });

  it("hides the native clear button of search inputs", () => {
    render(<Input type="search" aria-label="Suche" />);
    expect(screen.getByRole("searchbox")).toHaveClass("[&::-webkit-search-cancel-button]:appearance-none");
  });

  it("applies the size variant and the native size attribute", () => {
    render(<Input size="sm" htmlSize={10} aria-label="Klein" />);
    const input = screen.getByLabelText("Klein");
    expect(input).toHaveClass("h-pui-control-sm", "text-xs");
    expect(input).toHaveAttribute("size", "10");
  });

  it("merges className, including the function form", () => {
    const { rerender } = render(<Input aria-label="Feld" className="h-12" />);
    expect(screen.getByLabelText("Feld")).toHaveClass("h-12");
    expect(screen.getByLabelText("Feld")).not.toHaveClass("h-pui-control");
    rerender(<Input aria-label="Feld" className={(state) => (state.disabled ? "is-off" : "is-on")} />);
    expect(screen.getByLabelText("Feld")).toHaveClass("is-on", "h-pui-control");
  });

  it("calls onValueChange when typing", async () => {
    const onValueChange = vi.fn();
    render(<Input aria-label="Name" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByLabelText("Name"), "Ab");
    expect(onValueChange).toHaveBeenLastCalledWith("Ab", expect.anything());
  });

  it("centres the file picker button in the field", () => {
    const { container } = render(<Input type="file" aria-label="Datei" />);
    expect(container.querySelector("input")).toHaveClass("file:h-full", "file:p-0", "file:mr-3");
  });

  it("can be disabled", () => {
    render(<Input aria-label="Aus" disabled />);
    expect(screen.getByLabelText("Aus")).toBeDisabled();
  });
});

describe("Input data attributes", () => {
  it("exposes data-slot and data-size", () => {
    render(<Input aria-label="Feld" size="lg" />);
    const input = screen.getByRole("textbox", { name: "Feld" });
    expect(input).toHaveAttribute("data-slot", "input");
    expect(input).toHaveAttribute("data-size", "lg");
    expect(input).toHaveClass("h-pui-control-lg", "duration-pui-fast", "ease-pui");
  });
});
