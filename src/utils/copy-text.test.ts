import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./copy-text";

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");

afterEach(() => {
  if (original) Object.defineProperty(navigator, "clipboard", original);
  else delete (navigator as { clipboard?: unknown }).clipboard;
  vi.restoreAllMocks();
});

describe("copyText", () => {
  it("uses the Clipboard API when there is one", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await copyText("PUI1.abc")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("PUI1.abc");
  });

  it("falls back to a hidden textarea and execCommand (FiveM's CEF has no navigator.clipboard)", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    let selected = "";
    document.execCommand = vi.fn(() => {
      selected = (document.activeElement as HTMLTextAreaElement | null)?.value ?? document.querySelector("textarea")?.value ?? "";
      return true;
    });
    expect(await copyText("Kontonummer 123")).toBe(true);
    expect(selected).toBe("Kontonummer 123");
    // The helper textarea is gone again.
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("reports false when neither works", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true });
    document.execCommand = vi.fn(() => false);
    expect(await copyText("x")).toBe(false);
  });
});
