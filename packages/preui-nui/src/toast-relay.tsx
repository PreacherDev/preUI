import { Toaster, toast, type ToasterPosition, type ToasterProps, type ToastType } from "@pre_scripts/preui";
import { useEffect, useRef, useState } from "react";
import { useNuiEvent } from "./hooks";
import { fetchNui } from "./nui";

/** One notification as Lua sends it. */
export interface NuiToastMessage {
  title?: string;
  description: string;
  type?: ToastType | (string & {});
  /** ms until it closes. Default: the `Toaster`'s timeout. */
  duration?: number;
  /** Moves the whole stack (the relay has one `Toaster`). */
  position?: ToasterPosition;
}

export interface NuiToastRelayProps extends Omit<ToasterProps, "position"> {
  /** Message action that carries a notification (`SendNUIMessage({ action, data })`). @default "toast" */
  action?: string;
  /** NUI callback called once on mount, so Lua knows this UI can show notifications now. Off by default. */
  readyEvent?: string;
  /** Stack position until a message brings its own. @default "top-right" */
  defaultPosition?: ToasterPosition;
}

/**
 * Shows notifications that Lua hands to this NUI — e.g. while this script's window has the NUI focus and FiveM draws
 * it above a shared notification UI. Renders its own `Toaster`; without focus nothing on a toast can be clicked, so
 * the close button and actions are off unless you pass `closeButton` / `actions`.
 *
 * ```tsx
 * <NuiToastRelay readyEvent="preLibNotifyReady" action="preLibNotify" />
 * ```
 *
 * Lua: answer the `readyEvent` callback, then `SendNUIMessage({ action = 'preLibNotify', data = { description = …,
 * type = 'success', duration = 5000, position = 'top-right' } })`.
 */
export function NuiToastRelay({
  action = "toast",
  readyEvent,
  defaultPosition = "top-right",
  closeButton = false,
  actions = false,
  ...toasterProps
}: NuiToastRelayProps) {
  const [position, setPosition] = useState<ToasterPosition>(defaultPosition);
  const readyEventRef = useRef(readyEvent);

  useEffect(() => {
    const event = readyEventRef.current;
    if (event) void fetchNui(event, undefined, {}).catch(() => {});
  }, []);

  useNuiEvent<NuiToastMessage>(action, (data) => {
    if (!data || typeof data.description !== "string") return;
    if (data.position) setPosition(data.position);
    toast({
      // A lone description becomes the title, so it gets the title's weight.
      title: data.title ?? data.description,
      description: data.title ? data.description : undefined,
      type: data.type,
      timeout: typeof data.duration === "number" ? data.duration : undefined,
    });
  });

  return <Toaster position={position} closeButton={closeButton} actions={actions} {...toasterProps} />;
}
