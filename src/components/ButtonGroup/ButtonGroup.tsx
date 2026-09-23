import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn, mergeClassName } from "../../utils/cn";
import { useHasFallbackRef, type HasFallbackRule } from "../../utils/use-has-fallback";
import { Separator } from "../Separator/Separator";

export const buttonGroupVariants = /* @__PURE__ */ cva(
  [
    "flex w-fit items-stretch",
    "[&>*:focus-visible]:relative [&>*:focus-visible]:z-10",
    "[&>input]:flex-1",
    // A focused field outlines the whole group (its own left/top edge is covered by the neighbour).
    "rounded-pui-md transition-shadow duration-pui-fast ease-pui",
    "has-[>input:focus-visible]:ring-pui has-[>input:focus-visible]:ring-pui-ring",
    "has-[>textarea:focus-visible]:ring-pui has-[>textarea:focus-visible]:ring-pui-ring",
    // Same without :has() (Chromium < 105), attribute set by useHasFallback.
    "data-[has-focused-field]:ring-pui data-[has-focused-field]:ring-pui-ring",
    "[&>input:focus-visible]:border-pui-input [&>textarea:focus-visible]:border-pui-input",
    // Nested groups sit apart instead of merging.
    "has-[>[data-slot=button-group]]:gap-2 data-[has-nested-group]:gap-2",
  ],
  {
    variants: {
      orientation: {
        horizontal: [
          "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0",
          "[&>*:not(:last-child)]:rounded-r-none",
        ],
        vertical: [
          "flex-col",
          "[&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0",
          "[&>*:not(:last-child)]:rounded-b-none",
        ],
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  },
);

export type ButtonGroupOrientation = NonNullable<VariantProps<typeof buttonGroupVariants>["orientation"]>;

export interface ButtonGroupProps extends ComponentPropsWithoutRef<"div"> {
  orientation?: ButtonGroupOrientation;
}

const buttonGroupHasRules: HasFallbackRule[] = [
  { attr: "data-has-focused-field", has: ":scope > input:focus-visible, :scope > textarea:focus-visible" },
  { attr: "data-has-nested-group", has: ":scope > [data-slot=button-group]" },
];

/** Joins adjacent buttons, inputs and selects into one control by merging their borders and radii. */
export const ButtonGroup = /* @__PURE__ */ forwardRef<HTMLDivElement, ButtonGroupProps>(function ButtonGroup(
  { className, orientation = "horizontal", ...props },
  ref,
) {
  const groupRef = useHasFallbackRef(ref, buttonGroupHasRules);
  return (
    <div
      ref={groupRef}
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      aria-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
});

export interface ButtonGroupTextProps extends Omit<useRender.ComponentProps<"div">, "ref"> {}

/** Static label segment, e.g. a unit or prefix. Use `render={<label />}` to label an input. */
export const ButtonGroupText = /* @__PURE__ */ forwardRef<HTMLDivElement, ButtonGroupTextProps>(function ButtonGroupText(
  { className, render, ...props },
  ref,
) {
  return useRender({
    defaultTagName: "div",
    render,
    ref,
    props: {
      "data-slot": "button-group-text",
      className: cn(
        "flex items-center gap-2 rounded-pui-md border border-pui-border bg-pui-muted px-4 text-sm font-medium text-pui-muted-foreground",
        "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className,
      ),
      ...props,
    },
  });
});

export type ButtonGroupSeparatorProps = ComponentPropsWithoutRef<typeof Separator>;

/** Divider between grouped buttons that have no border of their own (e.g. ghost or solid). */
export const ButtonGroupSeparator = /* @__PURE__ */ forwardRef<ComponentRef<typeof Separator>, ButtonGroupSeparatorProps>(
  function ButtonGroupSeparator({ className, orientation = "vertical", ...props }, ref) {
    return (
      <Separator
        ref={ref}
        orientation={orientation}
        data-slot="button-group-separator"
        className={mergeClassName(
          "relative !m-0 self-stretch bg-pui-input data-[orientation=vertical]:h-auto",
          className,
        )}
        {...props}
      />
    );
  },
);
