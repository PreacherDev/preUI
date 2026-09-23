import { useCallback, useRef, type ForwardedRef, type MutableRefObject, type RefObject } from "react";

/** Interaction that opened the popup, as Base UI passes it to `initialFocus` functions. */
type OpenType = "mouse" | "touch" | "pen" | "keyboard" | "";

/** Base UI's `initialFocus` prop (same shape on Dialog, AlertDialog and Drawer popups). */
export type InitialFocus =
  | boolean
  | RefObject<HTMLElement | null>
  | ((openType: OpenType) => boolean | void | HTMLElement | null);

const TABBABLE_CANDIDATES =
  'a[href],button,input,select,textarea,summary,iframe,[tabindex],[contenteditable]:not([contenteditable="false"]),audio[controls],video[controls]';

function isHiddenWithin(element: HTMLElement, root: HTMLElement): boolean {
  const view = element.ownerDocument.defaultView;
  if (view && view.getComputedStyle(element).visibility === "hidden") return true;
  for (let node: HTMLElement | null = element; node && node !== root; node = node.parentElement) {
    if (node.hasAttribute("hidden") || node.hasAttribute("inert")) return true;
    if (view && view.getComputedStyle(node).display === "none") return true;
  }
  return false;
}

/**
 * The first element Tab would reach inside `root` — the same target Base UI picks for its default initial focus
 * (tabIndex ≥ 0, enabled, not hidden/inert, the checked radio of a named group).
 * @internal
 */
export function getFirstTabbable(root: HTMLElement): HTMLElement | null {
  const candidates = root.querySelectorAll<HTMLElement>(TABBABLE_CANDIDATES);
  for (const element of Array.from(candidates)) {
    if (element.tabIndex < 0 || element.matches(":disabled")) continue;
    if (element.tagName === "INPUT") {
      const input = element as HTMLInputElement;
      if (input.type === "hidden") continue;
      if (input.type === "radio" && input.name && !input.checked) {
        const group = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]')).filter(
          (radio) => radio.name === input.name && radio.form === input.form,
        );
        const checked = group.find((radio) => radio.checked);
        if (checked ? checked !== input : group[0] !== input) continue;
      }
    }
    if (isHiddenWithin(element, root)) continue;
    return element;
  }
  return null;
}

const isRefObject = (value: unknown): value is RefObject<HTMLElement | null> =>
  typeof value === "object" && value !== null && "current" in value;

const isFocusable = (value: unknown): value is HTMLElement =>
  typeof value === "object" && value !== null && typeof (value as HTMLElement).focus === "function";

/**
 * Focuses `target` on the next frame (like Base UI) but with `preventScroll`, so opening a modal never scrolls the
 * page or a parent frame (NUI, iframes) to the focused field. Skipped when the popup closed in the meantime or
 * focus already moved to another element inside it.
 */
function focusWithoutScroll(target: HTMLElement, popup: HTMLElement) {
  const doc = target.ownerDocument;
  const win = doc.defaultView ?? window;
  win.requestAnimationFrame(() => {
    if (!target.isConnected || !popup.isConnected) return;
    if (popup.hasAttribute("data-closed") || popup.hasAttribute("data-ending-style")) return;
    const active = doc.activeElement;
    if (active && active !== target && active !== popup && popup.contains(active)) return;
    target.focus({ preventScroll: true });
  });
}

/**
 * Wraps a modal popup's `initialFocus` so the focused element is focused with `preventScroll: true`.
 * Base UI focuses the first tabbable element with a plain `focus()`, which scrolls every scrollable ancestor —
 * including the page around an iframe — to it. The target stays the same (first tabbable, the popup itself on
 * touch, or whatever `initialFocus` resolves to); only the scrolling goes away.
 *
 * Returns a ref to put on the popup and the `initialFocus` function to pass to it.
 * `defaultToPopup`: Base UI's default for this popup focuses the popup itself (Drawer) rather than the first
 * tabbable element.
 * @internal Used by Dialog, AlertDialog, Sheet, Drawer.
 */
export function useInitialFocusWithoutScroll<T extends HTMLElement>(
  initialFocus: InitialFocus | undefined,
  forwardedRef: ForwardedRef<T>,
  defaultToPopup = false,
) {
  const popupRef = useRef<T | null>(null);
  const ref = useCallback(
    (node: T | null) => {
      popupRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as MutableRefObject<T | null>).current = node;
    },
    [forwardedRef],
  );

  const resolveInitialFocus = useCallback(
    (openType: OpenType) => {
      const popup = popupRef.current;
      let target: unknown;
      if (typeof initialFocus === "function") target = initialFocus(openType);
      else if (initialFocus !== undefined) target = initialFocus;
      else target = defaultToPopup || openType === "touch" ? popup : true;

      if (target === false || target === undefined) return false;
      if (!popup) return target as boolean | HTMLElement | null;
      if (isRefObject(target)) target = target.current;
      if (target === true || target === null) target = getFirstTabbable(popup) ?? popup;
      if (!isFocusable(target) || target === popup) return target as HTMLElement; // Base UI focuses the popup with preventScroll
      // Base UI does nothing when focus is already inside the popup (e.g. `autoFocus`).
      if (popup.contains(popup.ownerDocument.activeElement)) return false;
      focusWithoutScroll(target, popup);
      return false;
    },
    [initialFocus, defaultToPopup],
  );

  return { ref, initialFocus: resolveInitialFocus };
}
