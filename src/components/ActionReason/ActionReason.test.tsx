import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActionReason } from "./ActionReason";

describe("ActionReason", () => {
  it("shows a quiet hint and keeps the line's height when there is none", () => {
    const { container, rerender } = render(<ActionReason>Gib einen Betrag ein</ActionReason>);
    const slot = container.querySelector("[data-slot=action-reason]");
    expect(slot).toHaveAttribute("data-kind", "hint");
    expect(slot).toHaveClass("min-h-6", "text-pui-muted-foreground");
    expect(screen.getByText("Gib einen Betrag ein")).toBeInTheDocument();

    rerender(<ActionReason>{null}</ActionReason>);
    // The empty slot stays in the layout, so the buttons below never move.
    expect(container.querySelector("[data-slot=action-reason]")).toHaveClass("min-h-6");
    expect(container.querySelector("[data-slot=action-reason]")?.textContent).toBe("");
  });

  it("renders nothing without a reason when reserve is off", () => {
    const { container } = render(
      <ActionReason reserve={false}>
        {null}
      </ActionReason>,
    );
    expect(container.querySelector("[data-slot=action-reason]")).toBeNull();
  });

  it("colours invalid and blocked differently and adds their icon", () => {
    const { container, rerender } = render(<ActionReason kind="invalid">Betrag zu hoch</ActionReason>);
    expect(container.querySelector("[data-slot=action-reason]")).toHaveClass("text-pui-negative");
    expect(container.querySelector("svg")).not.toBeNull();

    rerender(<ActionReason kind="blocked">Dein Rang darf kein Geld senden</ActionReason>);
    expect(container.querySelector("[data-slot=action-reason]")).toHaveClass("text-pui-warning");
    expect(screen.getByText("Dein Rang darf kein Geld senden")).toBeInTheDocument();
  });

  it("drops the icon with icon={null}", () => {
    const { container } = render(
      <ActionReason kind="invalid" icon={null}>
        Betrag zu hoch
      </ActionReason>,
    );
    expect(container.querySelector("svg")).toBeNull();
  });

  it("renders a badge, with the reason readable for screen readers while revealed on hover", () => {
    const { container } = render(
      <ActionReason kind="blocked" reveal="hover" revealGroup>
        Gesperrt bis morgen
      </ActionReason>,
    );
    const slot = container.querySelector("[data-slot=action-reason]");
    expect(slot).toHaveAttribute("data-variant", "badge");
    const badge = container.querySelector("[data-slot=badge]");
    expect(badge).toHaveAttribute("data-variant", "warning");
    expect(badge).toHaveAttribute("data-reveal", "hover");
    expect(screen.getByText("Gesperrt bis morgen")).toBeInTheDocument();
  });

  it("merges className and passes through div props", () => {
    const { container } = render(
      <ActionReason className="mt-2" data-testid="reason" role="status">
        Hinweis
      </ActionReason>,
    );
    expect(screen.getByTestId("reason")).toHaveClass("mt-2", "min-h-6");
    expect(container.querySelector("[role=status]")).not.toBeNull();
  });
});
