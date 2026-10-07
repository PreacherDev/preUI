/**
 * FiveM's NUI can drop characters typed with AltGr (`{ } [ ] \ @ ~ | €` on German and many other layouts): Windows
 * reports AltGr as Ctrl + Alt, and a key held with Ctrl may be taken for a shortcut instead of text. For such a key
 * that names a symbol, this waits a moment; if the browser didn't type it by then (and nothing handled the key), it
 * types it into the focused field itself — as a normal text input, so React inputs and editors see it like typing.
 * Letters and digits are left alone: with Ctrl + Alt they are shortcuts on every layout.
 *
 * Does nothing where the browser types the character itself (normal browsers), so it is safe to install always.
 */

/** The browser types a character a moment after its keydown; only after this long it counts as dropped. */
const TYPE_DELAY = 50;

function isEditable(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
  if (target instanceof HTMLTextAreaElement) return !target.readOnly && !target.disabled;
  if (target instanceof HTMLInputElement) {
    return !target.readOnly && !target.disabled && ["text", "search", "url", "email", "password", "tel", ""].includes(target.type);
  }
  return target instanceof HTMLElement && target.isContentEditable;
}

function isAltGr(event: KeyboardEvent): boolean {
  const altGraph = typeof event.getModifierState === "function" && event.getModifierState("AltGraph");
  return !event.metaKey && (altGraph || (event.ctrlKey && event.altKey));
}

function isSymbol(key: string): boolean {
  return key.length === 1 && key > " " && !/[a-z0-9]/i.test(key);
}

/** Types `text` at the caret like the keyboard would; falls back to the value + an input event without execCommand. */
function typeInto(target: HTMLElement, text: string) {
  const doc = target.ownerDocument;
  if (doc.activeElement === target && doc.execCommand?.("insertText", false, text)) return;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    target.setRangeText(text, start, end, "end");
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  }
}

/**
 * Installs the AltGr fallback on a document (default: `document`). Call once, e.g. at the top of `main.tsx`; returns a
 * function that removes it again. Installing twice on the same document has no extra effect.
 */
export function installAltGrFix(doc: Document = document): () => void {
  const state = doc as Document & { __preuiAltGrFix?: () => void };
  if (state.__preuiAltGrFix) return state.__preuiAltGrFix;

  // Keys typed fast follow each other within TYPE_DELAY: one entry per key, oldest first.
  const pending: { done: boolean }[] = [];
  let typingItself = false;

  const onKeyDown = (event: KeyboardEvent) => {
    if (!isAltGr(event) || !isSymbol(event.key) || event.isComposing) return;
    const target = event.target;
    if (!isEditable(target)) return;
    const entry = { done: false };
    pending.push(entry);
    const view = doc.defaultView ?? window;
    view.setTimeout(() => {
      pending.splice(pending.indexOf(entry), 1);
      // Typed by the browser, or handled by the field itself (e.g. the CodeEditor inserts AltGr characters and
      // prevents the default) — nothing to do.
      if (entry.done || event.defaultPrevented) return;
      typingItself = true;
      try {
        typeInto(target, event.key);
      } finally {
        typingItself = false;
      }
    }, TYPE_DELAY);
  };

  // The browser typed the oldest waiting key itself.
  const onInput = () => {
    if (typingItself) return;
    const waiting = pending.find((entry) => !entry.done);
    if (waiting) waiting.done = true;
  };

  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("input", onInput, true);
  const uninstall = () => {
    doc.removeEventListener("keydown", onKeyDown, true);
    doc.removeEventListener("input", onInput, true);
    delete state.__preuiAltGrFix;
  };
  state.__preuiAltGrFix = uninstall;
  return uninstall;
}
