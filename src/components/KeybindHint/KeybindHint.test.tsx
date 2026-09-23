import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { createRef } from "react";
import { KeybindHint, KeybindHintBar } from "./KeybindHint";

describe("KeybindHint", () => {
  it("renders a key cap and a label", () => {
    render(<KeybindHint keys="E" label="Interagieren" data-testid="hint" />);
    const hint = screen.getByTestId("hint");
    expect(hint).toHaveAttribute("data-slot", "keybind-hint");
    expect(hint).toHaveClass("inline-flex", "items-center", "gap-2", "text-sm");
    const key = screen.getByText("E");
    expect(key.tagName).toBe("KBD");
    expect(key).toHaveAttribute("data-slot", "keybind-hint-key");
    expect(key).toHaveClass("bg-pui-muted", "rounded-pui-sm");
    expect(key.parentElement).toHaveAttribute("data-slot", "keybind-hint-keys");
    expect(screen.getByText("Interagieren")).toHaveAttribute("data-slot", "keybind-hint-label");
    expect(hint.querySelector('[data-slot="keybind-hint-separator"]')).toBeNull();
  });

  it("joins multiple keys with the separator", () => {
    const { rerender } = render(<KeybindHint keys={["Shift", "F"]} label="Sprinten" data-testid="hint" />);
    const hint = screen.getByTestId("hint");
    expect(hint.querySelectorAll("[data-slot=keybind-hint-key]")).toHaveLength(2);
    const separators = hint.querySelectorAll("[data-slot=keybind-hint-separator]");
    expect(separators).toHaveLength(1);
    expect(separators[0]).toHaveTextContent("+");
    expect(hint.querySelector("[data-slot=keybind-hint-keys]")).toHaveTextContent("Shift+F");

    rerender(<KeybindHint keys={["Strg", "Alt", "Entf"]} separator="/" data-testid="hint" />);
    expect(hint.querySelectorAll("[data-slot=keybind-hint-separator]")).toHaveLength(2);
    expect(hint.querySelector("[data-slot=keybind-hint-keys]")).toHaveTextContent("Strg/Alt/Entf");
    expect(hint.querySelector("[data-slot=keybind-hint-label]")).toBeNull();

    rerender(<KeybindHint keys={["W", "A", "S", "D"]} separator={null} data-testid="hint" />);
    expect(hint.querySelectorAll("[data-slot=keybind-hint-separator]")).toHaveLength(0);
    expect(hint.querySelectorAll("[data-slot=keybind-hint-key]")).toHaveLength(4);
  });

  it("merges className and keyClassName; forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<KeybindHint ref={ref} keys="G" label="Motor" className="gap-3 text-xs" keyClassName="px-2" data-testid="hint" />);
    const hint = screen.getByTestId("hint");
    expect(ref.current).toBe(hint);
    expect(hint).toHaveClass("gap-3", "text-xs");
    expect(hint).not.toHaveClass("gap-2", "text-sm");
    expect(screen.getByText("G")).toHaveClass("px-2");
    expect(screen.getByText("G")).not.toHaveClass("px-1");
  });
});

describe("KeybindHint interactive + size", () => {
  it("renders as a button through `render`, with hover/focus styles, and clicks on the key cap work", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const ref = createRef<HTMLDivElement>();
    render(
      <KeybindHint
        ref={ref}
        render={<button type="button" onClick={onClick} aria-pressed={true} />}
        keys="F1"
        label="Garage öffnen"
        className="rounded-full"
      />,
    );
    const button = screen.getByRole("button", { name: /Garage öffnen/ });
    expect(button).toBe(ref.current);
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("data-slot", "keybind-hint");
    expect(button).toHaveAttribute("data-interactive", "");
    expect(button).toHaveClass(
      "hover:bg-pui-accent",
      "focus-visible:ring-pui-ring",
      "aria-pressed:bg-pui-primary/tint",
      "px-2.5",
      "rounded-full",
    );
    expect(button).not.toHaveClass("rounded-pui-md");
    await user.click(button);
    // Kbd is pointer-events-none: in a browser a click on it hits the button; dispatching on it bubbles up too.
    expect(screen.getByText("F1")).toHaveClass("pointer-events-none");
    await userEvent.setup({ pointerEventsCheck: 0 }).click(screen.getByText("F1"));
    await user.click(screen.getByText("Garage öffnen"));
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("activates with the keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<KeybindHint render={<button type="button" onClick={onClick} />} keys="Z" label="Rad" />);
    screen.getByRole("button").focus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("has a compact sm size", () => {
    render(<KeybindHint size="sm" keys={["Shift", "E"]} label="Tür" data-testid="hint" keyClassName="font-mono" />);
    const hint = screen.getByTestId("hint");
    expect(hint).toHaveAttribute("data-size", "sm");
    expect(hint).toHaveClass("text-xs", "gap-1.5");
    expect(hint).not.toHaveClass("px-2");
    expect(hint).not.toHaveClass("text-sm", "gap-2");
    const key = screen.getByText("Shift");
    expect(key).toHaveClass("h-4", "min-w-4", "text-pui-2xs", "font-mono");
    expect(key).not.toHaveClass("h-5", "text-xs");
  });

  it("defaults to size default, not interactive", () => {
    render(<KeybindHint keys="E" data-testid="hint" />);
    expect(screen.getByTestId("hint")).toHaveAttribute("data-size", "default");
    expect(screen.getByTestId("hint")).not.toHaveAttribute("data-interactive");
    expect(screen.getByTestId("hint")).not.toHaveClass("hover:bg-pui-accent", "px-2.5");
    expect(screen.getByText("E")).toHaveClass("h-5");
  });
});

describe("KeybindHintBar", () => {
  it("renders another element through `render`", () => {
    render(
      <KeybindHintBar render={<footer />} variant="surface" gap={8} data-testid="bar">
        <KeybindHint keys="E" label="Interagieren" />
      </KeybindHintBar>,
    );
    const bar = screen.getByTestId("bar");
    expect(bar.tagName).toBe("FOOTER");
    expect(bar).toHaveAttribute("data-slot", "keybind-hint-bar");
    expect(bar).toHaveClass("bg-pui-card/80");
    expect(bar.style.gap).toBe("8px");
  });

  it("defaults to a plain horizontal bar", () => {
    render(
      <KeybindHintBar aria-label="Steuerung" role="group">
        <KeybindHint keys="E" label="Interagieren" />
        <KeybindHint keys="F" label="Einsteigen" />
      </KeybindHintBar>,
    );
    const bar = screen.getByRole("group", { name: "Steuerung" });
    expect(bar).toHaveAttribute("data-slot", "keybind-hint-bar");
    expect(bar).toHaveAttribute("data-orientation", "horizontal");
    expect(bar).toHaveAttribute("data-variant", "default");
    expect(bar).toHaveClass("flex", "flex-row", "items-center", "gap-x-4");
    expect(bar).not.toHaveClass("bg-pui-card/80");
    expect(bar.children).toHaveLength(2);
  });

  it("supports vertical orientation and the surface variant", () => {
    const { rerender } = render(<KeybindHintBar variant="surface" data-testid="bar" />);
    const bar = screen.getByTestId("bar");
    expect(bar).toHaveClass("bg-pui-card/80", "border-pui-border", "rounded-full", "px-4");
    rerender(<KeybindHintBar variant="surface" orientation="vertical" data-testid="bar" />);
    expect(bar).toHaveAttribute("data-orientation", "vertical");
    expect(bar).toHaveAttribute("data-variant", "surface");
    expect(bar).toHaveClass("flex-col", "rounded-pui", "items-start");
    expect(bar).not.toHaveClass("rounded-full", "flex-row");
  });

  it("applies gap, merges className and style", () => {
    const ref = createRef<HTMLDivElement>();
    render(<KeybindHintBar ref={ref} gap={24} style={{ opacity: 0.5 }} className="gap-x-8 p-2" data-testid="bar" />);
    const bar = screen.getByTestId("bar");
    expect(ref.current).toBe(bar);
    expect(bar.style.gap).toBe("24px");
    expect(bar.style.opacity).toBe("0.5");
    expect(bar).toHaveClass("gap-x-8", "p-2");
    expect(bar).not.toHaveClass("gap-x-4");
  });
});
