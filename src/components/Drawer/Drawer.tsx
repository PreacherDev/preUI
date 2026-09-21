import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";
import { ModalSections, modalCloseClassName } from "../Dialog/Dialog";

export type DrawerProps = BaseDrawer.Root.Props;

/**
 * Root of a swipeable drawer — by default a bottom sheet (`swipeDirection="down"`), as in shadcn/vaul.
 * `swipeDirection` decides both the edge the drawer is attached to and the swipe that dismisses it:
 * `"down"` (default), `"up"`, `"left"` or `"right"`. For a plain side panel without swiping, use `Sheet`.
 */
export function Drawer({ swipeDirection = "down", ...props }: DrawerProps) {
  return <BaseDrawer.Root swipeDirection={swipeDirection} {...props} />;
}

export type DrawerTriggerProps = BaseDrawer.Trigger.Props;
export type DrawerCloseProps = BaseDrawer.Close.Props;
export type DrawerPortalProps = BaseDrawer.Portal.Props;

/** Opens the drawer. Renders a `<button>` (`data-slot="drawer-trigger"`). */
export const DrawerTrigger = forwardRef<HTMLButtonElement, DrawerTriggerProps>(function DrawerTrigger(props, ref) {
  return <BaseDrawer.Trigger ref={ref} data-slot="drawer-trigger" {...props} />;
}) as unknown as typeof BaseDrawer.Trigger;

/** Closes the drawer. Renders a `<button>` (`data-slot="drawer-close"`). */
export const DrawerClose = forwardRef<HTMLButtonElement, DrawerCloseProps>(function DrawerClose(props, ref) {
  return <BaseDrawer.Close ref={ref} data-slot="drawer-close" {...props} />;
});

export const DrawerPortal = forwardRef<HTMLDivElement, DrawerPortalProps>(function DrawerPortal(props, ref) {
  return <BaseDrawer.Portal ref={ref} data-slot="drawer-portal" {...props} />;
});

export interface DrawerOverlayProps extends ComponentPropsWithoutRef<typeof BaseDrawer.Backdrop> {}

/** Dimmed scrim that fades out while the drawer is swiped away. */
export const DrawerOverlay = forwardRef<ComponentRef<typeof BaseDrawer.Backdrop>, DrawerOverlayProps>(
  function DrawerOverlay({ className, ...props }, ref) {
    return (
      <BaseDrawer.Backdrop
        ref={ref}
        data-slot="drawer-overlay"
        className={mergeClassName(
          [
            "fixed inset-0 z-50 bg-pui-background/scrim opacity-[calc(1-var(--drawer-swipe-progress))]",
            "transition-opacity duration-pui-base ease-pui data-[swiping]:duration-0",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*var(--pui-duration-base))]",
          ],
          className,
        )}
        {...props}
      />
    );
  },
);

const drawerPopupClassName = [
  "group/drawer pointer-events-auto fixed z-50 flex flex-col overflow-hidden",
  "border-pui-border bg-pui-shell p-5 text-sm text-pui-foreground shadow-pui-window outline-none",
  "transition-transform duration-pui-base ease-pui data-[swiping]:select-none data-[swiping]:duration-0",
  "data-[ending-style]:duration-[calc(var(--drawer-swipe-strength)*var(--pui-duration-base))]",
  // right (default)
  "data-[swipe-direction=right]:inset-y-0 data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:h-full data-[swipe-direction=right]:w-full data-[swipe-direction=right]:max-w-sm data-[swipe-direction=right]:border-l",
  "data-[swipe-direction=right]:[transform:translateX(var(--drawer-swipe-movement-x))]",
  "data-[swipe-direction=right]:data-[starting-style]:[transform:translateX(100%)] data-[swipe-direction=right]:data-[ending-style]:[transform:translateX(100%)]",
  // left
  "data-[swipe-direction=left]:inset-y-0 data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:h-full data-[swipe-direction=left]:w-full data-[swipe-direction=left]:max-w-sm data-[swipe-direction=left]:border-r",
  "data-[swipe-direction=left]:[transform:translateX(var(--drawer-swipe-movement-x))]",
  "data-[swipe-direction=left]:data-[starting-style]:[transform:translateX(-100%)] data-[swipe-direction=left]:data-[ending-style]:[transform:translateX(-100%)]",
  // down (bottom sheet)
  "data-[swipe-direction=down]:inset-x-0 data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:max-h-[80vh] data-[swipe-direction=down]:rounded-t-pui data-[swipe-direction=down]:border-t",
  "data-[swipe-direction=down]:[transform:translateY(calc(var(--drawer-snap-point-offset)_+_var(--drawer-swipe-movement-y)))]",
  "data-[swipe-direction=down]:data-[starting-style]:[transform:translateY(100%)] data-[swipe-direction=down]:data-[ending-style]:[transform:translateY(100%)]",
  // up
  "data-[swipe-direction=up]:inset-x-0 data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:max-h-[80vh] data-[swipe-direction=up]:rounded-b-pui data-[swipe-direction=up]:border-b",
  "data-[swipe-direction=up]:[transform:translateY(var(--drawer-swipe-movement-y))]",
  "data-[swipe-direction=up]:data-[starting-style]:[transform:translateY(-100%)] data-[swipe-direction=up]:data-[ending-style]:[transform:translateY(-100%)]",
];

/** Grab handle; shown on bottom sheets (above the content) and top sheets (below it). */
const drawerHandleClassName = [
  "hidden h-1.5 w-12 shrink-0 self-center rounded-full bg-pui-input",
  "group-data-[swipe-direction=down]/drawer:-mt-2 group-data-[swipe-direction=down]/drawer:mb-4 group-data-[swipe-direction=down]/drawer:block",
  "group-data-[swipe-direction=up]/drawer:order-last group-data-[swipe-direction=up]/drawer:-mb-2 group-data-[swipe-direction=up]/drawer:mt-4 group-data-[swipe-direction=up]/drawer:block",
];

export interface DrawerContentProps extends ComponentPropsWithoutRef<typeof BaseDrawer.Popup> {
  /** Renders a close (X) button in the top-right corner. Off by default: drawers close by swipe or overlay. */
  showCloseButton?: boolean;
  /** Accessible label of the close button. */
  closeLabel?: string;
}

/**
 * Portal + Overlay + Viewport + Popup in one. The panel sticks to the edge given by the root's
 * `swipeDirection` and slides in from there; bottom/top sheets get rounded corners and a grab handle.
 * `DrawerHeader` and `DrawerFooter` stay in place; all other children scroll in a preUI `ScrollArea`. Base UI
 * lets touch gestures scroll that area first and only swipes the drawer away from its scroll edge.
 */
export const DrawerContent = forwardRef<ComponentRef<typeof BaseDrawer.Popup>, DrawerContentProps>(
  function DrawerContent({ className, children, showCloseButton = false, closeLabel = "Close", ...props }, ref) {
    const CloseIcon = useIcon("close");
    return (
      <DrawerPortal>
        <DrawerOverlay />
        <BaseDrawer.Viewport data-slot="drawer-viewport" className="pointer-events-none fixed inset-0 z-50">
          <BaseDrawer.Popup
            ref={ref}
            data-slot="drawer-content"
            className={mergeClassName(drawerPopupClassName, className)}
            {...props}
          >
            <div aria-hidden="true" data-slot="drawer-handle" className={cn(drawerHandleClassName)} />
            <BaseDrawer.Content data-slot="drawer-inner" className="flex min-h-0 flex-1 flex-col gap-4">
              <ModalSections header={[DrawerHeader]} footer={[DrawerFooter]}>
                {children}
              </ModalSections>
            </BaseDrawer.Content>
            {showCloseButton && (
              <BaseDrawer.Close aria-label={closeLabel} data-slot="drawer-close" className={cn(modalCloseClassName)}>
                <CloseIcon className="size-4" aria-hidden="true" />
              </BaseDrawer.Close>
            )}
          </BaseDrawer.Popup>
        </BaseDrawer.Viewport>
      </DrawerPortal>
    );
  },
);

export interface DrawerHeaderProps extends ComponentPropsWithoutRef<"div"> {}

/** Stacks title and description. */
export const DrawerHeader = forwardRef<HTMLDivElement, DrawerHeaderProps>(function DrawerHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="drawer-header" className={cn("flex flex-col gap-1", className)} {...props} />;
});

export interface DrawerFooterProps extends ComponentPropsWithoutRef<"div"> {}

/** Right-aligned action row, pushed to the bottom of the drawer. */
export const DrawerFooter = forwardRef<HTMLDivElement, DrawerFooterProps>(function DrawerFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="drawer-footer"
      className={cn("mt-auto flex justify-end gap-2 pt-1", className)}
      {...props}
    />
  );
});

export interface DrawerTitleProps extends ComponentPropsWithoutRef<typeof BaseDrawer.Title> {}

export const DrawerTitle = forwardRef<ComponentRef<typeof BaseDrawer.Title>, DrawerTitleProps>(function DrawerTitle(
  { className, ...props },
  ref,
) {
  return (
    <BaseDrawer.Title
      ref={ref}
      data-slot="drawer-title"
      className={mergeClassName("text-base font-semibold text-pui-foreground", className)}
      {...props}
    />
  );
});

export interface DrawerDescriptionProps extends ComponentPropsWithoutRef<typeof BaseDrawer.Description> {}

export const DrawerDescription = forwardRef<ComponentRef<typeof BaseDrawer.Description>, DrawerDescriptionProps>(
  function DrawerDescription({ className, ...props }, ref) {
    return (
      <BaseDrawer.Description
        ref={ref}
        data-slot="drawer-description"
        className={mergeClassName("text-sm text-pui-muted-foreground", className)}
        {...props}
      />
    );
  },
);
