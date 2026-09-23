import { useCallback, useEffect, useRef, useState } from "react";
import { matchesKeybind, type Keybind } from "../components/KeybindInput/KeybindInput";
import { useEscapeKey } from "./escape";

/**
 * A key for `useWindowToggle`: a `KeyboardEvent.key` (`"F1"`, `"i"`, `"Tab"`) or `.code` (`"KeyI"`), matched without
 * Ctrl / Alt / Meta (letters ignore case) — or a `Keybind` from `KeybindInput` for combinations like Ctrl + K.
 */
export type WindowToggleKey = string | Keybind;

/** Why a `useWindowToggle` window opened or closed. */
export type WindowToggleReason = "escape" | "key" | "imperative";

export interface WindowToggleChangeDetails {
  reason: WindowToggleReason;
  /** The keydown that caused the change (`"escape"` and `"key"`). */
  event?: KeyboardEvent;
}

export interface UseWindowToggleOptions {
  /** Open state on mount (uncontrolled). @default false */
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /** Called on every change, with the reason (e.g. call `fetchNui("close")` when it closes). */
  onOpenChange?: (open: boolean, details: WindowToggleChangeDetails) => void;
  /** Escape closes the window — unless an overlay inside owns the key (see `isOverlayOpen`). @default true */
  closeOnEscape?: boolean;
  /** Keys that open a closed window and close an open one, e.g. `["F1"]` or `["i"]`. */
  toggleKeys?: readonly WindowToggleKey[];
  /** Keys that only open the window (do nothing while it is open). */
  openKeys?: readonly WindowToggleKey[];
  /** Escape is left to an open dialog / menu / select … first. @default true */
  ignoreWhenOverlayOpen?: boolean;
  /** Listen to the keyboard at all (Escape and the keys). `setOpen` / `close` / `toggle` always work. @default true */
  enabled?: boolean;
}

export interface WindowToggle {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: () => void;
  toggle: () => void;
}

function matchesKey(event: KeyboardEvent, key: WindowToggleKey): boolean {
  if (typeof key !== "string") return matchesKeybind(event, key);
  // Another modifier held (a key like "Alt" may itself be the toggle key).
  if ((event.ctrlKey && event.key !== "Control") || (event.altKey && event.key !== "Alt") || (event.metaKey && event.key !== "Meta")) {
    return false;
  }
  if (event.code === key || event.key === key) return true;
  return key.length === 1 && event.key.toLowerCase() === key.toLowerCase();
}

/** `true` when a key press would type into (or be recorded by) the focused element. */
function isTypingTarget(event: KeyboardEvent): boolean {
  const target = event.target as Element | null;
  if (!target || typeof target.closest !== "function") return false;
  if (target.closest('[data-slot="keybind-input"][data-listening]')) return true;
  if (event.key.length !== 1) return false; // F-keys, Tab, arrows … never type
  return Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
}

/**
 * Open state of a game window (NUI page, tablet, menu): Escape closes it — but only when no dialog, menu or select
 * inside owns the key — and `toggleKeys` / `openKeys` open it again. Key repeats are ignored, and letter keys don't
 * fire while the player types into an input. Controlled (`open` + `onOpenChange`) or uncontrolled (`defaultOpen`).
 *
 * ```tsx
 * const { open, close } = useWindowToggle({ defaultOpen: true, openKeys: ["F1"] });
 * ```
 */
export function useWindowToggle(options: UseWindowToggleOptions = {}): WindowToggle {
  const {
    defaultOpen = false,
    open: openProp,
    onOpenChange,
    closeOnEscape = true,
    toggleKeys,
    openKeys,
    ignoreWhenOverlayOpen = true,
    enabled = true,
  } = options;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;

  const latest = useRef({ open, controlled, onOpenChange, toggleKeys, openKeys });
  latest.current = { open, controlled, onOpenChange, toggleKeys, openKeys };

  const change = useCallback((next: boolean, details: WindowToggleChangeDetails) => {
    const current = latest.current;
    if (next === current.open) return;
    // Keep the ref in sync right away, so two changes in one tick don't both see the old state.
    current.open = next;
    if (!current.controlled) setUncontrolledOpen(next);
    current.onOpenChange?.(next, details);
  }, []);

  const setOpen = useCallback((next: boolean) => change(next, { reason: "imperative" }), [change]);
  const close = useCallback(() => change(false, { reason: "imperative" }), [change]);
  const toggle = useCallback(() => change(!latest.current.open, { reason: "imperative" }), [change]);

  useEscapeKey(
    (event) => {
      if (event.repeat) return; // holding Escape must not close the popup and then the window
      change(false, { reason: "escape", event });
    },
    { enabled: enabled && closeOnEscape && open, ignoreWhenOverlayOpen },
  );

  const hasKeys = Boolean(toggleKeys?.length || openKeys?.length);
  useEffect(() => {
    if (!enabled || !hasKeys) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented || event.isComposing || isTypingTarget(event)) return;
      const { open: isOpen, toggleKeys: toggles = [], openKeys: opens = [] } = latest.current;
      const isToggle = toggles.some((key) => matchesKey(event, key));
      const isOpenKey = !isOpen && opens.some((key) => matchesKey(event, key));
      if (!isToggle && !isOpenKey) return;
      event.preventDefault(); // e.g. F1 would open the browser's help
      change(!isOpen, { reason: "key", event });
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, hasKeys, change]);

  return { open, setOpen, close, toggle };
}
