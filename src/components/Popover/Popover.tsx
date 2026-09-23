import { Popover as BasePopover } from "@base-ui/react/popover";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn, mergeClassName } from "../../utils/cn";

export const Popover = BasePopover.Root;

export type PopoverProps = BasePopover.Root.Props;
export interface PopoverTriggerProps extends BasePopover.Trigger.Props {}
export interface PopoverCloseProps extends ComponentPropsWithoutRef<typeof BasePopover.Close> {}

/** Opens the popover. Renders a `<button>` (`data-slot="popover-trigger"`). */
export const PopoverTrigger = /* @__PURE__ */ forwardRef<HTMLButtonElement, PopoverTriggerProps>(function PopoverTrigger(props, ref) {
  return <BasePopover.Trigger ref={ref} data-slot="popover-trigger" {...props} />;
}) as unknown as typeof BasePopover.Trigger;

/** Closes the popover. Renders a `<button>` (`data-slot="popover-close"`). */
export const PopoverClose = /* @__PURE__ */ forwardRef<HTMLButtonElement, PopoverCloseProps>(function PopoverClose(props, ref) {
  return <BasePopover.Close ref={ref} data-slot="popover-close" {...props} />;
});

export interface PopoverContentProps extends ComponentPropsWithoutRef<typeof BasePopover.Popup> {
  side?: BasePopover.Positioner.Props["side"];
  align?: BasePopover.Positioner.Props["align"];
  sideOffset?: BasePopover.Positioner.Props["sideOffset"];
  /** Shift along the alignment axis (px). Default `0`. */
  alignOffset?: BasePopover.Positioner.Props["alignOffset"];
  /** Further props for the Positioner (e.g. `collisionPadding`, `sticky`, `anchor`, `className`). */
  positionerProps?: Omit<BasePopover.Positioner.Props, "side" | "align" | "sideOffset" | "alignOffset">;
  /** Element the portal renders into (Base UI Portal `container`); defaults to `document.body`. */
  container?: BasePopover.Portal.Props["container"];
}

/** Portal + Positioner + Popup in one, styled as a floating surface. */
export const PopoverContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BasePopover.Popup>, PopoverContentProps>(
  function PopoverContent({ className, side = "bottom", align = "center", sideOffset = 6, alignOffset = 0, positionerProps, container, ...props }, ref) {
    return (
      <BasePopover.Portal data-slot="popover-portal" container={container}>
        <BasePopover.Positioner
          data-slot="popover-positioner"
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          {...positionerProps}
          className={mergeClassName("z-50 outline-none", positionerProps?.className)}
        >
          <BasePopover.Popup
            ref={ref}
            data-slot="popover-content"
            className={mergeClassName(
              [
                "w-72 rounded-pui-md border border-pui-border bg-pui-popover p-4 text-sm text-pui-popover-foreground shadow-pui-floating outline-none",
                "origin-[var(--transform-origin)] transition-[opacity,transform] duration-pui-base ease-pui",
                "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              ],
              className,
            )}
            {...props}
          />
        </BasePopover.Positioner>
      </BasePopover.Portal>
    );
  },
);

export interface PopoverHeaderProps extends ComponentPropsWithoutRef<"div"> {}

/** Stacks `PopoverTitle` and `PopoverDescription`. */
export const PopoverHeader = /* @__PURE__ */ forwardRef<HTMLDivElement, PopoverHeaderProps>(function PopoverHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="popover-header" className={cn("flex flex-col gap-1", className)} {...props} />;
});

export interface PopoverTitleProps extends ComponentPropsWithoutRef<typeof BasePopover.Title> {}

export const PopoverTitle = /* @__PURE__ */ forwardRef<ComponentRef<typeof BasePopover.Title>, PopoverTitleProps>(function PopoverTitle(
  { className, ...props },
  ref,
) {
  return (
    <BasePopover.Title
      ref={ref}
      data-slot="popover-title"
      className={mergeClassName("text-sm font-semibold text-pui-popover-foreground", className)}
      {...props}
    />
  );
});

export interface PopoverDescriptionProps extends ComponentPropsWithoutRef<typeof BasePopover.Description> {}

export const PopoverDescription = /* @__PURE__ */ forwardRef<ComponentRef<typeof BasePopover.Description>, PopoverDescriptionProps>(
  function PopoverDescription({ className, ...props }, ref) {
    return (
      <BasePopover.Description
        ref={ref}
        data-slot="popover-description"
        className={mergeClassName("text-sm text-pui-muted-foreground", className)}
        {...props}
      />
    );
  },
);
