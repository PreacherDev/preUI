import { Prec } from "@codemirror/state";
import { EditorView, runScopeHandlers } from "@codemirror/view";

/** `event.code` of keys that don't name their character (US layout, like CodeMirror's own fallback tables). */
const codeKeys: Record<string, string> = {
  Slash: "/",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Minus: "-",
  Equal: "=",
  Comma: ",",
  Period: ".",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Space: " ",
};

/**
 * The key a Ctrl / Cmd shortcut meant when the browser reported it as an ASCII control character — FiveM's NUI
 * (CEF) sends e.g. Ctrl+A as `"\u0001"` instead of `"a"`, so no `Mod-a` binding matches. `null` for every normal
 * event (a printable or named `key`), so real browsers are never affected.
 *
 * Letters come from the control character itself (Ctrl+A = 1 … Ctrl+Z = 26), which follows the keyboard layout
 * (Ctrl+Z on a German keyboard stays undo); the rest (digits, punctuation, Ctrl+Space) from `event.code`.
 */
export function controlCharacterKey(event: KeyboardEvent): string | null {
  if (!(event.ctrlKey || event.metaKey) || event.key.length !== 1) return null;
  const charCode = event.key.charCodeAt(0);
  if (charCode >= 32) return null;
  const code = event.code ?? "";
  if (charCode >= 1 && charCode <= 26 && (code === "" || code.startsWith("Key"))) {
    return String.fromCharCode(96 + charCode);
  }
  if (code.startsWith("Key") && code.length === 4) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
  return codeKeys[code] ?? null;
}

/** A copy of `event` with the repaired `key` (and a matching `keyCode`, which CodeMirror reads for shifted keys). */
function repairedEvent(event: KeyboardEvent, key: string): KeyboardEvent {
  const letter = /^[a-z]$/.test(key);
  const fixed = new KeyboardEvent("keydown", {
    key: letter && event.shiftKey ? key.toUpperCase() : key,
    code: event.code,
    location: event.location,
    repeat: event.repeat,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    bubbles: false,
    cancelable: true,
  });
  const keyCode = letter ? key.toUpperCase().charCodeAt(0) : /^[0-9]$/.test(key) ? key.charCodeAt(0) : event.keyCode;
  Object.defineProperty(fixed, "keyCode", { value: keyCode });
  return fixed;
}

/**
 * Runs the editor's shortcuts for Ctrl / Cmd + key presses that arrive as control characters (FiveM NUI): the key is
 * repaired and the editor keymaps (undo, redo, select all, search, comment, indent …) run on it. Keys without a
 * binding — copy, cut, paste — stay with the browser. Does nothing for normal key events.
 */
export const controlKeyGuard = /* @__PURE__ */ Prec.highest(
  /* @__PURE__ */ EditorView.domEventHandlers({
    keydown: (event, view) => {
      const key = controlCharacterKey(event);
      if (key === null || event.isComposing) return false;
      if (!runScopeHandlers(view, repairedEvent(event, key), "editor")) return false;
      event.preventDefault();
      return true;
    },
  }),
);
