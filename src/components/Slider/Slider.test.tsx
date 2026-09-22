import { fireEvent, render, screen } from "@testing-library/react";
import { Slider, SliderLabel, SliderValue } from "./Slider";

describe("Slider", () => {
  it("renders one thumb with track and indicator styles", () => {
    const { container } = render(<Slider defaultValue={40} thumbLabels={["Lautstärke"]} />);
    const input = screen.getByRole("slider", { name: "Lautstärke" });
    expect(input).toHaveAttribute("aria-valuenow", "40");
    expect(container.querySelector(".bg-pui-muted")).toHaveClass("h-1", "rounded-full");
    expect(container.querySelector(".bg-pui-primary")).not.toBeNull();
    expect(input.parentElement).toHaveClass("size-4", "rounded-full", "bg-pui-thumb");
  });

  it("uses the plain 1px focus ring on the thumb (no offset, like every other control)", () => {
    render(<Slider defaultValue={40} thumbLabels={["Lautstärke"]} />);
    const thumb = screen.getByRole("slider").parentElement!;
    expect(thumb).toHaveClass("has-[:focus-visible]:ring-pui", "has-[:focus-visible]:ring-pui-ring");
    expect(thumb.className).not.toMatch(/ring-offset/);
  });

  it("renders a thumb per value for ranges", () => {
    render(<Slider defaultValue={[20, 80]} thumbLabels={["Minimum", "Maximum"]} />);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
    expect(screen.getByRole("slider", { name: "Minimum" })).toHaveAttribute("aria-valuenow", "20");
    expect(screen.getByRole("slider", { name: "Maximum" })).toHaveAttribute("aria-valuenow", "80");
  });

  it("changes the value with the keyboard", () => {
    const onValueChange = vi.fn();
    render(<Slider defaultValue={40} step={5} thumbLabels={["Wert"]} onValueChange={onValueChange} />);
    const input = screen.getByRole("slider");
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenCalledWith(45, expect.anything());
    expect(input).toHaveAttribute("aria-valuenow", "45");
  });

  it("renders label and value children", () => {
    render(
      <Slider defaultValue={30}>
        <SliderLabel>Rabatt</SliderLabel>
        <SliderValue />
      </Slider>,
    );
    expect(screen.getByText("Rabatt")).toHaveClass("text-xs", "font-medium");
    expect(screen.getByRole("slider", { name: "Rabatt" })).toBeInTheDocument();
    expect(screen.getByText("30")).toHaveClass("tabular-nums");
  });

  it("merges className, including the function form", () => {
    const { container } = render(
      <Slider
        defaultValue={10}
        className={(state) => (state.disabled ? "is-off" : "is-on")}
        trackClassName="h-2"
      />,
    );
    expect(container.firstChild).toHaveClass("is-on", "flex");
    const track = container.querySelector(".bg-pui-muted");
    expect(track).toHaveClass("h-2");
    expect(track).not.toHaveClass("h-1");
  });

  it("is disabled", () => {
    const { container } = render(<Slider defaultValue={10} disabled thumbLabels={["Wert"]} />);
    expect(screen.getByRole("slider")).toBeDisabled();
    expect(container.firstChild).toHaveAttribute("data-disabled");
  });
});

describe("Slider data attributes", () => {
  it("marks every part with data-slot", () => {
    const { container } = render(
      <Slider defaultValue={40} thumbLabels={["Lautstärke"]}>
        <SliderLabel>Lautstärke</SliderLabel>
        <SliderValue />
      </Slider>,
    );
    for (const slot of ["slider", "slider-control", "slider-track", "slider-indicator", "slider-thumb", "slider-label", "slider-value"]) {
      expect(container.querySelector(`[data-slot=${slot}]`)).not.toBeNull();
    }
  });
});
