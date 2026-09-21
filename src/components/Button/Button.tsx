import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-pui border border-transparent font-medium leading-none",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pui-ring",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-pui-primary text-pui-primary-foreground enabled:hover:bg-pui-primary-hover",
        secondary:
          "bg-pui-secondary text-pui-secondary-foreground enabled:hover:bg-pui-secondary-hover",
        outline:
          "border-pui-border bg-transparent text-pui-foreground enabled:hover:bg-pui-accent",
        ghost: "bg-transparent text-pui-foreground enabled:hover:bg-pui-accent",
        destructive:
          "bg-pui-destructive text-pui-destructive-foreground enabled:hover:bg-pui-destructive-hover",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem]",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;
export type ButtonVariant = NonNullable<ButtonVariantProps["variant"]>;
export type ButtonSize = NonNullable<ButtonVariantProps["size"]>;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  /** Any React node, e.g. an icon from lucide, heroicons, phosphor, ... */
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const iconClass = "inline-flex shrink-0 [&>svg]:h-[1.15em] [&>svg]:w-[1.15em]";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
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
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading ? (
        <Spinner className="h-[1.15em] w-[1.15em] shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon && (
          <span className={iconClass} aria-hidden="true">
            {leftIcon}
          </span>
        )
      )}
      {children}
      {rightIcon && !loading && (
        <span className={iconClass} aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
});
