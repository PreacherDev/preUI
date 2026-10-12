import { describe, expect, it } from "vitest";
import { controlCharacterKey } from "./control-key-guard";

const key = (key: string, init: KeyboardEventInit = {}) => new KeyboardEvent("keydown", { key, ...init });

describe("controlCharacterKey", () => {
  it.each([
    ["\u0001", "KeyA", "a"],
    ["\u0006", "KeyF", "f"],
    ["\u001a", "KeyZ", "z"],
    ["\u0019", "KeyY", "y"],
  ])("Ctrl + %j (%s) is the letter %s", (char, code, expected) => {
    expect(controlCharacterKey(key(char, { code, ctrlKey: true }))).toBe(expected);
  });

  it("takes letters from the control character, so the keyboard layout counts (German Z sits on KeyY)", () => {
    expect(controlCharacterKey(key("\u001a", { code: "KeyY", ctrlKey: true }))).toBe("z");
  });

  it("reads digits and punctuation from event.code", () => {
    expect(controlCharacterKey(key("\u001f", { code: "Slash", ctrlKey: true }))).toBe("/");
    expect(controlCharacterKey(key("\u001b", { code: "BracketLeft", ctrlKey: true }))).toBe("[");
    expect(controlCharacterKey(key("\u0000", { code: "Digit2", ctrlKey: true }))).toBe("2");
    expect(controlCharacterKey(key("\u0000", { code: "Space", ctrlKey: true }))).toBe(" ");
  });

  it("also repairs Cmd (metaKey)", () => {
    expect(controlCharacterKey(key("\u0001", { code: "KeyA", metaKey: true }))).toBe("a");
  });

  it.each([
    ["a normal Ctrl+A", key("a", { code: "KeyA", ctrlKey: true })],
    ["a control character without Ctrl", key("\u0001", { code: "KeyA" })],
    ["Ctrl+Enter", key("Enter", { code: "Enter", ctrlKey: true })],
    ["Ctrl+Backspace as \b with a non-letter code", key("\u0008", { code: "Backspace", ctrlKey: true })],
    ["an unknown code", key("\u001c", { code: "IntlBackslash", ctrlKey: true })],
  ])("leaves %s alone", (_, event) => {
    expect(controlCharacterKey(event)).toBeNull();
  });
});
