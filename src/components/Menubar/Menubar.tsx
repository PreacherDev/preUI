import { Menu as BaseMenu } from "@base-ui/react/menu";
import { Menubar as BaseMenubar } from "@base-ui/react/menubar";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  MenuContent,
  type DropdownMenuContentProps,
} from "../DropdownMenu/DropdownMenu";

export type {
  DropdownMenuCheckboxItemProps as MenubarCheckboxItemProps,
  DropdownMenuGroupLabelProps as MenubarGroupLabelProps,
  DropdownMenuItemProps as MenubarItemProps,
  DropdownMenuLabelProps as MenubarLabelProps,
  DropdownMenuLinkItemProps as MenubarLinkItemProps,
  DropdownMenuRadioItemProps as MenubarRadioItemProps,
  DropdownMenuSeparatorProps as MenubarSeparatorProps,
  DropdownMenuShortcutProps as MenubarShortcutProps,
  DropdownMenuSubContentProps as MenubarSubContentProps,
  DropdownMenuSubTriggerProps as MenubarSubTriggerProps,
} from "../DropdownMenu/DropdownMenu";

export type MenubarProps = ComponentPropsWithoutRef<typeof BaseMenubar>;

/** Container for a row of menus. */
export const Menubar = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenubar>, MenubarProps>(function Menubar(
  { className, ...props },
  ref,
) {
  return (
    <BaseMenubar
      ref={ref}
      data-slot="menubar"
      className={mergeClassName(
        [
          "flex items-center gap-0.5 rounded-pui-md border border-pui-border bg-pui-background p-1",
          "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
        ],
        className,
      )}
      {...props}
    />
  );
});

/** One menu inside the menubar (Base UI `Menu.Root`). */
export const MenubarMenu = BaseMenu.Root;
export const MenubarPortal = BaseMenu.Portal;

export type MenubarTriggerProps = ComponentPropsWithoutRef<typeof BaseMenu.Trigger>;

/** Menubar entry, styled like a small ghost button. */
export const MenubarTrigger = /* @__PURE__ */ forwardRef<HTMLButtonElement, MenubarTriggerProps>(
  function MenubarTrigger({ className, ...props }, ref) {
    return (
      <BaseMenu.Trigger
        ref={ref}
        data-slot="menubar-trigger"
        className={mergeClassName(
          [
            "inline-flex h-pui-control-sm cursor-default select-none items-center gap-2 whitespace-nowrap rounded-pui-sm px-3 text-sm font-medium outline-none",
            "text-pui-muted-foreground transition-colors duration-pui-fast ease-pui",
            "hover:bg-pui-accent hover:text-pui-accent-foreground",
            "data-[popup-open]:bg-pui-accent data-[popup-open]:text-pui-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
          ],
          className,
        )}
        {...props}
      />
    );
  },
);

export type MenubarContentProps = DropdownMenuContentProps;

/** Menu popup below a menubar entry; same surface as `DropdownMenuContent`, offset to clear the bar's padding. */
export const MenubarContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.Popup>, MenubarContentProps>(
  function MenubarContent({ sideOffset = 8, alignOffset = -4, ...props }, ref) {
    return <MenuContent ref={ref} slotPrefix="menubar" sideOffset={sideOffset} alignOffset={alignOffset} {...props} />;
  },
);

// Items are the styled DropdownMenu parts, so menus look identical everywhere.
export const MenubarItem = DropdownMenuItem;
export const MenubarLinkItem = DropdownMenuLinkItem;
export const MenubarCheckboxItem = DropdownMenuCheckboxItem;
export const MenubarRadioGroup = DropdownMenuRadioGroup;
export const MenubarRadioItem = DropdownMenuRadioItem;
export const MenubarGroup = DropdownMenuGroup;
export const MenubarGroupLabel = DropdownMenuGroupLabel;
export const MenubarLabel = DropdownMenuLabel;
export const MenubarSeparator = DropdownMenuSeparator;
export const MenubarShortcut = DropdownMenuShortcut;
export const MenubarSub = DropdownMenuSub;
export const MenubarSubTrigger = DropdownMenuSubTrigger;
export const MenubarSubContent = DropdownMenuSubContent;
