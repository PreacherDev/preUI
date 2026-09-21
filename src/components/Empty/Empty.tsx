import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "../../utils/cn";

export type EmptyProps = ComponentPropsWithoutRef<"div">;

/** Centred empty state: muted icon, one plain sentence, optional content (e.g. an action). */
export const Empty = forwardRef<HTMLDivElement, EmptyProps>(function Empty({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center text-sm text-pui-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});

export type EmptyHeaderProps = ComponentPropsWithoutRef<"div">;

export const EmptyHeader = forwardRef<HTMLDivElement, EmptyHeaderProps>(function EmptyHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="empty-header"
      className={cn("flex max-w-sm flex-col items-center gap-2 text-center", className)}
      {...props}
    />
  );
});

export const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center text-pui-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Bare icon (handoff EmptyState: 24px, muted, 60 % opacity). */
        default: "bg-transparent [&_svg:not([class*='size-'])]:size-6 [&_svg]:opacity-60",
        /** Icon in a muted 40px box. */
        icon: "size-10 rounded-pui-md bg-pui-muted [&_svg:not([class*='size-'])]:size-6",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type EmptyMediaVariant = NonNullable<VariantProps<typeof emptyMediaVariants>["variant"]>;

export interface EmptyMediaProps extends ComponentPropsWithoutRef<"div"> {
  variant?: EmptyMediaVariant;
}

export const EmptyMedia = forwardRef<HTMLDivElement, EmptyMediaProps>(function EmptyMedia(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant }), className)}
      {...props}
    />
  );
});

export type EmptyTitleProps = ComponentPropsWithoutRef<"div">;

export const EmptyTitle = forwardRef<HTMLDivElement, EmptyTitleProps>(function EmptyTitle(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="empty-title"
      className={cn("text-sm font-medium text-pui-foreground", className)}
      {...props}
    />
  );
});

export type EmptyDescriptionProps = ComponentPropsWithoutRef<"p">;

export const EmptyDescription = forwardRef<HTMLParagraphElement, EmptyDescriptionProps>(function EmptyDescription(
  { className, ...props },
  ref,
) {
  return (
    <p
      ref={ref}
      data-slot="empty-description"
      className={cn(
        "text-sm leading-relaxed text-pui-muted-foreground",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a]:transition-colors [&>a:hover]:text-pui-foreground",
        className,
      )}
      {...props}
    />
  );
});

export type EmptyContentProps = ComponentPropsWithoutRef<"div">;

/** Slot for actions or extra content below the header. */
export const EmptyContent = forwardRef<HTMLDivElement, EmptyContentProps>(function EmptyContent(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="empty-content"
      className={cn("mt-2 flex w-full min-w-0 max-w-sm flex-col items-center gap-3 text-sm", className)}
      {...props}
    />
  );
});
