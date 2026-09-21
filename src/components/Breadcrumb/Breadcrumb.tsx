import { useRender } from "@base-ui/react/use-render";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";

export type BreadcrumbProps = ComponentPropsWithoutRef<"nav">;

/** Navigation landmark for a breadcrumb trail. Override the label with `aria-label`. */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  { "aria-label": ariaLabel = "Breadcrumb", ...props },
  ref,
) {
  return <nav ref={ref} aria-label={ariaLabel} data-slot="breadcrumb" {...props} />;
});

export type BreadcrumbListProps = ComponentPropsWithoutRef<"ol">;

export const BreadcrumbList = forwardRef<HTMLOListElement, BreadcrumbListProps>(function BreadcrumbList(
  { className, ...props },
  ref,
) {
  return (
    <ol
      ref={ref}
      data-slot="breadcrumb-list"
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-pui-muted-foreground sm:gap-2",
        className,
      )}
      {...props}
    />
  );
});

export type BreadcrumbItemProps = ComponentPropsWithoutRef<"li">;

export const BreadcrumbItem = forwardRef<HTMLLIElement, BreadcrumbItemProps>(function BreadcrumbItem(
  { className, ...props },
  ref,
) {
  return (
    <li ref={ref} data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1.5", className)} {...props} />
  );
});

export interface BreadcrumbLinkProps extends Omit<useRender.ComponentProps<"a">, "ref"> {}

/** A link in the trail. Use `render` for router links: `<BreadcrumbLink render={<Link to="/" />}>`. */
export const BreadcrumbLink = forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(function BreadcrumbLink(
  { className, render, ...props },
  ref,
) {
  return useRender({
    defaultTagName: "a",
    render,
    ref,
    props: {
      "data-slot": "breadcrumb-link",
      className: cn(
        "rounded-pui-sm transition-colors duration-pui-fast ease-pui hover:text-pui-foreground",
        "focus-visible:outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
        className,
      ),
      ...props,
    },
  });
});

export type BreadcrumbPageProps = ComponentPropsWithoutRef<"span">;

/** The current page — the last, non-interactive entry. */
export const BreadcrumbPage = forwardRef<HTMLSpanElement, BreadcrumbPageProps>(function BreadcrumbPage(
  { className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      data-slot="breadcrumb-page"
      className={cn("font-normal text-pui-foreground", className)}
      {...props}
    />
  );
});

export type BreadcrumbSeparatorProps = ComponentPropsWithoutRef<"li">;

/** Chevron between items; pass children to use a different glyph. */
export const BreadcrumbSeparator = forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(function BreadcrumbSeparator(
  { className, children, ...props },
  ref,
) {
  const ChevronRight = useIcon("chevronRight");
  return (
    <li
      ref={ref}
      role="presentation"
      aria-hidden="true"
      data-slot="breadcrumb-separator"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
});

export interface BreadcrumbEllipsisProps extends ComponentPropsWithoutRef<"span"> {
  /** Screen-reader text. */
  label?: string;
}

/** Placeholder for collapsed items (e.g. as a dropdown trigger). */
export const BreadcrumbEllipsis = forwardRef<HTMLSpanElement, BreadcrumbEllipsisProps>(function BreadcrumbEllipsis(
  { className, label = "More", ...props },
  ref,
) {
  const More = useIcon("more");
  return (
    <span
      ref={ref}
      role="presentation"
      aria-hidden="true"
      data-slot="breadcrumb-ellipsis"
      className={cn("flex size-5 items-center justify-center", className)}
      {...props}
    >
      <More className="size-4" />
      <span className="sr-only">{label}</span>
    </span>
  );
});
