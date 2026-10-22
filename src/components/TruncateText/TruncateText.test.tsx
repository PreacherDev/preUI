import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "../Tooltip";
import { TruncateText } from "./TruncateText";

/** jsdom has no layout: give the element the sizes a browser would measure. */
function size(element: HTMLElement, { scrollWidth, clientWidth }: { scrollWidth: number; clientWidth: number }) {
  Object.defineProperty(element, "scrollWidth", { value: scrollWidth, configurable: true });
  Object.defineProperty(element, "clientWidth", { value: clientWidth, configurable: true });
  Object.defineProperty(element, "scrollHeight", { value: 16, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: 16, configurable: true });
}

describe("TruncateText", () => {
  it("shows the whole text as a tooltip while it is cut off", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <TruncateText data-testid="text">Toutes les modifications sont enregistrées</TruncateText>
      </TooltipProvider>,
    );
    const text = screen.getByTestId("text");
    expect(text).toHaveAttribute("data-slot", "truncate-text");
    expect(text).toHaveClass("truncate", "min-w-0");
    size(text, { scrollWidth: 300, clientWidth: 220 });
    await user.hover(text);
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent("Toutes les modifications sont enregistrées"),
    );
  });

  it("shows no tooltip while the text fits", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <TruncateText data-testid="text">Saved</TruncateText>
      </TooltipProvider>,
    );
    const text = screen.getByTestId("text");
    size(text, { scrollWidth: 40, clientWidth: 220 });
    await user.hover(text);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull();
  });

  it("clamps to several lines and passes props through", () => {
    render(
      <TruncateText lines={2} role="status" data-slot="editor-status" className="text-xs">
        Lang
      </TruncateText>,
    );
    const text = screen.getByRole("status");
    expect(text).toHaveAttribute("data-slot", "editor-status");
    expect(text).toHaveAttribute("data-lines", "2");
    expect(text).toHaveClass("text-xs", "overflow-hidden");
    expect(text).not.toHaveClass("truncate");
    expect(text.style.webkitLineClamp).toBe("2");
  });
});
