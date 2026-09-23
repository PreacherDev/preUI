import { Menu as BaseMenu } from "@base-ui/react/menu";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type HTMLAttributes,
  type ReactNode,
  useContext,
} from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";
import {
  menuCheckableItemClass,
  menuDestructiveItemClass,
  menuIndicatorClass,
  menuInsetClass,
  menuItemClass,
  menuItemDescriptionClass,
  menuItemTextClass,
  menuItemTitleClass,
  menuLabelClass,
  menuPopupClass,
  menuPositionerClass,
  menuRadioDotClass,
  menuSeparatorClass,
  menuShortcutClass,
  menuSubTriggerClass,
  menuSubTriggerIconClass,
} from "./menu-styles";
import { MenuScrollArea } from "./menu-scroll-area";
import { MenuSlotContext, useMenuSlot, type MenuSlotPrefix } from "./menu-slot";

export const DropdownMenu = BaseMenu.Root;
export const DropdownMenuPortal = BaseMenu.Portal;
export const DropdownMenuSub = BaseMenu.SubmenuRoot;

export type DropdownMenuTriggerProps = ComponentPropsWithoutRef<typeof BaseMenu.Trigger>;

/** Opens the menu. Unstyled — render your own button, e.g. `render={<Button variant="outline" />}`. */
export const DropdownMenuTrigger = /* @__PURE__ */ forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(function DropdownMenuTrigger(
  props,
  ref,
) {
  return <BaseMenu.Trigger ref={ref} data-slot="dropdown-menu-trigger" {...props} />;
});

export type DropdownMenuGroupProps = ComponentPropsWithoutRef<typeof BaseMenu.Group>;

export const DropdownMenuGroup = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.Group>, DropdownMenuGroupProps>(
  function DropdownMenuGroup(props, ref) {
    const slot = useMenuSlot();
    return <BaseMenu.Group ref={ref} data-slot={slot("group")} {...props} />;
  },
);

export type DropdownMenuRadioGroupProps = ComponentPropsWithoutRef<typeof BaseMenu.RadioGroup>;

export const DropdownMenuRadioGroup = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.RadioGroup>, DropdownMenuRadioGroupProps>(
  function DropdownMenuRadioGroup(props, ref) {
    const slot = useMenuSlot();
    return <BaseMenu.RadioGroup ref={ref} data-slot={slot("radio-group")} {...props} />;
  },
);

type PositionerProps = BaseMenu.Positioner.Props;

export interface DropdownMenuContentProps extends ComponentPropsWithoutRef<typeof BaseMenu.Popup> {
  side?: PositionerProps["side"];
  align?: PositionerProps["align"];
  sideOffset?: PositionerProps["sideOffset"];
  alignOffset?: PositionerProps["alignOffset"];
  /** Props for the positioner element (e.g. `collisionPadding`, `className`). */
  positionerProps?: Omit<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset">;
  /** Element the portal renders into (Base UI Portal `container`); defaults to `document.body`. */
  container?: BaseMenu.Portal.Props["container"];
}

/**
 * Portal + Positioner + Popup in one, styled as a floating menu surface. The items scroll inside a ScrollArea
 * when the menu is taller than the space available on screen.
 */
export const DropdownMenuContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.Popup>, DropdownMenuContentProps>(
  function DropdownMenuContent(props, ref) {
    return <MenuContent ref={ref} slotPrefix="dropdown-menu" {...props} />;
  },
);

/**
 * Internal: the menu popup shared by DropdownMenu, Menubar and submenus. `slotPrefix` names the parts
 * (`<prefix>-content`, `<prefix>-item` …); `slotPart` is the popup's own part name ("content" / "sub-content").
 */
export const MenuContent = /* @__PURE__ */ forwardRef<
  ComponentRef<typeof BaseMenu.Popup>,
  DropdownMenuContentProps & { slotPrefix: MenuSlotPrefix; slotPart?: string }
>(function MenuContent(
  {
    className,
    side = "bottom",
    align = "start",
    sideOffset = 6,
    alignOffset = 0,
    positionerProps,
    container,
    slotPrefix,
    slotPart = "content",
    children,
    ...props
  },
  ref,
) {
  return (
    <MenuSlotContext.Provider value={slotPrefix}>
      <BaseMenu.Portal container={container}>
        <BaseMenu.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          data-slot={`${slotPrefix}-positioner`}
          {...positionerProps}
          className={mergeClassName(menuPositionerClass, positionerProps?.className)}
        >
          <BaseMenu.Popup
            ref={ref}
            data-slot={`${slotPrefix}-${slotPart}`}
            className={mergeClassName(menuPopupClass, className)}
            {...props}
          >
            <MenuScrollArea>{children}</MenuScrollArea>
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </MenuSlotContext.Provider>
  );
});

export type DropdownMenuSubContentProps = DropdownMenuContentProps;

/** Popup of a submenu. Opens to the inline end and lines its first item up with the trigger. */
export const DropdownMenuSubContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.Popup>, DropdownMenuSubContentProps>(
  function DropdownMenuSubContent({ side = "inline-end", align = "start", sideOffset = -4, alignOffset = -5, ...props }, ref) {
    // Submenus keep the prefix of the menu they open from (context-menu-sub-content, menubar-sub-content …).
    const prefix = useContext(MenuSlotContext);
    return (
      <MenuContent
        ref={ref}
        slotPrefix={prefix}
        slotPart="sub-content"
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        {...props}
      />
    );
  },
);

export interface DropdownMenuItemProps extends ComponentPropsWithoutRef<typeof BaseMenu.Item> {
  /** Adds left padding so the text lines up with checkbox/radio item labels. */
  inset?: boolean;
  /** Leading icon. */
  icon?: ReactNode;
  /** Second, muted line under the label. When set, `children` is rendered as the label line. */
  description?: ReactNode;
  /** `destructive` tints the item in the negative colour (e.g. "Delete"). */
  variant?: "default" | "destructive";
}

export const DropdownMenuItem = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.Item>, DropdownMenuItemProps>(function DropdownMenuItem(
  { className, inset = false, variant = "default", icon, description, children, ...props },
  ref,
) {
  const slot = useMenuSlot();
  return (
    <BaseMenu.Item
      ref={ref}
      data-slot={slot("item")}
      data-variant={variant}
      data-inset={inset || undefined}
      className={mergeClassName(
        [
          menuItemClass,
          inset && menuInsetClass,
          variant === "destructive" && menuDestructiveItemClass,
          description != null && "items-start",
        ],
        className,
      )}
      {...props}
    >
      <DropdownMenuItemBody icon={icon} description={description}>
        {children}
      </DropdownMenuItemBody>
    </BaseMenu.Item>
  );
});

/** Shared inner layout of an item: optional icon + label (+ optional description line). */
function DropdownMenuItemBody({
  icon,
  description,
  children,
}: {
  icon?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const slot = useMenuSlot();
  return (
    <>
      {icon != null && (
        <span
          data-slot={slot("item-icon")}
          className={cn("inline-flex shrink-0", description != null && "mt-0.5")}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      {description != null ? (
        <span data-slot={slot("item-text")} className={menuItemTextClass}>
          <span data-slot={slot("item-title")} className={menuItemTitleClass}>
            {children}
          </span>
          <span data-slot={slot("item-description")} className={menuItemDescriptionClass}>
            {description}
          </span>
        </span>
      ) : (
        children
      )}
    </>
  );
}

export interface DropdownMenuLinkItemProps extends ComponentPropsWithoutRef<typeof BaseMenu.LinkItem> {
  inset?: boolean;
}

/** A menu item that navigates (renders an `<a>`). */
export const DropdownMenuLinkItem = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.LinkItem>, DropdownMenuLinkItemProps>(
  function DropdownMenuLinkItem({ className, inset = false, ...props }, ref) {
    const slot = useMenuSlot();
    return (
      <BaseMenu.LinkItem
        ref={ref}
        data-slot={slot("link-item")}
        data-inset={inset || undefined}
        className={mergeClassName([menuItemClass, inset && menuInsetClass], className)}
        {...props}
      />
    );
  },
);

export type DropdownMenuCheckboxItemProps = ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem>;

export const DropdownMenuCheckboxItem = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.CheckboxItem>, DropdownMenuCheckboxItemProps>(
  function DropdownMenuCheckboxItem({ className, children, ...props }, ref) {
    const Check = useIcon("check");
    const slot = useMenuSlot();
    return (
      <BaseMenu.CheckboxItem
        ref={ref}
        data-slot={slot("checkbox-item")}
        className={mergeClassName(menuCheckableItemClass, className)}
        {...props}
      >
        <BaseMenu.CheckboxItemIndicator data-slot={slot("item-indicator")} className={menuIndicatorClass}>
          <Check aria-hidden="true" />
        </BaseMenu.CheckboxItemIndicator>
        {children}
      </BaseMenu.CheckboxItem>
    );
  },
);

export type DropdownMenuRadioItemProps = ComponentPropsWithoutRef<typeof BaseMenu.RadioItem>;

export const DropdownMenuRadioItem = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.RadioItem>, DropdownMenuRadioItemProps>(
  function DropdownMenuRadioItem({ className, children, ...props }, ref) {
    const slot = useMenuSlot();
    return (
      <BaseMenu.RadioItem
        ref={ref}
        data-slot={slot("radio-item")}
        className={mergeClassName(menuCheckableItemClass, className)}
        {...props}
      >
        <BaseMenu.RadioItemIndicator data-slot={slot("item-indicator")} className={menuIndicatorClass}>
          <span className={menuRadioDotClass} />
        </BaseMenu.RadioItemIndicator>
        {children}
      </BaseMenu.RadioItem>
    );
  },
);

export interface DropdownMenuSubTriggerProps extends ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger> {
  inset?: boolean;
  icon?: ReactNode;
}

export const DropdownMenuSubTrigger = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.SubmenuTrigger>, DropdownMenuSubTriggerProps>(
  function DropdownMenuSubTrigger({ className, inset = false, icon, children, ...props }, ref) {
    const ChevronRight = useIcon("chevronRight");
    const slot = useMenuSlot();
    return (
      <BaseMenu.SubmenuTrigger
        ref={ref}
        data-slot={slot("sub-trigger")}
        data-inset={inset || undefined}
        className={mergeClassName([menuSubTriggerClass, inset && menuInsetClass], className)}
        {...props}
      >
        <DropdownMenuItemBody icon={icon}>{children}</DropdownMenuItemBody>
        <ChevronRight className={menuSubTriggerIconClass} aria-hidden="true" />
      </BaseMenu.SubmenuTrigger>
    );
  },
);

export type DropdownMenuGroupLabelProps = ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel>;

/**
 * Label of a `DropdownMenuGroup` / `DropdownMenuRadioGroup` (announced as the group's name).
 * Must be inside a group; use `DropdownMenuLabel` anywhere else.
 */
export const DropdownMenuGroupLabel = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.GroupLabel>, DropdownMenuGroupLabelProps>(
  function DropdownMenuGroupLabel({ className, ...props }, ref) {
    const slot = useMenuSlot();
    return <BaseMenu.GroupLabel ref={ref} data-slot={slot("group-label")} className={mergeClassName(menuLabelClass, className)} {...props} />;
  },
);

export interface DropdownMenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds left padding so the label lines up with checkbox/radio item labels. */
  inset?: boolean;
}

/** Free-standing eyebrow label (e.g. a header at the top of the menu). Usable anywhere, also outside groups. */
export const DropdownMenuLabel = /* @__PURE__ */ forwardRef<HTMLDivElement, DropdownMenuLabelProps>(function DropdownMenuLabel(
  { className, inset = false, ...props },
  ref,
) {
  const slot = useMenuSlot();
  return (
    <div
      ref={ref}
      data-slot={slot("label")}
      data-inset={inset || undefined}
      className={cn(menuLabelClass, inset && menuInsetClass, className)}
      {...props}
    />
  );
});

export type DropdownMenuSeparatorProps = ComponentPropsWithoutRef<typeof BaseMenu.Separator>;

export const DropdownMenuSeparator = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseMenu.Separator>, DropdownMenuSeparatorProps>(
  function DropdownMenuSeparator({ className, ...props }, ref) {
    const slot = useMenuSlot();
    return <BaseMenu.Separator ref={ref} data-slot={slot("separator")} className={mergeClassName(menuSeparatorClass, className)} {...props} />;
  },
);

export type DropdownMenuShortcutProps = HTMLAttributes<HTMLSpanElement>;

/** Keyboard shortcut hint, right-aligned inside an item. */
export const DropdownMenuShortcut = /* @__PURE__ */ forwardRef<HTMLSpanElement, DropdownMenuShortcutProps>(function DropdownMenuShortcut(
  { className, ...props },
  ref,
) {
  const slot = useMenuSlot();
  return <span ref={ref} data-slot={slot("shortcut")} className={cn(menuShortcutClass, className)} {...props} />;
});
