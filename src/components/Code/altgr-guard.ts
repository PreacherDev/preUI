import { Prec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

/**
 * `true` for a key press that types a character through AltGr. Windows reports AltGr as Ctrl + Alt, so on a German
 * keyboard `{ [ ] } \ @ € ~ |` arrive as e.g. Ctrl+Alt+\ — which CodeMirror's default keymap binds (Mod-Alt-\ =
 * re-indent) and swallows. A real Ctrl+Alt shortcut on a letter has a lowercase `key` too, but only AltGr turns
 * the key into a symbol, so the check is: Ctrl + Alt (or the AltGraph state), no Meta, one printable non-letter
 * character.
 */
export function isAltGrCharacter(event: KeyboardEvent): boolean {
  if (event.metaKey || event.key.length !== 1 || event.key === " ") return false;
  const altGraph = typeof event.getModifierState === "function" && event.getModifierState("AltGraph");
  if (!altGraph && !(event.ctrlKey && event.altKey)) return false;
  // Ctrl+Alt+K is a shortcut, Ctrl+Alt+@ (AltGr+Q) is typing.
  return !/^[a-z0-9]$/i.test(event.key);
}

/**
 * Types AltGr characters instead of running a shortcut: a keydown handler before every keymap (the default keymap
 * binds Ctrl+Alt+\, the fold keymap Ctrl+Alt+[ and ]) inserts the character the way typing does — through the
 * editor's input handlers first, so auto-closed brackets and autocomplete keep working.
 */
export const altGrGuard = /* @__PURE__ */ Prec.highest(
  /* @__PURE__ */ EditorView.domEventHandlers({
    keydown: (event, view) => {
      if (!isAltGrCharacter(event) || event.isComposing || view.state.readOnly) return false;
      const text = event.key;
      const { from, to } = view.state.selection.main;
      const insert = () => view.state.update(view.state.replaceSelection(text), { userEvent: "input.type", scrollIntoView: true });
      const handled = view.state.facet(EditorView.inputHandler).some((handler) => handler(view, from, to, text, insert));
      if (!handled) view.dispatch(insert());
      return true; // handled: CodeMirror prevents the browser's own insert, so the character isn't typed twice
    },
  }),
);
