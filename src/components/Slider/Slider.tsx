import { Slider as BaseSlider } from "@base-ui/react/slider";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ReactElement,
  type Ref,
  type RefAttributes,
} from "react";
import { mergeClassName, type StateClassName } from "../../utils/cn";

type SliderRawValue = number | readonly number[];

export type SliderProps<Value extends SliderRawValue = SliderRawValue> = BaseSlider.Root.Props<Value> & {
  /** Accessible label per thumb, e.g. `["Minimum", "Maximum"]` for a range. */
  thumbLabels?: string[];
  controlClassName?: StateClassName<BaseSlider.Control.State>;
  trackClassName?: StateClassName<BaseSlider.Track.State>;
  indicatorClassName?: StateClassName<BaseSlider.Indicator.State>;
  thumbClassName?: StateClassName<BaseSlider.Thumb.State>;
};

const thumbCount = (value: unknown) => (Array.isArray(value) ? value.length : 1);

/**
 * Slider: 4px muted track, primary indicator, 16px thumb. Pass an array as `value` / `defaultValue`
 * for a range; one thumb is rendered per value. `children` (e.g. `SliderLabel`, `SliderValue`) render
 * above the track.
 */
export const Slider = forwardRef(function Slider(
  {
    className,
    controlClassName,
    trackClassName,
    indicatorClassName,
    thumbClassName,
    thumbLabels,
    children,
    ...props
  }: SliderProps,
  ref: Ref<HTMLDivElement>,
) {
  const values = props.value ?? props.defaultValue;
  const count = thumbCount(values);
  const isRange = Array.isArray(values);

  return (
    <BaseSlider.Root
      ref={ref}
      data-slot="slider"
      className={mergeClassName(
        "flex w-full flex-col gap-1.5 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto",
        className,
      )}
      {...props}
    >
      {children}
      <BaseSlider.Control
        data-slot="slider-control"
        className={mergeClassName(
          [
            "flex w-full touch-none select-none items-center py-2",
            "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-32 data-[orientation=vertical]:w-auto",
            "data-[orientation=vertical]:justify-center data-[orientation=vertical]:px-2 data-[orientation=vertical]:py-0",
            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          ],
          controlClassName,
        )}
      >
        <BaseSlider.Track
          data-slot="slider-track"
          className={mergeClassName(
            "relative h-1 w-full select-none rounded-full bg-pui-muted data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1",
            trackClassName,
          )}
        >
          <BaseSlider.Indicator
            data-slot="slider-indicator"
            className={mergeClassName("select-none rounded-full bg-pui-primary", indicatorClassName)}
          />
          {Array.from({ length: count }, (_, index) => (
            <BaseSlider.Thumb
              key={index}
              data-slot="slider-thumb"
              index={isRange ? index : undefined}
              aria-label={thumbLabels?.[index]}
              className={mergeClassName(
                [
                  "block size-4 select-none rounded-full bg-pui-foreground shadow-[0_2px_4px_rgb(0_0_0/0.4)] outline-none",
                  "transition-shadow duration-pui-fast ease-pui",
                  "has-[:focus-visible]:ring-pui has-[:focus-visible]:ring-pui-ring",
                ],
                thumbClassName,
              )}
            />
          ))}
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}) as <Value extends SliderRawValue = SliderRawValue>(props: SliderProps<Value> & RefAttributes<HTMLDivElement>) => ReactElement;

/** Visible label for the slider; place it as a child of `Slider`. */
export const SliderLabel = forwardRef<ComponentRef<typeof BaseSlider.Label>, ComponentPropsWithoutRef<typeof BaseSlider.Label>>(
  function SliderLabel({ className, ...props }, ref) {
    return (
      <BaseSlider.Label
        ref={ref}
        data-slot="slider-label"
        className={mergeClassName("text-xs font-medium text-pui-muted-foreground", className)}
        {...props}
      />
    );
  },
);

/** Formatted current value (an `<output>`); place it as a child of `Slider`. */
export const SliderValue = forwardRef<ComponentRef<typeof BaseSlider.Value>, ComponentPropsWithoutRef<typeof BaseSlider.Value>>(
  function SliderValue({ className, ...props }, ref) {
    return (
      <BaseSlider.Value
        ref={ref}
        data-slot="slider-value"
        className={mergeClassName("text-xs tabular-nums text-pui-muted-foreground", className)}
        {...props}
      />
    );
  },
);
