import { describe, expect, it } from "vitest";
import { isAltGrCharacter } from "./altgr-guard";

const key = (key: string, init: KeyboardEventInit = {}) => new KeyboardEvent("keydown", { key, ...init });
const altGr = { ctrlKey: true, altKey: true };

describe("isAltGrCharacter", () => {
  it.each(["{", "[", "]", "}", "\\", "@", "€", "~", "|", "²", "³", "µ"])("AltGr %s (Ctrl+Alt on Windows) is typing", (char) => {
    expect(isAltGrCharacter(key(char, altGr))).toBe(true);
  });

  it("also recognises the AltGraph modifier state", () => {
    const event = key("@");
    Object.defineProperty(event, "getModifierState", { value: (name: string) => name === "AltGraph" });
    expect(isAltGrCharacter(event)).toBe(true);
  });

  it.each([
    ["Ctrl+Alt+K (letter shortcut)", key("k", altGr)],
    ["Ctrl+Alt+2 (digit shortcut)", key("2", altGr)],
    ["Ctrl+[ (no Alt)", key("[", { ctrlKey: true })],
    ["plain [", key("[")],
    ["Ctrl+Alt+Enter", key("Enter", altGr)],
    ["Ctrl+Alt+Space", key(" ", altGr)],
    ["Cmd+Alt+[ (macOS)", key("[", { ...altGr, metaKey: true })],
  ])("%s is not", (_, event) => {
    expect(isAltGrCharacter(event)).toBe(false);
  });
});
