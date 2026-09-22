import { useRender } from "@base-ui/react/use-render";
import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { buttonVariants, type ButtonSize } from "../Button/Button";

export type PaginationProps = ComponentPropsWithoutRef<"nav">;

/** Navigation landmark for page controls. Override the label with `aria-label`. */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  { className, "aria-label": ariaLabel = "Pagination", ...props },
  ref,
) {
  return (
    <nav
      ref={ref}
      aria-label={ariaLabel}
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center text-xs text-pui-muted-foreground", className)}
      {...props}
    />
  );
});

export type PaginationContentProps = ComponentPropsWithoutRef<"ul">;

/** The pill-shaped control container. */
export const PaginationContent = forwardRef<HTMLUListElement, PaginationContentProps>(function PaginationContent(
  { className, ...props },
  ref,
) {
  return (
    <ul
      ref={ref}
      data-slot="pagination-content"
      className={cn(
        "flex flex-row items-center gap-1 rounded-full border border-pui-border bg-pui-card p-0.5",
        className,
      )}
      {...props}
    />
  );
});

export type PaginationItemProps = ComponentPropsWithoutRef<"li">;

export const PaginationItem = forwardRef<HTMLLIElement, PaginationItemProps>(function PaginationItem(props, ref) {
  return <li ref={ref} data-slot="pagination-item" {...props} />;
});

export interface PaginationLinkProps extends Omit<useRender.ComponentProps<"a">, "ref"> {
  /** Marks the current page (`aria-current="page"`). */
  isActive?: boolean;
  size?: ButtonSize;
}

// Pagination buttons are round and one step more compact than regular buttons (handoff: 28px).
const compactSize: Partial<Record<ButtonSize, string>> = {
  "icon-sm": "size-7",
  sm: "h-7",
};

/**
 * A page link, styled like a round ghost button (active: outline + accent fill).
 * Use `render` for router links; set `aria-disabled` to disable it: the link is then dimmed, removed from the
 * tab order (`tabIndex={-1}`) and clicks / Enter don't activate it (the click is prevented, `onClick` isn't called).
 */
export const PaginationLink = forwardRef<HTMLAnchorElement, PaginationLinkProps>(function PaginationLink(
  { className, isActive = false, size = "icon-sm", render, onClick, tabIndex, ...props },
  ref,
) {
  const disabled = props["aria-disabled"] === true || props["aria-disabled"] === "true";
  return useRender({
    defaultTagName: "a",
    render,
    ref,
    props: {
      "aria-current": isActive ? "page" : undefined,
      "data-slot": "pagination-link",
      "data-active": isActive || undefined,
      "data-variant": isActive ? "outline" : "ghost",
      "data-size": size,
      className: cn(
        buttonVariants({ variant: isActive ? "outline" : "ghost", size }),
        compactSize[size],
        "rounded-full text-xs tabular-nums",
        "aria-disabled:pointer-events-none aria-disabled:opacity-50",
        isActive && "border-pui-border bg-pui-accent text-pui-foreground",
        className,
      ),
      ...props,
      tabIndex: disabled ? -1 : tabIndex,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      },
    },
  });
});

export interface PaginationPreviousProps extends PaginationLinkProps {
  /** Visible text (hidden on small screens). */
  label?: string;
}

export const PaginationPrevious = forwardRef<HTMLAnchorElement, PaginationPreviousProps>(function PaginationPrevious(
  { className, label = "Previous", "aria-label": ariaLabel = "Go to previous page", size = "sm", ...props },
  ref,
) {
  const ChevronLeft = useIcon("chevronLeft");
  return (
    <PaginationLink
      ref={ref}
      aria-label={ariaLabel}
      size={size}
      className={cn("gap-1 px-2.5 sm:pl-2", className)}
      {...props}
    >
      <ChevronLeft aria-hidden="true" />
      <span className="hidden sm:block">{label}</span>
    </PaginationLink>
  );
});

export interface PaginationNextProps extends PaginationLinkProps {
  /** Visible text (hidden on small screens). */
  label?: string;
}

export const PaginationNext = forwardRef<HTMLAnchorElement, PaginationNextProps>(function PaginationNext(
  { className, label = "Next", "aria-label": ariaLabel = "Go to next page", size = "sm", ...props },
  ref,
) {
  const ChevronRight = useIcon("chevronRight");
  return (
    <PaginationLink
      ref={ref}
      aria-label={ariaLabel}
      size={size}
      className={cn("gap-1 px-2.5 sm:pr-2", className)}
      {...props}
    >
      <span className="hidden sm:block">{label}</span>
      <ChevronRight aria-hidden="true" />
    </PaginationLink>
  );
});

export interface PaginationEllipsisProps extends ComponentPropsWithoutRef<"span"> {
  /** Screen-reader text (read by assistive technology, the icon itself is hidden). Default `"More pages"`. */
  label?: string;
}

export const PaginationEllipsis = forwardRef<HTMLSpanElement, PaginationEllipsisProps>(function PaginationEllipsis(
  { className, label = "More pages", ...props },
  ref,
) {
  const More = useIcon("more");
  return (
    <span
      ref={ref}
      data-slot="pagination-ellipsis"
      className={cn("flex size-7 items-center justify-center", className)}
      {...props}
    >
      {/* Only the icon is hidden from assistive technology; the label is read. */}
      <More className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
});
