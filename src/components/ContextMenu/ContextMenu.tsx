import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
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
} from "../DropdownMenu/DropdownMenu";
import { MenuScrollArea } from "../DropdownMenu/menu-scroll-area";
import { MenuSlotContext } from "../DropdownMenu/menu-slot";
import { menuPopupClass, menuPositionerClass } from "../DropdownMenu/menu-styles";

export type {
  DropdownMenuCheckboxItemProps as ContextMenuCheckboxItemProps,
  DropdownMenuGroupLabelProps as ContextMenuGroupLabelProps,
  DropdownMenuItemProps as ContextMenuItemProps,
  DropdownMenuLabelProps as ContextMenuLabelProps,
  DropdownMenuLinkItemProps as ContextMenuLinkItemProps,
  DropdownMenuRadioItemProps as ContextMenuRadioItemProps,
  DropdownMenuSeparatorProps as ContextMenuSeparatorProps,
  DropdownMenuShortcutProps as ContextMenuShortcutProps,
  DropdownMenuSubContentProps as ContextMenuSubContentProps,
  DropdownMenuSubTriggerProps as ContextMenuSubTriggerProps,
} from "../DropdownMenu/DropdownMenu";

export const ContextMenu = BaseContextMenu.Root;
export type ContextMenuTriggerProps = ComponentPropsWithoutRef<typeof BaseContextMenu.Trigger>;

/** The area that opens the menu on right click / long press. Renders a `<div>`. */
export const ContextMenuTrigger = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseContextMenu.Trigger>, ContextMenuTriggerProps>(
  function ContextMenuTrigger(props, ref) {
    return <BaseContextMenu.Trigger ref={ref} data-slot="context-menu-trigger" {...props} />;
  },
);
export const ContextMenuPortal = BaseContextMenu.Portal;

// Base UI's context menu parts are the menu parts, so the styled DropdownMenu parts are reused as-is.
export const ContextMenuItem = DropdownMenuItem;
export const ContextMenuLinkItem = DropdownMenuLinkItem;
export const ContextMenuCheckboxItem = DropdownMenuCheckboxItem;
export const ContextMenuRadioGroup = DropdownMenuRadioGroup;
export const ContextMenuRadioItem = DropdownMenuRadioItem;
export const ContextMenuGroup = DropdownMenuGroup;
export const ContextMenuGroupLabel = DropdownMenuGroupLabel;
export const ContextMenuLabel = DropdownMenuLabel;
export const ContextMenuSeparator = DropdownMenuSeparator;
export const ContextMenuShortcut = DropdownMenuShortcut;
export const ContextMenuSub = DropdownMenuSub;
export const ContextMenuSubTrigger = DropdownMenuSubTrigger;
export const ContextMenuSubContent = DropdownMenuSubContent;

type PositionerProps = BaseContextMenu.Positioner.Props;

export interface ContextMenuContentProps extends ComponentPropsWithoutRef<typeof BaseContextMenu.Popup> {
  side?: PositionerProps["side"];
  align?: PositionerProps["align"];
  sideOffset?: PositionerProps["sideOffset"];
  alignOffset?: PositionerProps["alignOffset"];
  /** Props for the positioner element (e.g. `anchor`, `collisionPadding`, `className`). */
  positionerProps?: Omit<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset">;
  /** Element the portal renders into (Base UI Portal `container`); defaults to `document.body`. */
  container?: BaseContextMenu.Portal.Props["container"];
}

/** Portal + Positioner + Popup in one. Opens at the pointer, styled like `DropdownMenuContent`. */
export const ContextMenuContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseContextMenu.Popup>, ContextMenuContentProps>(
  function ContextMenuContent(
    { className, side = "bottom", align = "start", sideOffset = 2, alignOffset = 2, positionerProps, container, children, ...props },
    ref,
  ) {
    return (
      <MenuSlotContext.Provider value="context-menu">
        <BaseContextMenu.Portal container={container}>
          <BaseContextMenu.Positioner
            side={side}
            align={align}
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            data-slot="context-menu-positioner"
            {...positionerProps}
            className={mergeClassName(menuPositionerClass, positionerProps?.className)}
          >
            <BaseContextMenu.Popup
              ref={ref}
              data-slot="context-menu-content"
              className={mergeClassName(menuPopupClass, className)}
              {...props}
            >
              <MenuScrollArea>{children}</MenuScrollArea>
            </BaseContextMenu.Popup>
          </BaseContextMenu.Positioner>
        </BaseContextMenu.Portal>
      </MenuSlotContext.Provider>
    );
  },
);
