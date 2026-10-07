import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
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
  /** Icon before the text (sized like any `<svg>` child). With `reveal`, the icon is all that shows until opened. */
  icon?: ReactNode;
  /**
   * `"hover"`: only the `icon` shows; the text slides open while the badge (or, with `revealGroup`, its `group`
   * parent) is hovered or holds the focus — e.g. the reason on a locked card. Opens after `revealDelay`, closes at
   * once. The text stays readable for screen readers.
   */
  reveal?: "hover";
  /** ms before the text opens. @default 500 */
  revealDelay?: number;
  /** Open when the nearest parent with the `group` class is hovered (a card), not only the badge itself. */
  revealGroup?: boolean;
}

/**
 * The sliding text of a `reveal` badge. Chromium 103 can't transition `grid-template-columns`, so the text width is
 * measured into `--pui-badge-reveal-width` and `max-width` animates to it; measured again once the fonts have loaded
 * (a narrower fallback font would cut the last letter) and whenever the text changes size.
 */
function RevealLabel({ children, delay, group }: { children: ReactNode; delay: number; group: boolean }) {
  const outerRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => outer.style.setProperty("--pui-badge-reveal-width", `${inner.scrollWidth}px`);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(inner);
    let active = true;
    void inner.ownerDocument.fonts?.ready.then(() => active && measure());
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, []);
  return (
    <span
      ref={outerRef}
      data-slot="badge-label"
      style={{ "--pui-badge-reveal-delay": `${delay}ms` } as CSSProperties}
      className={cn(
        // Closed: no delay, so it closes at once; the open state carries the delay.
        "inline-block max-w-0 overflow-hidden opacity-0 transition-[max-width,opacity] duration-pui-base ease-pui",
        // Written out in full: Tailwind only finds class names that appear literally in the source.
        "group-hover/badge:max-w-[var(--pui-badge-reveal-width,0px)] group-hover/badge:opacity-100 group-hover/badge:[transition-delay:var(--pui-badge-reveal-delay)]",
        "group-focus-visible/badge:max-w-[var(--pui-badge-reveal-width,0px)] group-focus-visible/badge:opacity-100 group-focus-visible/badge:[transition-delay:var(--pui-badge-reveal-delay)]",
        group && [
          "group-hover:max-w-[var(--pui-badge-reveal-width,0px)] group-hover:opacity-100 group-hover:[transition-delay:var(--pui-badge-reveal-delay)]",
          "group-focus-within:max-w-[var(--pui-badge-reveal-width,0px)] group-focus-within:opacity-100 group-focus-within:[transition-delay:var(--pui-badge-reveal-delay)]",
        ],
      )}
    >
      <span ref={innerRef} className="inline-block whitespace-nowrap pl-1">
        {children}
      </span>
    </span>
  );
}

/** Small tinted status pill. Use `render` to swap the element, e.g. `render={<a href="…" />}`. */
export const Badge = /* @__PURE__ */ forwardRef<HTMLElement, BadgeProps>(function Badge(
  { variant, surface, icon, reveal, revealDelay = 500, revealGroup = false, className, render, children, ...props },
  ref,
) {
  const revealing = reveal === "hover";
  return useRender({
    defaultTagName: "span",
    render,
    ref,
    props: {
      "data-slot": "badge",
      "data-variant": variant ?? "default",
      "data-surface": surface ?? "tint",
      "data-reveal": revealing ? "hover" : undefined,
      className: cn(badgeVariants({ variant, surface }), revealing && "group/badge gap-0", className),
      ...props,
      children: revealing ? (
        <>
          {icon}
          <RevealLabel delay={revealDelay} group={revealGroup}>
            {children}
          </RevealLabel>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      ),
    },
  });
});
