import { NavigationMenu as BaseNavigationMenu } from "@base-ui/react/navigation-menu";
import { cva } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { useIcon } from "../../icons";
import { mergeClassName } from "../../utils/cn";
import { ScrollArea } from "../ScrollArea/ScrollArea";

export type NavigationMenuItemProps = ComponentPropsWithoutRef<typeof BaseNavigationMenu.Item>;

export const NavigationMenuItem = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseNavigationMenu.Item>, NavigationMenuItemProps>(
  function NavigationMenuItem(props, ref) {
    return <BaseNavigationMenu.Item ref={ref} data-slot="navigation-menu-item" {...props} />;
  },
);

export type NavigationMenuProps = ComponentPropsWithoutRef<typeof BaseNavigationMenu.Root>;

export const NavigationMenu = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseNavigationMenu.Root>, NavigationMenuProps>(
  function NavigationMenu({ className, ...props }, ref) {
    return (
      <BaseNavigationMenu.Root
        ref={ref}
        data-slot="navigation-menu"
        className={mergeClassName("relative text-sm text-pui-foreground", className)}
        {...props}
      />
    );
  },
);

export type NavigationMenuListProps = ComponentPropsWithoutRef<typeof BaseNavigationMenu.List>;

/** Row of triggers and links. */
export const NavigationMenuList = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseNavigationMenu.List>, NavigationMenuListProps>(
  function NavigationMenuList({ className, ...props }, ref) {
    return (
      <BaseNavigationMenu.List
        ref={ref}
        data-slot="navigation-menu-list"
        className={mergeClassName(
          "relative m-0 flex list-none items-center gap-1 p-0 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
          className,
        )}
        {...props}
      />
    );
  },
);

/**
 * Ghost-button look shared by triggers and top-level links:
 * `<NavigationMenuLink className={navigationMenuTriggerStyle()} />`.
 */
export const navigationMenuTriggerStyle = /* @__PURE__ */ cva([
  "inline-flex h-pui-control cursor-default select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-pui-md px-3 text-sm font-medium no-underline outline-none",
  "text-pui-muted-foreground transition-colors duration-pui-fast ease-pui",
  "hover:bg-pui-accent hover:text-pui-accent-foreground",
  "data-[popup-open]:bg-pui-accent data-[popup-open]:text-pui-accent-foreground data-[active]:text-pui-foreground",
  "focus-visible:outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
]);

export type NavigationMenuTriggerProps = ComponentPropsWithoutRef<typeof BaseNavigationMenu.Trigger>;

/** Opens the item's content panel. Renders a chevron that turns while open. */
export const NavigationMenuTrigger = /* @__PURE__ */ forwardRef<
  ComponentRef<typeof BaseNavigationMenu.Trigger>,
  NavigationMenuTriggerProps
>(function NavigationMenuTrigger({ className, children, ...props }, ref) {
  const ChevronDown = useIcon("chevronDown");
  return (
    <BaseNavigationMenu.Trigger ref={ref} data-slot="navigation-menu-trigger" className={mergeClassName(navigationMenuTriggerStyle(), className)} {...props}>
      {children}
      <BaseNavigationMenu.Icon data-slot="navigation-menu-icon" className="flex shrink-0 text-pui-muted-foreground transition-transform duration-pui-fast ease-pui data-[popup-open]:rotate-180">
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </BaseNavigationMenu.Icon>
    </BaseNavigationMenu.Trigger>
  );
});

export type NavigationMenuContentProps = ComponentPropsWithoutRef<typeof BaseNavigationMenu.Content>;

/**
 * Panel shown in the floating surface while its item is active. The panel scrolls inside a ScrollArea when it is
 * taller than the space available below the trigger (capped at the positioner's `--available-height`).
 */
export const NavigationMenuContent = /* @__PURE__ */ forwardRef<
  ComponentRef<typeof BaseNavigationMenu.Content>,
  NavigationMenuContentProps
>(function NavigationMenuContent({ className, children, ...props }, ref) {
  return (
    <BaseNavigationMenu.Content
      ref={ref}
      data-slot="navigation-menu-content"
      className={mergeClassName(
        [
          "flex h-full w-max max-w-[calc(100vw-2.5rem)] flex-col",
          "transition-opacity duration-pui-base ease-pui",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        ],
        className,
      )}
      {...props}
    >
      {/* Thumb floats over the 4px padding + the links' 8px padding; the viewport is not a Tab stop. */}
      <ScrollArea
        reserveTrack={false}
        className="rounded-[inherit]"
        viewportClassName="max-h-[calc(var(--available-height)-2px)]"
        viewportProps={{ tabIndex: -1 }}
        contentClassName="p-1"
      >
        {children}
      </ScrollArea>
    </BaseNavigationMenu.Content>
  );
});

export type NavigationMenuLinkProps = ComponentPropsWithoutRef<typeof BaseNavigationMenu.Link>;

/** Link row inside a content panel. Add a muted `<p>` below the title for a two-line card. */
export const NavigationMenuLink = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseNavigationMenu.Link>, NavigationMenuLinkProps>(
  function NavigationMenuLink({ className, ...props }, ref) {
    return (
      <BaseNavigationMenu.Link
        ref={ref}
        data-slot="navigation-menu-link"
        className={mergeClassName(
          [
            "block rounded-pui-sm p-2 text-sm text-pui-foreground no-underline outline-none",
            "transition-colors duration-pui-fast ease-pui",
            "hover:bg-pui-accent hover:text-pui-accent-foreground focus-visible:bg-pui-accent",
            // Active link: tinted (--pui-tint-rest), stronger on hover/keyboard focus so focus stays visible.
            "data-[active]:bg-pui-primary/tint data-[active]:text-pui-primary",
            "data-[active]:hover:bg-pui-primary/tint-hover data-[active]:hover:text-pui-primary data-[active]:focus-visible:bg-pui-primary/tint-hover",
          ],
          className,
        )}
        {...props}
      />
    );
  },
);

type PositionerProps = BaseNavigationMenu.Positioner.Props;

export interface NavigationMenuViewportProps extends ComponentPropsWithoutRef<typeof BaseNavigationMenu.Popup> {
  side?: PositionerProps["side"];
  align?: PositionerProps["align"];
  sideOffset?: PositionerProps["sideOffset"];
  alignOffset?: PositionerProps["alignOffset"];
  positionerProps?: Omit<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset">;
  /** Class for the inner viewport that hosts the active content. */
  viewportClassName?: ComponentPropsWithoutRef<typeof BaseNavigationMenu.Viewport>["className"];
  /** Element the portal renders into (Base UI Portal `container`); defaults to `document.body`. */
  container?: BaseNavigationMenu.Portal.Props["container"];
}

/**
 * Portal + Positioner + Popup + Viewport in one: the floating surface that shows the active item's
 * content. Place it once inside `NavigationMenu`, after the list.
 */
export const NavigationMenuViewport = /* @__PURE__ */ forwardRef<
  ComponentRef<typeof BaseNavigationMenu.Popup>,
  NavigationMenuViewportProps
>(function NavigationMenuViewport(
  { className, side = "bottom", align = "start", sideOffset = 6, alignOffset = 0, positionerProps, container, viewportClassName, ...props },
  ref,
) {
  return (
    <BaseNavigationMenu.Portal container={container}>
      <BaseNavigationMenu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={8}
        data-slot="navigation-menu-positioner"
        {...positionerProps}
        className={mergeClassName(
          [
            "z-50 h-[var(--positioner-height)] w-[var(--positioner-width)] max-w-[var(--available-width)] outline-none",
            "transition-[top,left,right,bottom] duration-pui-base ease-pui data-[instant]:transition-none",
          ],
          positionerProps?.className,
        )}
      >
        <BaseNavigationMenu.Popup
          ref={ref}
          data-slot="navigation-menu-popup"
          className={mergeClassName(
            [
              "relative h-[var(--popup-height)] max-h-[var(--available-height)] w-[var(--popup-width)] overflow-hidden",
              "rounded-pui-md border border-pui-border bg-pui-popover text-sm text-pui-popover-foreground shadow-pui-floating outline-none",
              "origin-[var(--transform-origin)] transition-[opacity,transform,width,height] duration-pui-base ease-pui",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            ],
            className,
          )}
          {...props}
        >
          <BaseNavigationMenu.Viewport
            data-slot="navigation-menu-viewport"
            className={mergeClassName("relative h-full w-full overflow-hidden", viewportClassName)}
          />
        </BaseNavigationMenu.Popup>
      </BaseNavigationMenu.Positioner>
    </BaseNavigationMenu.Portal>
  );
});
