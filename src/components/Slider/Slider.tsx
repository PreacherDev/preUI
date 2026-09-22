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
import { useHasFallbackRef, type HasFallbackRule } from "../../utils/use-has-fallback";

type SliderRawValue = number | readonly number[];

export type SliderProps<Value extends SliderRawValue = SliderRawValue> = BaseSlider.Root.Props<Value> & {
  /**
   * Locale for formatting the value (`SliderValue`, `aria-valuetext`) with `Intl.NumberFormat`.
   * Default `"en-US"` — not the runtime locale, so server and client render the same text.
   */
  locale?: Intl.LocalesArgument;
  /** Accessible label per thumb, e.g. `["Minimum", "Maximum"]` for a range. */
  thumbLabels?: string[];
  controlClassName?: StateClassName<BaseSlider.Control.State>;
  trackClassName?: StateClassName<BaseSlider.Track.State>;
  indicatorClassName?: StateClassName<BaseSlider.Indicator.State>;
  thumbClassName?: StateClassName<BaseSlider.Thumb.State>;
};

// The thumb's focus ring (`has-[:focus-visible]`) for browsers without :has() (Chromium < 105).
const sliderHasRules: HasFallbackRule[] = [
  { attr: "data-has-focus-visible", has: ":focus-visible", target: "[data-slot=slider-thumb]" },
];

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
    locale = "en-US",
    children,
    ...props
  }: SliderProps,
  ref: Ref<HTMLDivElement>,
) {
  const values = props.value ?? props.defaultValue;
  const count = thumbCount(values);
  const isRange = Array.isArray(values);
  const rootRef = useHasFallbackRef(ref, sliderHasRules);

  return (
    <BaseSlider.Root
      ref={rootRef}
      data-slot="slider"
      locale={locale}
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
                  "block size-4 select-none rounded-full bg-pui-thumb shadow-pui-thumb outline-none",
                  "transition-shadow duration-pui-fast ease-pui",
                  "has-[:focus-visible]:ring-pui has-[:focus-visible]:ring-pui-ring",
                  // Same without :has() (Chromium < 105), attribute set by useHasFallback on the root.
                  "data-[has-focus-visible]:ring-pui data-[has-focus-visible]:ring-pui-ring",
                  // Base UI centres the thumb with the `translate` property (Chromium 104+); older engines
                  // (CEF / FiveM on Chromium 103) get the same offset as a transform.
                  "supports-[not_(translate:0)]:-translate-x-1/2 supports-[not_(translate:0)]:-translate-y-1/2",
                  "supports-[not_(translate:0)]:data-[orientation=vertical]:translate-y-1/2",
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
