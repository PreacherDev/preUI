import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cva } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef, type CSSProperties, type ReactNode } from "react";
import { cn, mergeClassName } from "../../utils/cn";
import type { ProgressTone } from "../Progress/Progress";

/** Same tones as `Progress`: `primary` running, `positive` complete, `warning`, `negative`, `muted` inactive. */
export type ProgressCircleTone = ProgressTone;

/** Named sizes in px. A number passed as `size` is used as px directly. */
export type ProgressCircleSize = "sm" | "default" | "lg";

const namedSizes: Record<ProgressCircleSize, { px: number; thickness: number }> = {
  sm: { px: 32, thickness: 3 },
  default: { px: 48, thickness: 4 },
  lg: { px: 64, thickness: 5 },
};

/** Colour of the ring's arc (SVG stroke). */
export const progressCircleIndicatorVariants = /* @__PURE__ */ cva(
  [
    "fill-none transition-all duration-pui-slow ease-pui",
    // Indeterminate (value={null}): a quarter arc; the svg spins. With reduced motion a dimmed full ring.
    "data-[indeterminate]:transition-none",
    "motion-reduce:data-[indeterminate]:[stroke-dashoffset:0] motion-reduce:data-[indeterminate]:opacity-50",
  ],
  {
    variants: {
      tone: {
        primary: "stroke-pui-primary",
        positive: "stroke-pui-positive",
        warning: "stroke-pui-warning",
        negative: "stroke-pui-negative",
        muted: "stroke-pui-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "primary",
    },
  },
);

const sizeClasses: Record<ProgressCircleSize, string> = {
  sm: "size-8 text-pui-2xs",
  default: "size-12 text-xs",
  lg: "size-16 text-sm",
};

export interface ProgressCircleProps extends Omit<ComponentPropsWithoutRef<typeof BaseProgress.Root>, "children"> {
  tone?: ProgressCircleTone;
  /** `"sm"` 32px, `"default"` 48px, `"lg"` 64px, or a number in px. */
  size?: ProgressCircleSize | number;
  /** Stroke width in px (relative to the nominal size). Default 3 / 4 / 5 for sm / default / lg, 4 for numbers. */
  thickness?: number;
  /** Shows the formatted value in the centre (ignored when `children` are given). */
  showValue?: boolean;
  /** Content centred inside the ring, e.g. an icon or `<ProgressCircleValue />` with a render function. */
  children?: ReactNode;
  /**
   * Locale for formatting the value (`ProgressCircleValue`, `aria-valuetext`) with `Intl.NumberFormat`.
   * Default `"en-US"` — not the runtime locale, so server and client render the same text.
   */
  locale?: Intl.LocalesArgument;
  /** Classes for the track circle (e.g. `stroke-pui-border`). */
  trackClassName?: string;
  /** Classes for the indicator circle. */
  indicatorClassName?: string;
}

/**
 * Circular progress ring (Base UI Progress, `role="progressbar"`). `value={null}` is indeterminate (spinning arc,
 * a static dimmed ring with `prefers-reduced-motion`). Centre content via `children` or `showValue`.
 */
export const ProgressCircle = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseProgress.Root>, ProgressCircleProps>(
  function ProgressCircle(
    {
      className,
      style,
      tone,
      size = "default",
      thickness,
      showValue = false,
      locale = "en-US",
      value,
      min = 0,
      max = 100,
      trackClassName,
      indicatorClassName,
      children,
      ...props
    },
    ref,
  ) {
    const named = typeof size === "number" ? undefined : namedSizes[size];
    const px = named ? named.px : Math.max(1, size as number);
    const stroke = Math.min(thickness ?? named?.thickness ?? 4, px / 2);
    const radius = (px - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const indeterminate = value === null;
    const range = max - min;
    const fraction = indeterminate || range <= 0 ? 0 : Math.min(1, Math.max(0, (value - min) / range));
    const centre = px / 2;

    const sizeStyle: CSSProperties | undefined = named ? undefined : { width: px, height: px };
    const mergedStyle: ProgressCircleProps["style"] =
      typeof style === "function" ? (state) => ({ ...sizeStyle, ...style(state) }) : { ...sizeStyle, ...style };

    const content = children ?? (showValue ? <ProgressCircleValue /> : null);

    return (
      <BaseProgress.Root
        ref={ref}
        value={value}
        min={min}
        max={max}
        locale={locale}
        data-slot="progress-circle"
        data-variant={tone ?? "primary"}
        data-size={typeof size === "number" ? "custom" : size}
        className={mergeClassName(
          ["relative inline-flex shrink-0 items-center justify-center", named ? sizeClasses[size as ProgressCircleSize] : "text-xs"],
          className,
        )}
        style={mergedStyle}
        {...props}
      >
        <svg
          data-slot="progress-circle-svg"
          viewBox={`0 0 ${px} ${px}`}
          aria-hidden="true"
          focusable="false"
          className={cn("absolute inset-0 size-full", indeterminate && "motion-safe:animate-spin")}
        >
          <circle
            data-slot="progress-circle-track"
            cx={centre}
            cy={centre}
            r={radius}
            strokeWidth={stroke}
            className={cn("fill-none stroke-pui-muted", trackClassName)}
          />
          <circle
            data-slot="progress-circle-indicator"
            data-indeterminate={indeterminate ? "" : undefined}
            cx={centre}
            cy={centre}
            r={radius}
            strokeWidth={stroke}
            strokeLinecap="round"
            // Start at 12 o'clock and run clockwise.
            transform={`rotate(-90 ${centre} ${centre})`}
            strokeDasharray={circumference}
            // Indeterminate offset as attribute, so the reduced-motion class can override it.
            strokeDashoffset={indeterminate ? circumference * 0.75 : undefined}
            style={indeterminate ? undefined : { strokeDashoffset: circumference * (1 - fraction) }}
            className={cn(progressCircleIndicatorVariants({ tone }), indicatorClassName)}
          />
        </svg>
        {content != null && (
          <div
            data-slot="progress-circle-content"
            className="relative flex items-center justify-center font-medium tabular-nums text-pui-foreground"
          >
            {content}
          </div>
        )}
      </BaseProgress.Root>
    );
  },
);

export type ProgressCircleValueProps = ComponentPropsWithoutRef<typeof BaseProgress.Value>;

/** Formatted value for the centre of the ring (`showValue` renders it for you). */
export const ProgressCircleValue = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseProgress.Value>, ProgressCircleValueProps>(
  function ProgressCircleValue({ className, ...props }, ref) {
    return (
      <BaseProgress.Value
        ref={ref}
        data-slot="progress-circle-value"
        className={mergeClassName("tabular-nums", className)}
        {...props}
      />
    );
  },
);
