import { Meter as BaseMeter } from "@base-ui/react/meter";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn, mergeClassName } from "../../utils/cn";

/** Colour of the bar, same scale as Progress (e.g. `warning` above 85% capacity). */
export const meterIndicatorVariants = cva("h-full rounded-full transition-all duration-pui-slow ease-pui", {
  variants: {
    tone: {
      primary: "bg-pui-primary",
      positive: "bg-pui-positive",
      warning: "bg-pui-warning",
      negative: "bg-pui-negative",
      muted: "bg-pui-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "primary",
  },
});

export type MeterTone = NonNullable<VariantProps<typeof meterIndicatorVariants>["tone"]>;

export interface MeterProps extends ComponentPropsWithoutRef<typeof BaseMeter.Root> {
  tone?: MeterTone;
  /** Classes for the track (e.g. `h-2`). */
  trackClassName?: string;
  /** Classes for the bar. */
  indicatorClassName?: string;
}

/**
 * A static measurement within a range (storage, quota), in the Progress look: 4px pill bar.
 * Optional `MeterLabel` / `MeterValue` children sit on one row above the bar.
 */
export const Meter = forwardRef<ComponentRef<typeof BaseMeter.Root>, MeterProps>(function Meter(
  { className, tone, trackClassName, indicatorClassName, children, ...props },
  ref,
) {
  return (
    <BaseMeter.Root
      ref={ref}
      data-slot="meter"
      data-variant={tone ?? "primary"}
      className={mergeClassName("flex w-full flex-wrap items-center gap-x-3 gap-y-1.5", className)}
      {...props}
    >
      {children}
      <BaseMeter.Track
        data-slot="meter-track"
        className={cn("relative h-1 w-full basis-full overflow-hidden rounded-full bg-pui-muted", trackClassName)}
      >
        <BaseMeter.Indicator data-slot="meter-indicator" className={cn(meterIndicatorVariants({ tone }), indicatorClassName)} />
      </BaseMeter.Track>
    </BaseMeter.Root>
  );
});

export type MeterLabelProps = ComponentPropsWithoutRef<typeof BaseMeter.Label>;

/** Accessible label, left on the row above the bar. */
export const MeterLabel = forwardRef<ComponentRef<typeof BaseMeter.Label>, MeterLabelProps>(function MeterLabel(
  { className, ...props },
  ref,
) {
  return (
    <BaseMeter.Label
      ref={ref}
      data-slot="meter-label"
      className={mergeClassName("text-xs font-medium text-pui-muted-foreground", className)}
      {...props}
    />
  );
});

export type MeterValueProps = ComponentPropsWithoutRef<typeof BaseMeter.Value>;

/** Formatted value, right-aligned on the row above the bar. */
export const MeterValue = forwardRef<ComponentRef<typeof BaseMeter.Value>, MeterValueProps>(function MeterValue(
  { className, ...props },
  ref,
) {
  return (
    <BaseMeter.Value
      ref={ref}
      data-slot="meter-value"
      className={mergeClassName("ml-auto text-xs tabular-nums text-pui-muted-foreground", className)}
      {...props}
    />
  );
});
