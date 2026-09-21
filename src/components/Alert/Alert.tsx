import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export const alertVariants = cva(
  [
    "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-pui border px-4 py-3 text-sm",
    "has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3",
    "[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: "border-pui-border bg-pui-card text-pui-card-foreground [&>svg]:text-current",
        destructive:
          "border-pui-negative/tint-border bg-pui-negative/tint text-pui-foreground [&>svg]:text-pui-negative [&>[data-slot=alert-title]]:text-pui-negative",
        positive:
          "border-pui-positive/tint-border bg-pui-positive/tint text-pui-foreground [&>svg]:text-pui-positive [&>[data-slot=alert-title]]:text-pui-positive",
        warning:
          "border-pui-warning/tint-border bg-pui-warning/tint text-pui-foreground [&>svg]:text-pui-warning [&>[data-slot=alert-title]]:text-pui-warning",
        info: "border-pui-info/tint-border bg-pui-info/tint text-pui-foreground [&>svg]:text-pui-info [&>[data-slot=alert-title]]:text-pui-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

/** Callout for a short, important message. An optional leading `<svg>` icon gets its own grid column. */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { variant, className, role = "alert", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role={role}
      data-slot="alert"
      data-variant={variant ?? "default"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
});

export type AlertTitleProps = HTMLAttributes<HTMLDivElement>;

export const AlertTitle = forwardRef<HTMLDivElement, AlertTitleProps>(function AlertTitle(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="alert-title"
      className={cn("col-start-2 min-h-4 font-medium leading-5", className)}
      {...props}
    />
  );
});

export type AlertDescriptionProps = HTMLAttributes<HTMLDivElement>;

export const AlertDescription = forwardRef<HTMLDivElement, AlertDescriptionProps>(function AlertDescription(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm text-pui-muted-foreground [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
});
