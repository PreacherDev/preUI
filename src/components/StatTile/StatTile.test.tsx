import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "./StatTile";

describe("StatTile", () => {
  it("renders label, value and hint on a flat bordered tile", () => {
    const { container } = render(<StatTile label="Kontostand" value="12.480 $" hint="+12 % zu den letzten 30 Tagen" />);
    const tile = container.querySelector("[data-slot=stat-tile]");
    expect(tile).toHaveClass("rounded-pui", "border-pui-border", "bg-pui-card");
    expect(tile).toHaveAttribute("data-variant", "neutral");
    expect(screen.getByText("Kontostand")).toHaveAttribute("data-slot", "stat-tile-label");
    expect(screen.getByText("12.480 $")).toHaveAttribute("data-slot", "stat-tile-value");
    expect(container.querySelector("[data-slot=stat-tile-hint]")).toHaveClass("min-h-5");
  });

  it("reserves the hint line without a hint, and drops it with reserveHint={false}", () => {
    const { container, rerender } = render(<StatTile label="Umsatz" value="0 $" />);
    expect(container.querySelector("[data-slot=stat-tile-hint]")).toHaveClass("min-h-5");
    rerender(<StatTile label="Umsatz" value="0 $" reserveHint={false} />);
    expect(container.querySelector("[data-slot=stat-tile-hint]")).toBeNull();
  });

  it("tones the chip and the hint, and names the trend arrow", () => {
    const { container } = render(
      <StatTile
        label="Ausgaben"
        value="420 $"
        hint="weniger als im Vormonat"
        tone="positive"
        trend="down"
        trendLabels={{ up: "Steigend", down: "Fallend", flat: "Unverändert" }}
        icon={<svg data-testid="icon" />}
      />,
    );
    expect(container.querySelector("[data-slot=stat-tile]")).toHaveAttribute("data-variant", "positive");
    expect(container.querySelector("[data-slot=stat-tile-icon]")).toHaveClass("bg-pui-positive/tint", "text-pui-positive");
    expect(container.querySelector("[data-slot=stat-tile-hint]")).toHaveClass("text-pui-positive");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Fallend")).toHaveClass("sr-only");
  });

  it("renders the sparkline and action slots and merges className", () => {
    const { container } = render(
      <StatTile
        label="Buchungen"
        value="128"
        className="w-64"
        sparkline={<svg data-testid="spark" />}
        action={<button type="button">Details</button>}
      />,
    );
    expect(container.querySelector("[data-slot=stat-tile]")).toHaveClass("w-64");
    expect(container.querySelector("[data-slot=stat-tile-sparkline]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(screen.getByTestId("spark")).toBeInTheDocument();
  });

  it("switches the value to monospace", () => {
    render(<StatTile label="IBAN" value="DE12 3456" mono />);
    expect(screen.getByText("DE12 3456")).toHaveClass("font-mono");
  });
});
