import { fireEvent, render, screen } from "@testing-library/react";
import { IconProvider } from "../../icons";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children with default variant and size", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("bg-pui-primary", "h-10");
    expect(button).toHaveAttribute("type", "button");
  });

  it("lets className override conflicting variant classes", () => {
    render(<Button className="h-14 px-8">Big</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-14", "px-8");
    expect(button).not.toHaveClass("h-10", "px-4");
  });

  it("calls onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and busy while loading", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("uses the spinner from IconProvider", () => {
    const CustomSpinner = () => <svg data-testid="custom-spinner" />;
    render(
      <IconProvider icons={{ spinner: CustomSpinner }}>
        <Button loading>Save</Button>
      </IconProvider>,
    );
    expect(screen.getByTestId("custom-spinner")).toBeInTheDocument();
  });

  it("renders any node as icon", () => {
    render(<Button leftIcon={<svg data-testid="icon" />}>Add</Button>);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
