import { fireEvent, render, screen } from "@testing-library/react";
import { IconProvider } from "../../icons";
import { Button } from "./Button";

describe("Button", () => {
  it("renders the tinted default variant and size", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("bg-pui-primary/tint", "text-pui-primary", "h-pui-control");
    expect(button).toHaveAttribute("type", "button");
  });

  it("renders the solid variant", () => {
    render(<Button variant="solid">Buy</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-pui-primary", "text-pui-primary-foreground");
  });

  it("offsets the focus ring of the solid variant, so it does not vanish against the fill", () => {
    render(<Button variant="solid">Buy</Button>);
    expect(screen.getByRole("button")).toHaveClass("focus-visible:ring-pui", "focus-visible:ring-offset-pui");
    render(<Button>Tinted</Button>);
    expect(screen.getByRole("button", { name: "Tinted" })).not.toHaveClass("focus-visible:ring-offset-pui");
  });

  it("renders the link variant without background or underline", () => {
    render(<Button variant="link">Mehr erfahren</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-pui-primary", "hover:text-pui-primary/80", "border-transparent");
    expect(button.className).not.toMatch(/bg-|underline/);
  });

  it("renders the icon-lg size", () => {
    render(<Button size="icon-lg" aria-label="Menü" />);
    expect(screen.getByRole("button")).toHaveClass("size-pui-control-lg", "p-0");
  });

  it("lets className override conflicting variant classes", () => {
    render(<Button className="h-14 px-8">Big</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-14", "px-8");
    expect(button).not.toHaveClass("h-pui-control", "px-3.5");
  });

  it("lets className override the preset radius", () => {
    render(<Button className="rounded-full">Pill</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("rounded-full");
    expect(button).not.toHaveClass("rounded-pui-md");
  });

  it("supports Base UI's className function", () => {
    render(<Button className={(state) => (state.disabled ? "is-off" : "is-on")}>State</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("is-on", "h-pui-control");
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

describe("Button data attributes", () => {
  it("exposes data-slot, data-variant and data-size", () => {
    render(
      <>
        <Button>Default</Button>
        <Button variant="destructive" size="sm" leftIcon={<svg />}>
          Delete
        </Button>
      </>,
    );
    const plain = screen.getByRole("button", { name: "Default" });
    expect(plain).toHaveAttribute("data-slot", "button");
    expect(plain).toHaveAttribute("data-variant", "default");
    expect(plain).toHaveAttribute("data-size", "default");
    const del = screen.getByRole("button", { name: "Delete" });
    expect(del).toHaveAttribute("data-variant", "destructive");
    expect(del).toHaveAttribute("data-size", "sm");
    expect(del.querySelector("[data-slot=button-icon]")).toHaveAttribute("data-position", "left");
  });

  it("uses the token classes for tint, focus ring and motion", () => {
    render(<Button variant="positive">Ok</Button>);
    expect(screen.getByRole("button")).toHaveClass(
      "bg-pui-positive/tint",
      "hover:bg-pui-positive/tint-hover",
      "border-pui-positive/tint-border",
      "focus-visible:ring-pui",
      "duration-pui-fast",
      "ease-pui",
    );
  });
});
