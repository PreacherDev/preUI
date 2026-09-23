import { useEffect, useRef } from "react";

/**
 * Elements that own the Escape key while they are in the DOM. Base UI popups carry `data-open` only while they are
 * open (not while closed-but-mounted or during their exit animation). Tooltips and hover cards are left out on
 * purpose: they close themselves on the side and should never keep a window open. Toasts are `role="dialog"` too,
 * but have no `data-open` and are excluded explicitly.
 */
const OVERLAY_SELECTOR = [
  // Dialog, AlertDialog, Sheet, Drawer, Popover (DatePicker, ColorPicker), CommandDialog — and plain Base UI popups
  '[role="dialog"][data-open]:not([data-slot="toast"])',
  '[role="alertdialog"][data-open]',
  // DropdownMenu, ContextMenu, Menubar (and plain Base UI menus)
  '[role="menu"][data-open]',
  // List popups: the popup is role="presentation" around the listbox
  '[data-slot="select-content"][data-open]',
  '[data-slot="combobox-content"][data-open]',
  '[data-slot="autocomplete-content"][data-open]',
  '[data-slot="navigation-menu-popup"][data-open]',
  // Widgets that use Escape themselves: a Kanban drag (Escape cancels), a KeybindInput that is recording
  '[data-slot="kanban"][data-dragging]',
  '[data-slot="keybind-input"][data-listening]',
].join(", ");

/**
 * `true` while something in `root` (default: the whole document) owns the Escape key: an open dialog, alert dialog,
 * sheet, drawer, popover, menu, select, combobox, autocomplete or navigation menu popup, a Kanban drag, a
 * `KeybindInput` that is recording, or a focused `RadialMenu` showing a submenu (Escape goes back a level).
 * Tooltips, hover cards and toasts never count.
 *
 * Use it to decide whether an Escape is meant for your window or for a popup inside it. Check it **before** the
 * popups react (capture phase), since they close on the same keydown. Returns `false` on the server.
 */
export function isOverlayOpen(root?: ParentNode): boolean {
  if (typeof document === "undefined") return false;
  const scope = root ?? document;
  if (scope.querySelector(OVERLAY_SELECTOR)) return true;
  // A RadialMenu handles Escape itself (back one level) only while it has the focus.
  const active = document.activeElement;
  const radial = active?.closest?.('[data-slot="radial-menu"]');
  return Boolean(radial && radial.getAttribute("data-level") !== "0" && (scope as Node).contains(radial));
}

export interface UseEscapeKeyOptions {
  /** Listen at all. @default true */
  enabled?: boolean;
  /** Skip the Escape while an overlay owns it (see `isOverlayOpen`) — it closes that overlay instead. @default true */
  ignoreWhenOverlayOpen?: boolean;
  /**
   * `true`: the handler runs in the capture phase on `window`, before any popup or widget reacts, and decides by
   * `isOverlayOpen` alone. `false`: the handler runs in the bubble phase, after your own components, and additionally
   * skips an Escape that one of them handled (`preventDefault()` or `stopPropagation()`) — use it when your page has
   * inputs or widgets with their own Escape behaviour. The overlay check still sees the DOM from before the key.
   * @default true
   */
  capture?: boolean;
}

/**
 * Calls `handler(event)` when Escape is pressed anywhere on the page — but not while an overlay owns the key
 * (`isOverlayOpen`), so the first Escape closes an open Select, menu or dialog and only the next one reaches you.
 * Composition (IME) keystrokes and already-prevented events are ignored. The handler may change between renders.
 *
 * ```tsx
 * useEscapeKey(() => setOpen(false), { enabled: open });
 * ```
 */
export function useEscapeKey(handler: (event: KeyboardEvent) => void, options: UseEscapeKeyOptions = {}): void {
  const { enabled = true, ignoreWhenOverlayOpen = true, capture = true } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const isEscape = (event: KeyboardEvent) => event.key === "Escape" && !event.isComposing;

    if (capture) {
      const onKeyDown = (event: KeyboardEvent) => {
        if (!isEscape(event) || event.defaultPrevented) return;
        if (ignoreWhenOverlayOpen && isOverlayOpen()) return;
        handlerRef.current(event);
      };
      window.addEventListener("keydown", onKeyDown, true);
      return () => window.removeEventListener("keydown", onKeyDown, true);
    }

    // Bubble phase: remember in the capture phase whether an overlay owned the key (popups close on this keydown,
    // so by the bubble phase the DOM may already say "closed").
    let owned: KeyboardEvent | null = null;
    const onCapture = (event: KeyboardEvent) => {
      owned = isEscape(event) && ignoreWhenOverlayOpen && isOverlayOpen() ? event : null;
    };
    const onBubble = (event: KeyboardEvent) => {
      if (!isEscape(event) || event.defaultPrevented || owned === event) return;
      handlerRef.current(event);
    };
    window.addEventListener("keydown", onCapture, true);
    window.addEventListener("keydown", onBubble);
    return () => {
      window.removeEventListener("keydown", onCapture, true);
      window.removeEventListener("keydown", onBubble);
    };
  }, [enabled, ignoreWhenOverlayOpen, capture]);
}
