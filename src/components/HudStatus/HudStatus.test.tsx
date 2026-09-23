import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import {
  HudSpeedometer,
  HudStatus,
  HudStatusGroup,
  getHudStatusLevel,
  useHudStatus,
  type HudStatusState,
  type UseHudStatusOptions,
} from "./HudStatus";

const Icon = <svg data-testid="icon" />;

function slot(root: Element, name: string) {
  return root.querySelector<HTMLElement>(`[data-slot="${name}"]`);
}

describe("HudStatus", () => {
  it("ring: renders a ProgressCircle with aria values and the icon in the centre", () => {
    const { container } = render(<HudStatus value={72} icon={Icon} label="Health" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-slot", "hud-status");
    expect(root).toHaveAttribute("data-variant", "ring");
    expect(root).toHaveAttribute("data-tone", "primary");
    expect(root).not.toHaveAttribute("data-level");
    const bar = screen.getByRole("progressbar", { name: "Health" });
    expect(bar).toHaveAttribute("data-slot", "progress-circle");
    expect(bar).toHaveAttribute("aria-valuenow", "72");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
    expect(bar).toHaveAttribute("aria-valuetext", "72");
    const icon = slot(bar, "hud-status-icon")!;
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toContainElement(screen.getByTestId("icon"));
    expect(icon).toHaveClass("[&_svg]:size-5", "text-pui-primary");
    const indicator = slot(bar, "progress-circle-indicator")!;
    expect(indicator).toHaveClass("transition-[stroke-dashoffset]", "duration-pui-base");
    expect(indicator).not.toHaveClass("transition-all", "duration-pui-slow");
  });

  it("bar: renders a meter with icon, track and width-based indicator", () => {
    render(<HudStatus variant="bar" value={40} icon={Icon} label="Armour" tone="positive" />);
    const meter = screen.getByRole("meter", { name: "Armour" });
    expect(meter).toHaveAttribute("aria-valuenow", "40");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("data-variant", "bar");
    const indicator = slot(meter, "hud-status-indicator")!;
    expect(indicator.style.width).toBe("40%");
    expect(indicator).toHaveClass("bg-pui-positive", "transition-[width]", "duration-pui-base");
    expect(slot(meter, "hud-status-track")).toHaveClass("bg-pui-muted");
    expect(slot(meter, "hud-status-value")).toBeNull();
  });

  it("pill: shows icon and value by default", () => {
    render(<HudStatus variant="pill" value={55.6} icon={Icon} label="Thirst" size="sm" />);
    const meter = screen.getByRole("meter", { name: "Thirst" });
    expect(meter).toHaveAttribute("data-size", "sm");
    expect(meter).toHaveClass("rounded-full", "bg-pui-card/80");
    expect(slot(meter, "hud-status-value")).toHaveTextContent("56");
    expect(meter).toHaveAttribute("aria-valuetext", "56");
  });

  it("thresholds switch tone and data-level", () => {
    const { rerender } = render(
      <HudStatus variant="bar" value={50} label="Hunger" warnBelow={20} criticalBelow={10} icon={Icon} />,
    );
    const meter = screen.getByRole("meter");
    expect(meter).not.toHaveAttribute("data-level");
    rerender(<HudStatus variant="bar" value={15} label="Hunger" warnBelow={20} criticalBelow={10} icon={Icon} />);
    expect(meter).toHaveAttribute("data-level", "warning");
    expect(meter).toHaveAttribute("data-tone", "warning");
    expect(slot(meter, "hud-status-indicator")).toHaveClass("bg-pui-warning");
    expect(slot(meter, "hud-status-icon")).toHaveClass("text-pui-warning");
    rerender(<HudStatus variant="bar" value={5} label="Hunger" warnBelow={20} criticalBelow={10} icon={Icon} />);
    expect(meter).toHaveAttribute("data-level", "critical");
    expect(slot(meter, "hud-status-indicator")).toHaveClass("bg-pui-negative");
    expect(meter).not.toHaveClass("motion-safe:animate-pulse");
    rerender(
      <HudStatus variant="bar" value={5} label="Hunger" warnBelow={20} criticalBelow={10} pulseWhenCritical />,
    );
    expect(meter).toHaveClass("motion-safe:animate-pulse");
  });

  it("thresholds above for stats where high is bad; ring tone follows the level", () => {
    render(<HudStatus value={90} label="Stress" warnAbove={60} criticalAbove={85} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("data-variant", "negative");
    expect(bar.parentElement).toHaveAttribute("data-level", "critical");
    expect(getHudStatusLevel(70, { warnAbove: 60, criticalAbove: 85 })).toBe("warning");
    expect(getHudStatusLevel(20, { warnBelow: 20 })).toBe("normal");
    expect(getHudStatusLevel(19, { warnBelow: 20 })).toBe("warning");
  });

  it("clamps values to 0 … max and supports a custom max", () => {
    const { rerender } = render(<HudStatus variant="bar" value={150} label="Oxygen" />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "100");
    expect(slot(meter, "hud-status-indicator")!.style.width).toBe("100%");
    rerender(<HudStatus variant="bar" value={-20} label="Oxygen" />);
    expect(meter).toHaveAttribute("aria-valuenow", "0");
    expect(slot(meter, "hud-status-indicator")!.style.width).toBe("0%");
    rerender(<HudStatus variant="bar" value={Number.NaN} label="Oxygen" />);
    expect(meter).toHaveAttribute("aria-valuenow", "0");
    rerender(<HudStatus variant="bar" value={30} max={40} label="Oxygen" showValue />);
    expect(meter).toHaveAttribute("aria-valuemax", "40");
    expect(slot(meter, "hud-status-indicator")!.style.width).toBe("75%");
    expect(slot(meter, "hud-status-value")).toHaveTextContent("30");
  });

  it("formats the value with locale and format", () => {
    render(
      <HudStatus
        variant="pill"
        value={1234.5}
        max={2000}
        label="Stamina"
        locale="de-DE"
        format={{ maximumFractionDigits: 1 }}
      />,
    );
    const meter = screen.getByRole("meter");
    expect(slot(meter, "hud-status-value")).toHaveTextContent("1.234,5");
    expect(meter).toHaveAttribute("aria-valuetext", "1.234,5");
  });

  it("shows a visible label with showLabel (hidden from AT, the name comes from aria-label)", () => {
    render(<HudStatus variant="bar" value={80} label="Stamina" showLabel showValue />);
    const meter = screen.getByRole("meter", { name: "Stamina" });
    const label = slot(meter, "hud-status-label")!;
    expect(label).toHaveTextContent("Stamina");
    expect(label.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(slot(meter, "hud-status-value")).toHaveTextContent("80");
  });

  it("ring shows value and label as a caption", () => {
    const { container } = render(<HudStatus value={33} label="Health" showValue showLabel locale="de-DE" />);
    const root = container.firstElementChild!;
    expect(slot(root, "hud-status-value")).toHaveTextContent("33");
    expect(slot(root, "hud-status-label")).toHaveTextContent("Health");
  });

  it("merges className and forwards the ref and props", () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <HudStatus ref={ref} variant="pill" value={10} label="A" className="px-6 extra" id="hp" hidden />,
    );
    const meter = screen.getByRole("meter", { hidden: true });
    expect(ref.current).toBe(meter);
    expect(meter).toHaveClass("px-6", "extra", "[&[hidden]]:hidden");
    expect(meter).not.toHaveClass("px-2.5");
    expect(meter).toHaveAttribute("id", "hp");
    expect(meter).toHaveAttribute("hidden");
    rerender(<HudStatus ref={ref} value={10} label="A" className="gap-3" />);
    expect(ref.current).toHaveAttribute("data-variant", "ring");
    expect(ref.current).toHaveClass("gap-3");
    expect(ref.current).not.toHaveClass("gap-1");
  });
});

describe("HudStatusGroup", () => {
  it("lays out horizontally by default and vertically on request", () => {
    const { rerender } = render(
      <HudStatusGroup aria-label="Status">
        <HudStatus value={1} label="A" />
      </HudStatusGroup>,
    );
    const group = screen.getByRole("group", { name: "Status" });
    expect(group).toHaveAttribute("data-slot", "hud-status-group");
    expect(group).toHaveAttribute("data-orientation", "horizontal");
    expect(group).toHaveClass("flex-row", "gap-3");
    rerender(
      <HudStatusGroup aria-label="Status" orientation="vertical" variant="surface" gap={10} className="p-4">
        <HudStatus value={1} label="A" />
      </HudStatusGroup>,
    );
    expect(group).toHaveAttribute("data-orientation", "vertical");
    expect(group).toHaveAttribute("data-variant", "surface");
    expect(group).toHaveClass("flex-col", "border-pui-border", "bg-pui-card/80", "p-4");
    expect(group).not.toHaveClass("px-3");
    expect(group.style.gap).toBe("10px");
  });
});

describe("HudSpeedometer", () => {
  it("renders speed, default unit and the arc", () => {
    render(<HudSpeedometer speed={120.6} />);
    const root = screen.getByRole("group", { name: "Speedometer" });
    expect(root).toHaveAttribute("data-slot", "hud-speedometer");
    expect(slot(root, "hud-speedometer-speed")).toHaveTextContent("121");
    expect(slot(root, "hud-speedometer-unit")).toHaveTextContent("km/h");
    expect(slot(root, "hud-speedometer-arc")).toHaveAttribute("aria-hidden", "true");
    const indicator = slot(root, "hud-speedometer-indicator")!;
    const arcLength = 2 * Math.PI * 44 * 0.75;
    expect(parseFloat(indicator.style.strokeDashoffset)).toBeCloseTo(arcLength * (1 - 120.6 / 240));
    expect(indicator).toHaveClass("stroke-pui-primary", "transition-[stroke-dashoffset]");
    expect(slot(root, "hud-speedometer-gear")).toBeNull();
  });

  it("formats with locale, custom unit, gear and fuel; clamps the arc", () => {
    render(
      <HudSpeedometer
        speed={1234.56}
        maxSpeed={300}
        unit="mph"
        locale="de-DE"
        format={{ maximumFractionDigits: 1 }}
        gear="R"
        gearLabel="Gang"
        fuel={8}
        fuelLabel="Tank"
        label="Tacho"
      />,
    );
    const root = screen.getByRole("group", { name: "Tacho" });
    expect(slot(root, "hud-speedometer-speed")).toHaveTextContent("1.234,6");
    expect(slot(root, "hud-speedometer-unit")).toHaveTextContent("mph");
    expect(slot(root, "hud-speedometer-gear")).toHaveTextContent("Gang R");
    expect(parseFloat(slot(root, "hud-speedometer-indicator")!.style.strokeDashoffset)).toBeCloseTo(0);
    const fuel = screen.getByRole("meter", { name: "Tank" });
    expect(fuel).toHaveAttribute("data-slot", "hud-speedometer-fuel");
    expect(fuel).toHaveAttribute("data-level", "critical");
  });

  it("without arc, negative speed shows 0; merges className and forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<HudSpeedometer ref={ref} speed={-5} showArc={false} className="gap-4 extra" />);
    const root = screen.getByRole("group");
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("gap-4", "extra");
    expect(root).not.toHaveClass("gap-2");
    expect(slot(root, "hud-speedometer-arc")).toBeNull();
    expect(slot(root, "hud-speedometer-readout")).not.toBeNull();
    expect(slot(root, "hud-speedometer-speed")).toHaveTextContent("0");
  });
});

describe("HudStatus customisation", () => {
  it("ring: numeric size and thickness go to the ring; the icon scales with it", () => {
    const { container } = render(<HudStatus value={50} icon={Icon} label="Health" size={80} thickness={8} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-size", "custom");
    const ring = screen.getByRole("progressbar", { name: "Health" });
    expect(ring.style.width).toBe("80px");
    expect(ring.style.height).toBe("80px");
    expect(slot(ring, "progress-circle-track")).toHaveAttribute("stroke-width", "8");
    const icon = slot(ring, "hud-status-icon")!;
    expect(icon).toHaveClass("[&_svg]:size-[var(--hud-status-icon-size)]");
    expect(icon.style.getPropertyValue("--hud-status-icon-size")).toBe("32px");
  });

  it("ring: thickness also works with named sizes", () => {
    render(<HudStatus value={50} label="Health" size="lg" thickness={2} />);
    const ring = screen.getByRole("progressbar");
    expect(ring).toHaveAttribute("data-size", "lg");
    expect(slot(ring, "progress-circle-track")).toHaveAttribute("stroke-width", "2");
  });

  it("bar and pill fall back to default sizing for numeric sizes; bar thickness sets the track height", () => {
    const { rerender } = render(<HudStatus variant="bar" value={50} label="A" size={70} thickness={6} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("data-size", "custom");
    expect(meter).toHaveClass("text-xs");
    const track = slot(meter, "hud-status-track")!;
    expect(track).toHaveClass("w-28");
    expect(track.style.height).toBe("6px");
    rerender(<HudStatus variant="pill" value={50} label="A" size={70} />);
    expect(screen.getByRole("meter")).toHaveClass("h-7");
  });

  it.each(["ring", "bar", "pill"] as const)("%s: merges classNames per part", (variant) => {
    const { container } = render(
      <HudStatus
        variant={variant}
        value={40}
        label="Armour"
        icon={Icon}
        showLabel
        showValue
        iconClassName="legacy-icon"
        classNames={{ root: "c-root", icon: "c-icon", track: "c-track", indicator: "c-indicator", value: "c-value", label: "c-label" }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass("c-root");
    expect(slot(root, "hud-status-icon")).toHaveClass("legacy-icon", "c-icon");
    expect(slot(root, "hud-status-value")).toHaveClass("c-value");
    expect(slot(root, "hud-status-label")).toHaveClass("c-label");
    if (variant === "ring") {
      expect(slot(root, "progress-circle-track")).toHaveClass("c-track");
      expect(slot(root, "progress-circle-indicator")).toHaveClass("c-indicator");
    } else if (variant === "bar") {
      expect(slot(root, "hud-status-track")).toHaveClass("c-track");
      expect(slot(root, "hud-status-indicator")).toHaveClass("c-indicator");
    }
  });

  it("classNames can override default tone classes", () => {
    render(<HudStatus variant="bar" value={40} label="A" classNames={{ indicator: "bg-pui-info" }} />);
    const indicator = slot(screen.getByRole("meter"), "hud-status-indicator")!;
    expect(indicator).toHaveClass("bg-pui-info");
    expect(indicator).not.toHaveClass("bg-pui-primary");
  });

  it("renderValue replaces the value text (and shows it by default); aria-valuetext stays formatted", () => {
    const renderValue = vi.fn(({ valueText, level, percent }: HudStatusState) => `${valueText} % ${level} ${percent}`);
    render(<HudStatus variant="bar" value={15} max={50} label="Hunger" warnBelow={20} renderValue={renderValue} />);
    const meter = screen.getByRole("meter");
    expect(slot(meter, "hud-status-value")).toHaveTextContent("15 % warning 30");
    expect(meter).toHaveAttribute("aria-valuetext", "15");
    expect(renderValue).toHaveBeenCalledWith(
      expect.objectContaining({ value: 15, max: 50, fraction: 0.3, tone: "warning", valueText: "15" }),
    );
  });

  it("renderValue respects showValue={false}", () => {
    render(<HudStatus variant="pill" value={15} label="Hunger" showValue={false} renderValue={() => "x"} />);
    expect(slot(screen.getByRole("meter"), "hud-status-value")).toBeNull();
  });
});

describe("useHudStatus", () => {
  function Custom(props: UseHudStatusOptions) {
    const status = useHudStatus(props);
    return (
      <div {...status.meterProps} data-level={status.level} data-tone={status.tone}>
        {status.percent}|{status.valueText}
      </div>
    );
  }

  it("returns percent, level, tone, valueText and meter props", () => {
    const { rerender } = render(<Custom value={45} label="Stress" warnAbove={40} criticalAbove={80} tone="muted" />);
    const meter = screen.getByRole("meter", { name: "Stress" });
    expect(meter).toHaveAttribute("aria-valuenow", "45");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-valuetext", "45");
    expect(meter).toHaveAttribute("data-level", "warning");
    expect(meter).toHaveAttribute("data-tone", "warning");
    expect(meter).toHaveTextContent("45|45");
    rerender(<Custom value={90} label="Stress" warnAbove={40} criticalAbove={80} />);
    expect(meter).toHaveAttribute("data-level", "critical");
    expect(meter).toHaveAttribute("data-tone", "negative");
    rerender(<Custom value={10} label="Stress" warnAbove={40} tone="muted" />);
    expect(meter).toHaveAttribute("data-level", "normal");
    expect(meter).toHaveAttribute("data-tone", "muted");
  });

  it("clamps, supports max, locale and format", () => {
    const { rerender } = render(<Custom value={2500.25} max={2000} locale="de-DE" format={{ maximumFractionDigits: 1 }} />);
    const meter = screen.getByRole("meter");
    expect(meter).not.toHaveAttribute("aria-label");
    expect(meter).toHaveAttribute("aria-valuenow", "2000");
    expect(meter).toHaveTextContent("100|2.000");
    rerender(<Custom value={Number.NaN} max={-1} />);
    expect(meter).toHaveAttribute("aria-valuemax", "0");
    expect(meter).toHaveTextContent("0|0");
  });
});

describe("HudSpeedometer customisation", () => {
  it("ticks: evenly spaced flat marks along the arc, both ends included", () => {
    const { container } = render(<HudSpeedometer speed={50} ticks={9} />);
    const ticks = container.querySelectorAll('[data-slot="hud-speedometer-tick"]');
    expect(ticks).toHaveLength(9);
    // First tick at 7:30 (135°), middle tick at 12 o'clock, last at 4:30.
    const first = ticks[0];
    expect(Number(first.getAttribute("x1"))).toBeLessThan(50);
    expect(Number(first.getAttribute("y1"))).toBeGreaterThan(50);
    const middle = ticks[4];
    expect(Number(middle.getAttribute("x1"))).toBeCloseTo(50);
    expect(Number(middle.getAttribute("y1"))).toBeLessThan(Number(middle.getAttribute("y2")));
    expect(Number(ticks[8].getAttribute("x1"))).toBeGreaterThan(50);
    expect(first).toHaveClass("stroke-pui-muted-foreground");
    const { container: none } = render(<HudSpeedometer speed={50} ticks={1} />);
    expect(none.querySelectorAll('[data-slot="hud-speedometer-tick"]')).toHaveLength(0);
  });

  it("redlineFrom draws a negative segment, colours ticks and the indicator inside it", () => {
    const { rerender } = render(<HudSpeedometer speed={100} maxSpeed={240} ticks={9} redlineFrom={180} />);
    const root = screen.getByRole("group");
    const redline = slot(root, "hud-speedometer-redline")!;
    expect(redline).toHaveClass("stroke-pui-negative/tint-border");
    const arcLength = 2 * Math.PI * 44 * 0.75;
    expect(redline.getAttribute("transform")).toBe("rotate(337.5 50 50)");
    expect(parseFloat(redline.getAttribute("stroke-dasharray")!)).toBeCloseTo(arcLength * 0.25, 2);
    const ticks = root.querySelectorAll('[data-slot="hud-speedometer-tick"]');
    // Ticks at 180, 210, 240 are in the redline.
    expect(root.querySelectorAll('[data-slot="hud-speedometer-tick"][data-redline]')).toHaveLength(3);
    expect(ticks[6]).toHaveClass("stroke-pui-negative");
    expect(ticks[5]).not.toHaveClass("stroke-pui-negative");
    expect(root).not.toHaveAttribute("data-redline");
    expect(slot(root, "hud-speedometer-indicator")).toHaveClass("stroke-pui-primary");
    rerender(<HudSpeedometer speed={200} maxSpeed={240} ticks={9} redlineFrom={180} />);
    expect(root).toHaveAttribute("data-redline");
    expect(slot(root, "hud-speedometer-indicator")).toHaveClass("stroke-pui-negative");
    rerender(<HudSpeedometer speed={200} maxSpeed={240} redlineFrom={300} />);
    expect(slot(root, "hud-speedometer-redline")).toBeNull();
    expect(root).not.toHaveAttribute("data-redline");
  });

  it("merges classNames per part and renderSpeed replaces the number", () => {
    render(
      <HudSpeedometer
        speed={123.4}
        gear={3}
        fuel={50}
        ticks={3}
        redlineFrom={200}
        renderSpeed={({ speedText, fraction, redline }) => `${speedText}!${fraction.toFixed(2)}${redline ? "R" : ""}`}
        classNames={{
          root: "c-root",
          dial: "c-dial",
          arc: "c-arc",
          track: "c-track",
          redline: "c-redline",
          indicator: "c-indicator",
          tick: "c-tick",
          readout: "c-readout",
          speed: "c-speed",
          unit: "c-unit",
          gear: "c-gear",
          fuel: "c-fuel",
        }}
      />,
    );
    const root = screen.getByRole("group");
    expect(root).toHaveClass("c-root");
    for (const part of ["dial", "arc", "track", "redline", "indicator", "tick", "speed", "unit", "gear"]) {
      expect(slot(root, `hud-speedometer-${part}`)).toHaveClass(`c-${part}`);
    }
    expect(slot(root, "hud-speedometer-speed")!.parentElement).toHaveClass("c-readout");
    expect(screen.getByRole("meter", { name: "Fuel" })).toHaveClass("c-fuel");
    expect(slot(root, "hud-speedometer-speed")).toHaveTextContent("123!0.51");
  });
});
