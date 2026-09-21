import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";

/**
 * Classes for a two-state button.
 *
 * - Rest: muted text, transparent. Hover: faint accent fill + foreground text.
 * - Pressed (`data-pressed`): `bg-pui-accent text-pui-foreground`.
 *
 * Sizes follow Button (`sm` / `default` / `lg` = the control-height tokens, `icon`, `icon-sm`), plus `segment`:
 * the compact h-6 item of the segmented `ToggleGroup`, whose hover only changes the text colour.
 */
export const toggleVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-pui-md border border-transparent font-medium text-pui-muted-foreground",
    "transition-colors duration-pui-fast ease-pui",
    "hover:bg-pui-accent/60 hover:text-pui-foreground",
    "focus-visible:outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
    "data-[pressed]:bg-pui-accent data-[pressed]:text-pui-foreground",
    "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Borderless, for toolbars and dense rows. */
        default: "",
        /** Hairline border, for a standalone toggle next to fields. */
        outline: "border-pui-border",
      },
      size: {
        default: "h-pui-control px-3 text-sm",
        sm: "h-pui-control-sm px-2.5 text-xs",
        lg: "h-pui-control-lg px-4 text-sm",
        icon: "size-pui-control p-0",
        "icon-sm": "size-pui-control-sm p-0",
        /** Compact item of the segmented ToggleGroup. */
        segment: "h-6 gap-1.5 rounded-pui-sm px-2.5 text-xs hover:bg-transparent [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleVariantProps = VariantProps<typeof toggleVariants>;
export type ToggleVariant = NonNullable<ToggleVariantProps["variant"]>;
export type ToggleSize = NonNullable<ToggleVariantProps["size"]>;

export interface ToggleProps extends ComponentPropsWithoutRef<typeof BaseToggle> {
  variant?: ToggleVariant;
  size?: ToggleSize;
}

/** Two-state button (`pressed` / `defaultPressed` / `onPressedChange`). Give icon-only toggles an `aria-label`. */
export const Toggle = forwardRef<ComponentRef<typeof BaseToggle>, ToggleProps>(function Toggle(
  { className, variant, size, type = "button", ...props },
  ref,
) {
  return (
    <BaseToggle
      ref={ref}
      type={type}
      data-slot="toggle"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      className={mergeClassName(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
});
