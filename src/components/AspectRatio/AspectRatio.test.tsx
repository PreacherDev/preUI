import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { AspectRatio } from "./AspectRatio";

describe("AspectRatio", () => {
  it("defaults to a square ratio", () => {
    render(<AspectRatio data-testid="box" />);
    const box = screen.getByTestId("box");
    expect(parseFloat(box.style.aspectRatio)).toBe(1);
    expect(box).toHaveClass("relative", "w-full");
  });

  it("applies the ratio and keeps custom styles", () => {
    render(
      <AspectRatio data-testid="box" ratio={16 / 9} style={{ maxWidth: 320 }}>
        <img alt="Lager" src="data:," />
      </AspectRatio>,
    );
    const box = screen.getByTestId("box");
    expect(parseFloat(box.style.aspectRatio)).toBeCloseTo(16 / 9);
    expect(box.style.maxWidth).toBe("320px");
    expect(screen.getByRole("img", { name: "Lager" })).toBeInTheDocument();
  });

  it("merges className and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    render(<AspectRatio ref={ref} data-testid="box" className="overflow-hidden rounded-pui" />);
    expect(ref.current).toBe(screen.getByTestId("box"));
    expect(screen.getByTestId("box")).toHaveClass("overflow-hidden", "rounded-pui", "relative");
  });
});
