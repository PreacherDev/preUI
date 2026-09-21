import { render, screen } from "@testing-library/react";
import { Meter, MeterLabel, MeterValue } from "./Meter";

describe("Meter", () => {
  it("renders a meter with track and indicator", () => {
    render(<Meter value={30} aria-label="Speicher" />);
    const meter = screen.getByRole("meter", { name: "Speicher" });
    expect(meter).toHaveAttribute("aria-valuenow", "30");
    const track = meter.querySelector(".bg-pui-muted")!;
    expect(track).toHaveClass("h-1", "rounded-full");
    const indicator = track.firstElementChild as HTMLElement;
    expect(indicator).toHaveClass("bg-pui-primary");
    expect(indicator.style.width).toBe("30%");
  });

  it("applies tone variants", () => {
    render(<Meter value={95} tone="negative" aria-label="Kontingent" />);
    const indicator = screen.getByRole("meter").querySelector(".bg-pui-muted")!.firstElementChild;
    expect(indicator).toHaveClass("bg-pui-negative");
  });

  it("renders label and value parts", () => {
    render(
      <Meter value={64}>
        <MeterLabel>Speicherplatz</MeterLabel>
        <MeterValue>{(formatted) => `${formatted} belegt`}</MeterValue>
      </Meter>,
    );
    expect(screen.getByRole("meter", { name: "Speicherplatz" })).toBeInTheDocument();
    expect(screen.getByText(/belegt/)).toHaveClass("ml-auto");
  });

  it("merges className, including the function form", () => {
    render(
      <Meter value={10} aria-label="Test" className={() => "custom w-40"} indicatorClassName="bg-pui-info" />,
    );
    const meter = screen.getByRole("meter");
    expect(meter).toHaveClass("custom", "w-40");
    expect(meter).not.toHaveClass("w-full");
    const indicator = meter.querySelector(".bg-pui-muted")!.firstElementChild;
    expect(indicator).toHaveClass("bg-pui-info");
    expect(indicator).not.toHaveClass("bg-pui-primary");
  });

  it("marks root, track and indicator with data-slot and the tone as data-variant", () => {
    render(<Meter value={95} tone="negative" aria-label="Kontingent" />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("data-slot", "meter");
    expect(meter).toHaveAttribute("data-variant", "negative");
    const track = meter.querySelector("[data-slot=meter-track]")!;
    expect(track).toBeInTheDocument();
    const indicator = track.querySelector("[data-slot=meter-indicator]")!;
    expect(indicator).toHaveClass("duration-pui-slow", "ease-pui");
  });
});
