/**
 * Shared class strings for DropdownMenu, ContextMenu and Menubar, so all three look identical.
 * Internal module — not exported from the package index.
 */

export const menuPositionerClass = "z-50 outline-none";

/**
 * Floating surface of a menu popup (root menus and submenus). The items live in a `MenuScrollArea`
 * (menu-scroll-area.tsx), which carries the 4px padding and scrolls when the menu is taller than the screen.
 */
export const menuPopupClass = [
  "flex min-w-48 max-h-[var(--available-height)] flex-col",
  "rounded-pui-md border border-pui-border bg-pui-popover text-sm text-pui-popover-foreground shadow-pui-floating outline-none",
  "origin-[var(--transform-origin)] transition-[opacity,transform] duration-pui-base ease-pui",
  "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
  "data-[instant]:transition-none",
].join(" ");

/** Base row: items, checkbox/radio items and submenu triggers. */
export const menuItemClass = [
  "relative flex w-full cursor-default select-none items-center gap-2.5 rounded-pui-sm p-2 text-left text-sm outline-none",
  "transition-colors duration-pui-fast ease-pui",
  "data-[highlighted]:bg-pui-accent data-[highlighted]:text-pui-accent-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
].join(" ");

/** Destructive item (`variant="destructive"`): negative text, tinted highlight. */
export const menuDestructiveItemClass =
  "text-pui-negative data-[highlighted]:bg-pui-negative/tint data-[highlighted]:text-pui-negative";

/**
 * Left padding that lines an item's text up with icon items and checkbox/radio item labels:
 * 8px padding + 16px icon/indicator + 10px gap (`gap-2.5`) = 34px.
 */
export const menuInsetClass = "pl-[2.125rem]";

/** Checkbox and radio items reserve room for the indicator on the left (same 34px as icon rows). */
export const menuCheckableItemClass = `${menuItemClass} ${menuInsetClass}`;

/** Indicator slot inside checkbox/radio items. */
export const menuIndicatorClass = "absolute left-2 flex size-4 items-center justify-center";

/** Radio dot inside the indicator slot. */
export const menuRadioDotClass = "size-1.5 rounded-full bg-current";

export const menuSubTriggerClass = `${menuItemClass} data-[popup-open]:bg-pui-accent data-[popup-open]:text-pui-accent-foreground`;

export const menuSubTriggerIconClass = "ml-auto text-pui-muted-foreground";

/** Eyebrow label above a group of items. */
export const menuLabelClass =
  "select-none px-2 py-1.5 text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground";

export const menuSeparatorClass = "-mx-1 my-1 h-px bg-pui-border";

export const menuShortcutClass = "ml-auto pl-4 text-xs text-pui-muted-foreground";

/** Two-line row: label + hint (as in the handoff's DropdownMenu). */
export const menuItemTextClass = "min-w-0 flex-1 leading-tight";
export const menuItemTitleClass = "block truncate font-medium";
export const menuItemDescriptionClass = "block text-xs text-pui-muted-foreground";
