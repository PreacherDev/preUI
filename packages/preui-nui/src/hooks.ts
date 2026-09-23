import { useWindowToggle, type WindowToggleKey } from "@pre_scripts/preui";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNui, isEnvBrowser } from "./nui";

/**
 * Calls `handler(data)` for every NUI message `{ action, data }` with this `action` (from `SendNUIMessage` in Lua,
 * or `debugData` in a browser). The handler may change between renders without re-subscribing.
 */
export function useNuiEvent<T = unknown>(action: string, handler: (data: T) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const message = event.data as { action?: unknown; data?: unknown } | null;
      if (message && typeof message === "object" && message.action === action) handlerRef.current(message.data as T);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [action]);
}

export interface UseNuiVisibilityOptions {
  /** Close on Escape (hides the UI and calls the close callback). @default true */
  closeOnEscape?: boolean;
  /** Visible before the first message. @default false */
  initialVisible?: boolean;
  /** Message action that sets visibility, with `data: boolean`. @default "setVisible" */
  action?: string;
  /** NUI callback called when the UI closes itself (release focus there: `SetNuiFocus(false, false)`). @default "close" */
  closeEvent?: string;
  /**
   * Browser development only (`isEnvBrowser()`): keys that show and hide the page, e.g. `["F1"]` — in the game Lua
   * opens the UI (a keybind / command sending `setVisible`), so these are ignored there. Letter keys don't fire while
   * typing into an input; key repeats are ignored.
   */
  toggleKeys?: readonly WindowToggleKey[];
}

export interface NuiVisibility {
  visible: boolean;
  /** Shows or hides locally (does not notify Lua). */
  setVisible: (visible: boolean) => void;
  /** Hides the UI and calls the close callback — the same as pressing Escape. */
  close: () => void;
}

/**
 * Visibility of a NUI page: follows `SendNUIMessage({ action = "setVisible", data = true/false })` and closes on
 * Escape by calling `fetchNui("close")`, so Lua can release the focus. An Escape pressed while a dialog, menu or
 * select inside the page is open closes only that popup (preUI's `isOverlayOpen`); toasts and tooltips don't count.
 */
export function useNuiVisibility({
  closeOnEscape = true,
  initialVisible = false,
  action = "setVisible",
  closeEvent = "close",
  toggleKeys,
}: UseNuiVisibilityOptions = {}): NuiVisibility {
  const [visible, setVisible] = useState(initialVisible);
  useNuiEvent<boolean>(action, (data) => setVisible(Boolean(data)));

  const close = useCallback(() => {
    setVisible(false);
    void fetchNui(closeEvent).catch(() => {});
  }, [closeEvent]);

  // Development keys only in a browser; decided after mount (no `window` during render).
  const [browser, setBrowser] = useState(false);
  useEffect(() => setBrowser(isEnvBrowser()), []);

  useWindowToggle({
    open: visible,
    onOpenChange: (next) => (next ? setVisible(true) : close()),
    closeOnEscape,
    toggleKeys: browser ? toggleKeys : undefined,
  });

  return { visible, setVisible, close };
}
