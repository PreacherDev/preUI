import type { ReactNode } from "react";
import { ScrollArea } from "../ScrollArea/ScrollArea";

/**
 * Scrollable body of a menu popup (DropdownMenu, ContextMenu, Menubar, submenus).
 * Internal — not exported from the package index.
 *
 * - The viewport is capped at the positioner's `--available-height` (minus the popup's 1px borders), so a long
 *   menu scrolls inside the popup instead of running off the screen.
 * - The thumb floats over the content (`reserveTrack={false}`): the 4px content padding plus the items' 8px
 *   padding keep text 12px away from the edge, clear of the 10px track.
 * - The viewport is never a Tab stop; the menu manages focus and scrolls the highlighted item into view.
 */
export function MenuScrollArea({ children }: { children?: ReactNode }) {
  return (
    <ScrollArea
      reserveTrack={false}
      className="rounded-[inherit]"
      viewportClassName="max-h-[calc(var(--available-height)-2px)]"
      viewportProps={{ tabIndex: -1 }}
      contentClassName="p-1"
    >
      {children}
    </ScrollArea>
  );
}
