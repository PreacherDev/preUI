import { render, screen } from "@testing-library/react";
import { Progress, ProgressLabel, ProgressValue } from "./Progress";

describe("Progress", () => {
  it("renders a progressbar with track and indicator", () => {
    render(<Progress value={40} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("data-slot", "progress");
    expect(bar).toHaveAttribute("data-variant", "primary");
    const track = bar.querySelector(".bg-pui-muted")!;
    expect(track).toHaveClass("h-1", "rounded-full");
    expect(track).toHaveAttribute("data-slot", "progress-track");
    const indicator = track.firstElementChild as HTMLElement;
    expect(indicator).toHaveAttribute("data-slot", "progress-indicator");
    expect(indicator).toHaveClass("bg-pui-primary", "duration-pui-slow", "ease-pui");
    expect(indicator.style.width).toBe("40%");
  });

  it("applies tone variants", () => {
    render(<Progress value={90} tone="warning" aria-label="Lager" />);
    const indicator = screen.getByRole("progressbar").querySelector(".bg-pui-muted")!.firstElementChild;
    expect(indicator).toHaveClass("bg-pui-warning");
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-variant", "warning");
    expect(indicator).not.toHaveClass("bg-pui-primary");
  });

  it("renders label and value parts", () => {
    render(
      <Progress value={72}>
        <ProgressLabel>Lagerauslastung</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );
    expect(screen.getByRole("progressbar", { name: "Lagerauslastung" })).toBeInTheDocument();
    expect(screen.getByText("Lagerauslastung")).toHaveClass("text-xs");
    expect(screen.getByText("Lagerauslastung")).toHaveAttribute("data-slot", "progress-label");
    expect(screen.getByText(/72/)).toHaveAttribute("data-slot", "progress-value");
    expect(screen.getByText(/72/)).toHaveClass("ml-auto", "tabular-nums");
  });

  it("marks completion and indeterminate state", () => {
    const { rerender } = render(<Progress value={100} aria-label="Fertig" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-complete");
    rerender(<Progress value={null} aria-label="Fertig" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("data-indeterminate");
  });

  it("merges className, including the function form", () => {
    render(
      <Progress
        value={50}
        aria-label="Test"
        className={(state) => `is-${state.status}`}
        trackClassName="h-2"
      />,
    );
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveClass("is-progressing", "w-full");
    const track = bar.querySelector(".bg-pui-muted")!;
    expect(track).toHaveClass("h-2");
    expect(track).not.toHaveClass("h-1");
  });
});
