import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders a pulsing, hidden placeholder", () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveClass("animate-pulse", "motion-reduce:animate-none", "bg-pui-muted", "rounded-pui-md");
  });

  it("merges className and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} data-testid="skeleton" className="size-10 rounded-full" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(ref.current).toBe(skeleton);
    expect(skeleton).toHaveClass("size-10", "rounded-full");
    expect(skeleton).not.toHaveClass("rounded-pui-md");
  });
});
