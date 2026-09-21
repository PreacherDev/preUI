import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { IconProvider } from "../../icons";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders a status with a default label and a spinning icon", () => {
    render(<Spinner />);
    const spinner = screen.getByRole("status", { name: "Loading" });
    expect(spinner).toHaveClass("size-4");
    const icon = spinner.querySelector("svg");
    expect(icon).toHaveClass("animate-spin", "size-full");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("accepts a custom label, className and ref", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Spinner ref={ref} label="Wird geladen" className="size-6 text-pui-primary" />);
    const spinner = screen.getByRole("status", { name: "Wird geladen" });
    expect(ref.current).toBe(spinner);
    expect(spinner).toHaveClass("size-6", "text-pui-primary");
    expect(spinner).not.toHaveClass("size-4");
  });

  it("uses the spinner icon from the IconProvider", () => {
    render(
      <IconProvider icons={{ spinner: (props) => <svg data-testid="custom" {...props} /> }}>
        <Spinner />
      </IconProvider>,
    );
    expect(screen.getByTestId("custom")).toHaveClass("animate-spin");
  });

  it("marks the icon with data-slot", () => {
    render(<Spinner />);
    expect(screen.getByRole("status").querySelector("[data-slot=spinner-icon]")).toBeInTheDocument();
  });
});
