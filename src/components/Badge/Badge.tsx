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
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export interface BadgeProps extends Omit<useRender.ComponentProps<"span">, "ref"> {
  variant?: BadgeVariant;
}

/** Small tinted status pill. Use `render` to swap the element, e.g. `render={<a href="…" />}`. */
export const Badge = /* @__PURE__ */ forwardRef<HTMLElement, BadgeProps>(function Badge(
  { variant, className, render, ...props },
  ref,
) {
  return useRender({
    defaultTagName: "span",
    render,
    ref,
    props: {
      "data-slot": "badge",
      "data-variant": variant ?? "default",
      className: cn(badgeVariants({ variant }), className),
      ...props,
    },
  });
});
