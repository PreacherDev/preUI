import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";

/** Shares open/close delays between tooltips; adjacent tooltips then open instantly. */
export const TooltipProvider = BaseTooltip.Provider;
export const Tooltip = BaseTooltip.Root;

export type TooltipProviderProps = BaseTooltip.Provider.Props;
export type TooltipProps = BaseTooltip.Root.Props;
export type TooltipTriggerProps = BaseTooltip.Trigger.Props;

/** The element the tooltip describes. Renders a `<button>` (`data-slot="tooltip-trigger"`). */
export const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(function TooltipTrigger(props, ref) {
  return <BaseTooltip.Trigger ref={ref} data-slot="tooltip-trigger" {...props} />;
}) as unknown as typeof BaseTooltip.Trigger;

export interface TooltipContentProps extends ComponentPropsWithoutRef<typeof BaseTooltip.Popup> {
  side?: BaseTooltip.Positioner.Props["side"];
  align?: BaseTooltip.Positioner.Props["align"];
  sideOffset?: BaseTooltip.Positioner.Props["sideOffset"];
  /** Shift along the alignment axis (px). Default `0`. */
  alignOffset?: BaseTooltip.Positioner.Props["alignOffset"];
  /** Further props for the Positioner (e.g. `collisionPadding`, `sticky`, `anchor`, `className`). */
  positionerProps?: Omit<BaseTooltip.Positioner.Props, "side" | "align" | "sideOffset" | "alignOffset">;
}

/** Portal + Positioner + Popup in one, on the lighter tooltip surface. */
export const TooltipContent = forwardRef<ComponentRef<typeof BaseTooltip.Popup>, TooltipContentProps>(
  function TooltipContent({ className, side = "top", align = "center", sideOffset = 6, alignOffset = 0, positionerProps, ...props }, ref) {
    return (
      <BaseTooltip.Portal data-slot="tooltip-portal">
        <BaseTooltip.Positioner
          data-slot="tooltip-positioner"
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          {...positionerProps}
          className={mergeClassName("z-50", positionerProps?.className)}
        >
          <BaseTooltip.Popup
            ref={ref}
            data-slot="tooltip-content"
            className={mergeClassName(
              [
                "max-w-64 rounded-pui-md bg-pui-tooltip px-2.5 py-1.5 text-xs font-medium leading-snug text-pui-tooltip-foreground shadow-pui-tooltip",
                "origin-[var(--transform-origin)] transition-[opacity,transform] duration-pui-base ease-pui",
                "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
                "data-[instant]:transition-none",
              ],
              className,
            )}
            {...props}
          />
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    );
  },
);
