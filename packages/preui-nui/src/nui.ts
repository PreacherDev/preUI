// Plain NUI helpers: talking to the Lua side and developing in a normal browser.

/** A message the game sends with `SendNUIMessage({ action = "...", data = ... })`. */
export interface NuiMessage<T = unknown> {
  action: string;
  data: T;
}

declare global {
  interface Window {
    /** Set by FiveM inside NUI frames. */
    GetParentResourceName?: () => string;
    /** Only present inside CEF (FiveM / RedM). */
    invokeNative?: unknown;
  }
}

/** `true` outside FiveM (a normal browser, the Vite dev server, tests) and on the server. */
export function isEnvBrowser(): boolean {
  return typeof window === "undefined" || !("invokeNative" in window);
}

/** The resource this NUI page belongs to (`GetParentResourceName()`), `"nui-frame-app"` in a browser. */
export function getResourceName(): string {
  if (typeof window !== "undefined" && typeof window.GetParentResourceName === "function") {
    return window.GetParentResourceName();
  }
  return "nui-frame-app";
}

/**
 * Calls a NUI callback of your resource: `POST https://<resource>/<event>` with `data` as JSON — handled in Lua by
 * `RegisterNUICallback("<event>", function(data, cb) cb(result) end)`. Resolves with the callback's result (or
 * `undefined` for an empty response).
 *
 * In a browser (`isEnvBrowser()`) nothing is sent and `mock` is returned instead, so the UI can be developed
 * without the game.
 */
export async function fetchNui<T = unknown>(event: string, data?: unknown, mock?: T): Promise<T> {
  if (isEnvBrowser()) return mock as T;
  const response = await fetch(`https://${getResourceName()}/${event}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(data ?? {}),
  });
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * Sends mock NUI messages in a browser (no-op inside FiveM), as if the game had called `SendNUIMessage` — e.g.
 * `debugData([{ action: "setVisible", data: true }])` at the top of `main.tsx`. Messages are sent in order, the
 * first after `delay` ms and each further one `delay` ms later.
 */
export function debugData<T = unknown>(messages: NuiMessage<T>[], delay = 1000): void {
  if (!isEnvBrowser() || typeof window === "undefined") return;
  messages.forEach((message, index) => {
    window.setTimeout(() => {
      window.dispatchEvent(new MessageEvent("message", { data: message }));
    }, delay * (index + 1));
  });
}
