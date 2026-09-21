import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type CardProps = HTMLAttributes<HTMLDivElement>;

/** Content block on the card surface: 1px border, 8px radius, no shadow (the handoff "Panel"). */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        "flex flex-col rounded-pui border border-pui-border bg-pui-card text-pui-card-foreground",
        className,
      )}
      {...props}
    />
  );
});

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * Header bar with a bottom divider. Title and description stack in the first column,
 * a `CardAction` sits at the end — top-aligned with the title when there is a description, otherwise centred.
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(function CardHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "grid min-h-12 grid-cols-[1fr_auto] content-center items-center gap-x-3 border-b border-pui-border px-4 py-2",
        // With a description the action spans title + description and sits at the top right, level with
        // the title (like shadcn); otherwise the title stays vertically centred next to it.
        "[&:has(>[data-slot=card-description])>[data-slot=card-action]]:row-[1/span_2] [&:has(>[data-slot=card-description])>[data-slot=card-action]]:self-start",
        className,
      )}
      {...props}
    />
  );
});

export type CardTitleProps = HTMLAttributes<HTMLDivElement>;

export const CardTitle = forwardRef<HTMLDivElement, CardTitleProps>(function CardTitle(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="card-title"
      className={cn(
        "col-start-1 flex min-w-0 items-center gap-2 text-sm font-semibold leading-5",
        "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-pui-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});

export type CardDescriptionProps = HTMLAttributes<HTMLDivElement>;

export const CardDescription = forwardRef<HTMLDivElement, CardDescriptionProps>(function CardDescription(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="card-description"
      className={cn("col-start-1 text-xs text-pui-muted-foreground", className)}
      {...props}
    />
  );
});

export type CardActionProps = HTMLAttributes<HTMLDivElement>;

export const CardAction = forwardRef<HTMLDivElement, CardActionProps>(function CardAction(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="card-action"
      className={cn(
        "col-start-2 row-start-1 flex items-center gap-2 self-center justify-self-end",
        className,
      )}
      {...props}
    />
  );
});

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(function CardContent(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="card-content" className={cn("flex-1 p-4", className)} {...props} />;
});

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

/** Footer bar mirroring the header: top divider, actions in a row. */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(function CardFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn("flex min-h-12 items-center gap-2 border-t border-pui-border px-4 py-2", className)}
      {...props}
    />
  );
});
