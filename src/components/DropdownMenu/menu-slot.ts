/**
 * Internal: the `data-slot` prefix of the menu the parts are rendered in. DropdownMenu, ContextMenu and
 * Menubar share their item components, so the popup provides its prefix ("dropdown-menu", "context-menu",
 * "menubar") and each part renders `data-slot="<prefix>-item"` etc. Not exported from the package index.
 */
import { createContext, useContext } from "react";

export type MenuSlotPrefix = "dropdown-menu" | "context-menu" | "menubar";

export const MenuSlotContext = /* @__PURE__ */ createContext<MenuSlotPrefix>("dropdown-menu");

/** Returns a function that builds the `data-slot` value of a part: `slot("item")` → `"dropdown-menu-item"`. */
export function useMenuSlot() {
  const prefix = useContext(MenuSlotContext);
  return (part: string) => `${prefix}-${part}`;
}
