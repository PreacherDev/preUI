import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn, mergeClassName } from "../../utils/cn";
import { useHasFallbackRef, type HasFallbackRule } from "../../utils/use-has-fallback";
import { Separator } from "../Separator/Separator";

export type ItemGroupProps = ComponentPropsWithoutRef<"div">;

/** `true` inside an `ItemGroup` (a `role="list"`), so plain `Item`s become its list items. */
const ItemGroupContext = createContext(false);

/**
 * Stacks items as a list (`role="list"`). Plain `Item`s inside get `role="listitem"`; an `Item` rendered as a
 * link or button (`render`) keeps its own role — wrap it in `<div role="listitem">` if the list semantics matter.
 */
export const ItemGroup = forwardRef<HTMLDivElement, ItemGroupProps>(function ItemGroup({ className, ...props }, ref) {
  return (
    <ItemGroupContext.Provider value={true}>
      <div
        ref={ref}
        role="list"
        data-slot="item-group"
        className={cn("group/item-group flex flex-col", className)}
        {...props}
      />
    </ItemGroupContext.Provider>
  );
});

export type ItemSeparatorProps = ComponentPropsWithoutRef<typeof Separator>;

export const ItemSeparator = forwardRef<ComponentRef<typeof Separator>, ItemSeparatorProps>(function ItemSeparator(
  { className, ...props },
  ref,
) {
  return (
    <Separator
      ref={ref}
      orientation="horizontal"
      data-slot="item-separator"
      className={mergeClassName("my-0", className)}
      {...props}
    />
  );
});

export const itemVariants = cva(
  [
    // Border colour lives in the variants so `itemVariants()` also works without tailwind-merge.
    "group/item flex flex-wrap items-center rounded-pui border text-sm text-pui-foreground",
    "outline-none transition-colors duration-pui-fast ease-pui",
    "focus-visible:ring-pui focus-visible:ring-pui-ring",
    "[a&]:hover:bg-pui-accent [button&]:hover:bg-pui-accent [button&]:text-left",
  ],
  {
    variants: {
      variant: {
        default: "border-transparent bg-transparent",
        outline: "border-pui-border",
        muted: "border-transparent bg-pui-muted/50",
      },
      size: {
        default: "gap-4 p-4",
        sm: "gap-2.5 px-4 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ItemVariantProps = VariantProps<typeof itemVariants>;
export type ItemVariant = NonNullable<ItemVariantProps["variant"]>;
export type ItemSize = NonNullable<ItemVariantProps["size"]>;

export interface ItemProps extends Omit<useRender.ComponentProps<"div">, "ref"> {
  variant?: ItemVariant;
  size?: ItemSize;
}

const itemHasRules: HasFallbackRule[] = [{ attr: "data-has-description", has: "[data-slot=item-description]" }];

/**
 * A row with media, content and actions. Use `render` to make it a link: `render={<a href="…" />}`.
 * Inside an `ItemGroup` a plain (non-`render`) item gets `role="listitem"`.
 */
export const Item = forwardRef<HTMLDivElement, ItemProps>(function Item(
  { className, variant = "default", size = "default", render, ...props },
  ref,
) {
  const inGroup = useContext(ItemGroupContext);
  const itemRef = useHasFallbackRef(ref, itemHasRules);
  return useRender({
    defaultTagName: "div",
    render,
    ref: itemRef,
    props: {
      role: inGroup && !render ? "listitem" : undefined,
      "data-slot": "item",
      "data-variant": variant,
      "data-size": size,
      className: cn(itemVariants({ variant, size }), className),
      ...props,
    },
  });
});

export const itemMediaVariants = cva(
  [
    "flex shrink-0 items-center justify-center gap-2 [&_svg]:pointer-events-none",
    "group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start",
    // Same without :has() (Chromium < 105): attribute set on the Item by useHasFallback.
    "group-data-[has-description]/item:translate-y-0.5 group-data-[has-description]/item:self-start",
  ],
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "size-8 rounded-pui-sm border border-pui-border bg-pui-muted text-pui-muted-foreground [&_svg:not([class*='size-'])]:size-4",
        image: "size-10 overflow-hidden rounded-pui-sm [&_img]:size-full [&_img]:object-cover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type ItemMediaVariant = NonNullable<VariantProps<typeof itemMediaVariants>["variant"]>;

export interface ItemMediaProps extends ComponentPropsWithoutRef<"div"> {
  variant?: ItemMediaVariant;
}

export const ItemMedia = forwardRef<HTMLDivElement, ItemMediaProps>(function ItemMedia(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="item-media"
      data-variant={variant}
      className={cn(itemMediaVariants({ variant }), className)}
      {...props}
    />
  );
});

export type ItemContentProps = ComponentPropsWithoutRef<"div">;

export const ItemContent = forwardRef<HTMLDivElement, ItemContentProps>(function ItemContent(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="item-content"
      className={cn("flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none", className)}
      {...props}
    />
  );
});

export type ItemTitleProps = ComponentPropsWithoutRef<"div">;

export const ItemTitle = forwardRef<HTMLDivElement, ItemTitleProps>(function ItemTitle({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="item-title"
      className={cn("flex w-fit items-center gap-2 text-sm font-medium leading-snug", className)}
      {...props}
    />
  );
});

export type ItemDescriptionProps = ComponentPropsWithoutRef<"p">;

export const ItemDescription = forwardRef<HTMLParagraphElement, ItemDescriptionProps>(function ItemDescription(
  { className, ...props },
  ref,
) {
  return (
    <p
      ref={ref}
      data-slot="item-description"
      className={cn(
        "line-clamp-2 text-balance text-sm font-normal leading-normal text-pui-muted-foreground",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-pui-foreground",
        className,
      )}
      {...props}
    />
  );
});

export type ItemActionsProps = ComponentPropsWithoutRef<"div">;

export const ItemActions = forwardRef<HTMLDivElement, ItemActionsProps>(function ItemActions(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="item-actions" className={cn("flex items-center gap-2", className)} {...props} />;
});

export type ItemHeaderProps = ComponentPropsWithoutRef<"div">;

/** Full-width row above the item content. */
export const ItemHeader = forwardRef<HTMLDivElement, ItemHeaderProps>(function ItemHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="item-header"
      className={cn("flex basis-full items-center justify-between gap-2", className)}
      {...props}
    />
  );
});

export type ItemFooterProps = ComponentPropsWithoutRef<"div">;

/** Full-width row below the item content. */
export const ItemFooter = forwardRef<HTMLDivElement, ItemFooterProps>(function ItemFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="item-footer"
      className={cn("flex basis-full items-center justify-between gap-2", className)}
      {...props}
    />
  );
});
