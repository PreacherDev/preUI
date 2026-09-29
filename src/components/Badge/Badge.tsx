import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";

export const badgeVariants = /* @__PURE__ */ cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap",
    // Border colour lives in the variants: `badgeVariants()` is also used without tailwind-merge, where a base
    // `border-transparent` would win over `border-pui-border` by CSS order.
    "rounded-pui-md border px-2 py-0.5 text-xs font-medium",
    "transition-colors duration-pui-fast ease-pui",
    "focus-visible:outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
    "[&>svg]:pointer-events-none [&>svg]:size-3 [&>svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Primary tint — "there is something new here". */
        default: "border-transparent bg-pui-primary/tint text-pui-primary [a&]:hover:bg-pui-primary/tint-hover",
        /** Neutral — counts and plain labels. */
        secondary: "border-transparent bg-pui-muted text-pui-muted-foreground [a&]:hover:text-pui-foreground",
        destructive: "border-transparent bg-pui-negative/tint text-pui-negative [a&]:hover:bg-pui-negative/tint-hover",
        outline:
          "border-pui-border text-pui-muted-foreground [a&]:hover:bg-pui-accent [a&]:hover:text-pui-foreground",
        positive: "border-transparent bg-pui-positive/tint text-pui-positive [a&]:hover:bg-pui-positive/tint-hover",
        warning: "border-transparent bg-pui-warning/tint text-pui-warning [a&]:hover:bg-pui-warning/tint-hover",
        info: "border-transparent bg-pui-info/tint text-pui-info [a&]:hover:bg-pui-info/tint-hover",
      },
      /**
       * `solid`: opaque — two flat one-colour layers in `background-image`, the tint over `background` (Chromium 103
       * has no `color-mix()`; `background`, not `card`: the lighter dark card would drop the text below 4.5:1).
       * They cover the variant's see-through background colour, so no class has to override another
       * (`badgeVariants()` also works without tailwind-merge).
       */
      surface: {
        tint: "",
        solid: [
          "[--pui-badge-alpha:var(--pui-tint-rest)] [a&]:hover:[--pui-badge-alpha:var(--pui-tint-hover)]",
          "[background-image:linear-gradient(hsl(var(--pui-badge-tint)/var(--pui-badge-alpha)),hsl(var(--pui-badge-tint)/var(--pui-badge-alpha))),linear-gradient(hsl(var(--pui-background)),hsl(var(--pui-background)))]",
        ],
      },
    },
    compoundVariants: [
      { surface: "solid", variant: "default", className: "[--pui-badge-tint:var(--pui-primary)]" },
      { surface: "solid", variant: "destructive", className: "[--pui-badge-tint:var(--pui-negative)]" },
      { surface: "solid", variant: "positive", className: "[--pui-badge-tint:var(--pui-positive)]" },
      { surface: "solid", variant: "warning", className: "[--pui-badge-tint:var(--pui-warning)]" },
      { surface: "solid", variant: "info", className: "[--pui-badge-tint:var(--pui-info)]" },
      // Neutral ones are plain `background` (`muted` would vanish on a picture area, which usually is `muted`).
      { surface: "solid", variant: ["secondary", "outline"], className: "[--pui-badge-tint:var(--pui-background)]" },
    ],
    defaultVariants: {
      variant: "default",
      surface: "tint",
    },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
export type BadgeSurface = NonNullable<VariantProps<typeof badgeVariants>["surface"]>;

export interface BadgeProps extends Omit<useRender.ComponentProps<"span">, "ref"> {
  variant?: BadgeVariant;
  /**
   * `"tint"` (default): see-through tint. `"solid"`: opaque, for badges on pictures, videos or the game world.
   * @default "tint"
   */
  surface?: BadgeSurface;
}

/** Small tinted status pill. Use `render` to swap the element, e.g. `render={<a href="…" />}`. */
export const Badge = /* @__PURE__ */ forwardRef<HTMLElement, BadgeProps>(function Badge(
  { variant, surface, className, render, ...props },
  ref,
) {
  return useRender({
    defaultTagName: "span",
    render,
    ref,
    props: {
      "data-slot": "badge",
      "data-variant": variant ?? "default",
      "data-surface": surface ?? "tint",
      className: cn(badgeVariants({ variant, surface }), className),
      ...props,
    },
  });
});
