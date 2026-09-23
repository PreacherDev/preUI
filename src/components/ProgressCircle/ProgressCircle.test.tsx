import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { ProgressCircle, ProgressCircleValue } from "./ProgressCircle";

function parts(bar: HTMLElement) {
  return {
    svg: bar.querySelector<SVGSVGElement>('[data-slot="progress-circle-svg"]')!,
    track: bar.querySelector<SVGCircleElement>('[data-slot="progress-circle-track"]')!,
    indicator: bar.querySelector<SVGCircleElement>('[data-slot="progress-circle-indicator"]')!,
  };
}

describe("ProgressCircle", () => {
  it("renders a progressbar with aria values, track and indicator", () => {
    render(<ProgressCircle value={25} aria-label="Tankfüllung" />);
    const bar = screen.getByRole("progressbar", { name: "Tankfüllung" });
    expect(bar).toHaveAttribute("aria-valuenow", "25");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuetext", "25%");
    expect(bar).toHaveAttribute("data-slot", "progress-circle");
    expect(bar).toHaveAttribute("data-variant", "primary");
    expect(bar).toHaveAttribute("data-size", "default");
    expect(bar).toHaveClass("size-12");
    const { svg, track, indicator } = parts(bar);
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 48 48");
    expect(track).toHaveClass("stroke-pui-muted");
    expect(track).toHaveAttribute("stroke-width", "4");
    expect(indicator).toHaveClass("stroke-pui-primary", "duration-pui-slow", "ease-pui");
    const circumference = 2 * Math.PI * 22;
    expect(Number(indicator.getAttribute("stroke-dasharray"))).toBeCloseTo(circumference);
    expect(parseFloat(indicator.style.strokeDashoffset)).toBeCloseTo(circumference * 0.75);
  });

  it("respects min/max and clamps the arc", () => {
    const { rerender } = render(<ProgressCircle value={15} min={10} max={20} aria-label="A" />);
    const bar = screen.getByRole("progressbar");
    const circumference = 2 * Math.PI * 22;
    expect(parseFloat(parts(bar).indicator.style.strokeDashoffset)).toBeCloseTo(circumference / 2);
    rerender(<ProgressCircle value={50} min={10} max={20} aria-label="A" />);
    expect(parseFloat(parts(bar).indicator.style.strokeDashoffset)).toBeCloseTo(0);
  });

  it("applies tone variants", () => {
    render(<ProgressCircle value={90} tone="warning" aria-label="Lager" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("data-variant", "warning");
    expect(parts(bar).indicator).toHaveClass("stroke-pui-warning");
    expect(parts(bar).indicator).not.toHaveClass("stroke-pui-primary");
  });

  it("supports named and numeric sizes and a custom thickness", () => {
    const { rerender } = render(<ProgressCircle value={10} size="lg" aria-label="A" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveClass("size-16");
    expect(parts(bar).track).toHaveAttribute("stroke-width", "5");
    rerender(<ProgressCircle value={10} size={80} thickness={8} aria-label="A" />);
    expect(bar).toHaveAttribute("data-size", "custom");
    expect(bar).not.toHaveClass("size-16");
    expect(bar.style.width).toBe("80px");
    expect(bar.style.height).toBe("80px");
    expect(parts(bar).svg).toHaveAttribute("viewBox", "0 0 80 80");
    expect(parts(bar).track).toHaveAttribute("stroke-width", "8");
    expect(parts(bar).track).toHaveAttribute("r", "36");
  });

  it("shows the formatted value in the centre, with locale", () => {
    render(<ProgressCircle value={1234.5} max={2000} format={{ maximumFractionDigits: 1 }} locale="de-DE" showValue aria-label="A" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuetext", "1.234,5");
    const value = bar.querySelector('[data-slot="progress-circle-value"]')!;
    expect(value).toHaveTextContent("1.234,5");
    expect(value.parentElement).toHaveAttribute("data-slot", "progress-circle-content");
  });

  it("renders children instead of the value", () => {
    render(
      <ProgressCircle value={40} showValue aria-label="A">
        <span>HP</span>
      </ProgressCircle>,
    );
    expect(screen.getByText("HP")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="progress-circle-value"]')).toBeNull();
  });

  it("supports a value render function via ProgressCircleValue", () => {
    render(
      <ProgressCircle value={3} max={5} aria-label="A">
        <ProgressCircleValue>{(_, value) => `${value}/5`}</ProgressCircleValue>
      </ProgressCircle>,
    );
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("value={null} is indeterminate with a spinning, reduced-motion-aware arc", () => {
    render(<ProgressCircle value={null} aria-label="Lädt" />);
    const bar = screen.getByRole("progressbar", { name: "Lädt" });
    expect(bar).toHaveAttribute("data-indeterminate");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    const { svg, indicator } = parts(bar);
    expect(svg).toHaveClass("motion-safe:animate-spin");
    expect(indicator).toHaveAttribute("data-indeterminate");
    expect(indicator).toHaveClass(
      "motion-reduce:data-[indeterminate]:[stroke-dashoffset:0]",
      "motion-reduce:data-[indeterminate]:opacity-50",
    );
    expect(indicator.style.strokeDashoffset).toBe("");
    expect(indicator).toHaveAttribute("stroke-dashoffset");
  });

  it("merges className (also the function form), style and part classes; forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <ProgressCircle
        ref={ref}
        value={100}
        size={40}
        aria-label="A"
        className={(state) => `is-${state.status} text-sm`}
        style={{ margin: 4 }}
        trackClassName="stroke-pui-border"
        indicatorClassName="stroke-pui-info"
      />,
    );
    const bar = screen.getByRole("progressbar");
    expect(ref.current).toBe(bar);
    expect(bar).toHaveClass("is-complete", "text-sm", "inline-flex");
    expect(bar).not.toHaveClass("text-xs");
    expect(bar.style.margin).toBe("4px");
    expect(bar.style.width).toBe("40px");
    expect(parts(bar).track).toHaveClass("stroke-pui-border");
    expect(parts(bar).track).not.toHaveClass("stroke-pui-muted");
    expect(parts(bar).indicator).toHaveClass("stroke-pui-info");
    expect(parts(bar).indicator).not.toHaveClass("stroke-pui-primary");
  });
});
