import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ReactNode } from "react";
import { useIcon } from "../../icons";
import { mergeClassName } from "../../utils/cn";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-pui-md border border-transparent font-medium",
    "transition-colors duration-pui-fast ease-pui",
    "focus-visible:outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
    "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        /** Tinted accent button — the default call to action. */
        default: "border-pui-primary/tint-border bg-pui-primary/tint text-pui-primary hover:bg-pui-primary/tint-hover",
        /** Solid fill — reserved for the one confirming action in a dialog or wizard. */
        solid:
          "bg-pui-primary text-pui-primary-foreground hover:bg-pui-primary/90 focus-visible:ring-offset-pui focus-visible:ring-offset-pui-background",
        secondary:
          "border-pui-border bg-pui-secondary text-pui-secondary-foreground hover:bg-pui-accent",
        outline:
          "border-pui-border text-pui-foreground hover:bg-pui-accent hover:text-pui-accent-foreground",
        ghost:
          "text-pui-muted-foreground hover:bg-pui-accent hover:text-pui-accent-foreground",
        positive:
          "border-pui-positive/tint-border bg-pui-positive/tint text-pui-positive hover:bg-pui-positive/tint-hover",
        destructive:
          "border-pui-negative/tint-border bg-pui-negative/tint text-pui-negative hover:bg-pui-negative/tint-hover",
        /** Text-only, like a link. Hover changes the colour only (no underline, per the handoff). */
        link: "text-pui-primary hover:text-pui-primary/80",
      },
      size: {
        default: "h-pui-control px-3.5 text-sm",
        sm: "h-pui-control-sm px-2.5 text-xs",
        lg: "h-pui-control-lg px-5 text-sm",
        icon: "size-pui-control p-0",
        "icon-sm": "size-pui-control-sm p-0",
        "icon-lg": "size-pui-control-lg p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;
export type ButtonVariant = NonNullable<ButtonVariantProps["variant"]>;
export type ButtonSize = NonNullable<ButtonVariantProps["size"]>;

export interface ButtonProps extends BaseButton.Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  /** Any React node, e.g. an icon from lucide, heroicons, phosphor, ... */
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Button built on Base UI. Use `render` to swap the element (e.g. `render={<div />} nativeButton={false}`).
 * For links, style an `<a>` with `buttonVariants()` instead.
 */
export const Button = forwardRef<HTMLElement, ButtonProps>(function Button(
  {
    variant,
    size,
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    type = "button",
    className,
    children,
    ...props
  },
  ref,
) {
  const Spinner = useIcon("spinner");

  return (
    <BaseButton
      ref={ref}
      type={type}
      className={mergeClassName(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      {...props}
    >
      {loading ? (
        <Spinner data-slot="button-spinner" className="animate-spin" aria-hidden="true" />
      ) : (
        leftIcon && (
          <span data-slot="button-icon" data-position="left" className="inline-flex" aria-hidden="true">
            {leftIcon}
          </span>
        )
      )}
      {children}
      {rightIcon && !loading && (
        <span data-slot="button-icon" data-position="right" className="inline-flex" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </BaseButton>
  );
});
