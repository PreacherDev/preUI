import { afterEach, describe, expect, it, vi } from "vitest";
import { installAltGrFix } from ".";

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

function field() {
  const input = document.createElement("input");
  document.body.append(input);
  input.focus();
  return input;
}

const altGr = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { key, ctrlKey: true, altKey: true, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

describe("installAltGrFix", () => {
  it("types an AltGr symbol the browser dropped, once, and fires input", () => {
    vi.useFakeTimers();
    uninstall = installAltGrFix();
    const input = field();
    const onInput = vi.fn();
    input.addEventListener("input", onInput);
    altGr(input, "@");
    vi.advanceTimersByTime(60);
    expect(input.value).toBe("@");
    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it("leaves it alone when the browser typed it, the field handled the key, or it is no AltGr symbol", () => {
    vi.useFakeTimers();
    uninstall = installAltGrFix();
    const input = field();
    // Browser typed it: an input event arrives within the delay.
    altGr(input, "{");
    input.value = "{";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    // Field handled it (e.g. the CodeEditor): default prevented.
    altGr(input, "[").preventDefault();
    // Shortcuts and plain keys.
    altGr(input, "k");
    altGr(input, "2");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "@", bubbles: true }));
    vi.advanceTimersByTime(60);
    expect(input.value).toBe("{");
  });

  it("ignores read-only and non-text fields and can be removed", () => {
    vi.useFakeTimers();
    uninstall = installAltGrFix();
    expect(installAltGrFix()).toBe(uninstall); // installing twice has no extra effect
    const input = field();
    input.readOnly = true;
    altGr(input, "€");
    vi.advanceTimersByTime(60);
    expect(input.value).toBe("");
    uninstall();
    uninstall = undefined;
    input.readOnly = false;
    altGr(input, "€");
    vi.advanceTimersByTime(60);
    expect(input.value).toBe("");
  });
});
