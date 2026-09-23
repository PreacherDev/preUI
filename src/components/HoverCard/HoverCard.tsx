import { PreviewCard as BasePreviewCard } from "@base-ui/react/preview-card";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";

export const HoverCard = BasePreviewCard.Root;

export type HoverCardProps = BasePreviewCard.Root.Props;
export type HoverCardTriggerProps = BasePreviewCard.Trigger.Props;

/** The link that opens the card on hover. Renders an `<a>` (`data-slot="hover-card-trigger"`). */
export const HoverCardTrigger = /* @__PURE__ */ forwardRef<HTMLAnchorElement, HoverCardTriggerProps>(
  function HoverCardTrigger(props, ref) {
    return <BasePreviewCard.Trigger ref={ref} data-slot="hover-card-trigger" {...props} />;
  },
) as unknown as typeof BasePreviewCard.Trigger;

export interface HoverCardContentProps extends ComponentPropsWithoutRef<typeof BasePreviewCard.Popup> {
  side?: BasePreviewCard.Positioner.Props["side"];
  align?: BasePreviewCard.Positioner.Props["align"];
  sideOffset?: BasePreviewCard.Positioner.Props["sideOffset"];
  /** Shift along the alignment axis (px). Default `0`. */
  alignOffset?: BasePreviewCard.Positioner.Props["alignOffset"];
  /** Further props for the Positioner (e.g. `collisionPadding`, `sticky`, `anchor`, `className`). */
  positionerProps?: Omit<BasePreviewCard.Positioner.Props, "side" | "align" | "sideOffset" | "alignOffset">;
  /** Element the portal renders into (Base UI Portal `container`); defaults to `document.body`. */
  container?: BasePreviewCard.Portal.Props["container"];
}

/** Portal + Positioner + Popup in one, styled as a floating surface like Popover. */
export const HoverCardContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BasePreviewCard.Popup>, HoverCardContentProps>(
  function HoverCardContent({ className, side = "bottom", align = "center", sideOffset = 6, alignOffset = 0, positionerProps, container, ...props }, ref) {
    return (
      <BasePreviewCard.Portal data-slot="hover-card-portal" container={container}>
        <BasePreviewCard.Positioner
          data-slot="hover-card-positioner"
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          {...positionerProps}
          className={mergeClassName("z-50 outline-none", positionerProps?.className)}
        >
          <BasePreviewCard.Popup
            ref={ref}
            data-slot="hover-card-content"
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
        </BasePreviewCard.Positioner>
      </BasePreviewCard.Portal>
    );
  },
);
