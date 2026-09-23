import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn, mergeClassName } from "../../utils/cn";

/**
 * Colour of the bar. Convention: `primary` running, `positive` complete, `warning` above 85% capacity,
 * `negative` failed/over limit, `muted` inactive.
 */
export const progressIndicatorVariants = /* @__PURE__ */ cva(
  [
    "h-full rounded-full transition-all duration-pui-slow ease-pui",
    // Indeterminate (value={null}): a 40% bar sliding across the track; with reduced motion a dimmed full bar.
    "data-[indeterminate]:absolute data-[indeterminate]:inset-y-0 data-[indeterminate]:left-0 data-[indeterminate]:w-2/5 data-[indeterminate]:transition-none",
    "motion-safe:data-[indeterminate]:animate-pui-progress-indeterminate",
    "motion-reduce:data-[indeterminate]:w-full motion-reduce:data-[indeterminate]:opacity-50",
  ],
  {
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
  },
);

export type ProgressTone = NonNullable<VariantProps<typeof progressIndicatorVariants>["tone"]>;

export interface ProgressProps extends ComponentPropsWithoutRef<typeof BaseProgress.Root> {
  tone?: ProgressTone;
  /**
   * Locale for formatting the value (`ProgressValue`, `aria-valuetext`) with `Intl.NumberFormat`.
   * Default `"en-US"` — not the runtime locale, so server and client render the same text. Pass e.g. `"de-DE"`.
   */
  locale?: Intl.LocalesArgument;
  /** Classes for the track (e.g. `h-2`). */
  trackClassName?: string;
  /** Classes for the bar. */
  indicatorClassName?: string;
}

/**
 * 4px pill bar (Root + Track + Indicator). `value={null}` is indeterminate (animated sliding bar, static with
 * `prefers-reduced-motion`). Optional `ProgressLabel` /
 * `ProgressValue` children sit on one row above the bar.
 */
export const Progress = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseProgress.Root>, ProgressProps>(function Progress(
  { className, tone, trackClassName, indicatorClassName, locale = "en-US", children, ...props },
  ref,
) {
  return (
    <BaseProgress.Root
      ref={ref}
      locale={locale}
      data-slot="progress"
      data-variant={tone ?? "primary"}
      className={mergeClassName("flex w-full flex-wrap items-center gap-x-3 gap-y-1.5", className)}
      {...props}
    >
      {children}
      <BaseProgress.Track
        data-slot="progress-track"
        className={cn("relative h-1 w-full basis-full overflow-hidden rounded-full bg-pui-muted", trackClassName)}
      >
        <BaseProgress.Indicator data-slot="progress-indicator" className={cn(progressIndicatorVariants({ tone }), indicatorClassName)} />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
});

export type ProgressLabelProps = ComponentPropsWithoutRef<typeof BaseProgress.Label>;

/** Accessible label, left on the row above the bar. */
export const ProgressLabel = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseProgress.Label>, ProgressLabelProps>(
  function ProgressLabel({ className, ...props }, ref) {
    return (
      <BaseProgress.Label
        ref={ref}
        data-slot="progress-label"
        className={mergeClassName("text-xs font-medium text-pui-muted-foreground", className)}
        {...props}
      />
    );
  },
);

export type ProgressValueProps = ComponentPropsWithoutRef<typeof BaseProgress.Value>;

/** Formatted value, right-aligned on the row above the bar. */
export const ProgressValue = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseProgress.Value>, ProgressValueProps>(
  function ProgressValue({ className, ...props }, ref) {
    return (
      <BaseProgress.Value
        ref={ref}
        data-slot="progress-value"
        className={mergeClassName("ml-auto text-xs tabular-nums text-pui-muted-foreground", className)}
        {...props}
      />
    );
  },
);
