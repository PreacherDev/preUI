import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef, type MouseEvent } from "react";
import { cn, mergeClassName } from "../../utils/cn";
import { useHasFallbackRef, type HasFallbackRule } from "../../utils/use-has-fallback";
import { Button, type ButtonProps } from "../Button/Button";

export type InputGroupProps = ComponentPropsWithoutRef<"div">;

/**
 * A field-looking container that combines a borderless `InputGroupInput` / `InputGroupTextarea`
 * with addons (icons, text, buttons). Set `data-disabled` / `data-invalid` or let the control drive it.
 */
// Emulates the `has-[…]` rules below in browsers without :has() (Chromium < 105, e.g. CEF / FiveM).
const inputGroupHasRules: HasFallbackRule[] = [
  { attr: "data-has-textarea", has: ":scope > textarea" },
  { attr: "data-has-input", has: ":scope > input" },
  { attr: "data-has-inline-start", has: ":scope > [data-align=inline-start]" },
  { attr: "data-has-inline-end", has: ":scope > [data-align=inline-end]" },
  { attr: "data-has-block-start", has: ":scope > [data-align=block-start]" },
  { attr: "data-has-block-end", has: ":scope > [data-align=block-end]" },
  { attr: "data-has-disabled", has: ":disabled" },
  {
    attr: "data-has-invalid",
    has: "[data-slot=input-group-control][data-invalid], [data-slot=input-group-control][aria-invalid=true]",
  },
  { attr: "data-has-button", has: ":scope > button", target: ":scope > [data-slot=input-group-addon]" },
  { attr: "data-has-kbd", has: ":scope > kbd", target: ":scope > [data-slot=input-group-addon]" },
];

export const InputGroup = /* @__PURE__ */ forwardRef<HTMLDivElement, InputGroupProps>(function InputGroup(
  { className, ...props },
  ref,
) {
  const groupRef = useHasFallbackRef(ref, inputGroupHasRules);
  return (
    <div
      ref={groupRef}
      role="group"
      data-slot="input-group"
      className={cn(
        "group/input-group relative flex h-pui-control w-full min-w-0 items-center rounded-pui-md border border-pui-input bg-pui-background text-sm text-pui-foreground",
        "outline-none transition-colors duration-pui-fast ease-pui",
        "focus-within:border-pui-ring",
        // Height grows for textareas and block addons.
        // (Each `has-[…]` rule has a `data-[has-…]` twin for browsers without :has(), see inputGroupHasRules.)
        "has-[>textarea]:h-auto data-[has-textarea]:h-auto",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col",
        "data-[has-block-start]:h-auto data-[has-block-start]:flex-col",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col",
        "data-[has-block-end]:h-auto data-[has-block-end]:flex-col",
        // Tighter control padding next to inline addons.
        "[&:has(>[data-align=inline-start])>input]:pl-2 [&:has(>[data-align=inline-end])>input]:pr-2",
        "[&[data-has-inline-start]>input]:pl-2 [&[data-has-inline-end]>input]:pr-2",
        "[&:has(>[data-align=block-start])>input]:pb-3 [&:has(>[data-align=block-end])>input]:pt-3",
        "[&[data-has-block-start]>input]:pb-3 [&[data-has-block-end]>input]:pt-3",
        // States.
        "data-[disabled]:opacity-50 has-[:disabled]:opacity-50 data-[has-disabled]:opacity-50",
        "data-[invalid]:border-pui-negative data-[has-invalid]:border-pui-negative",
        "has-[[data-slot=input-group-control][data-invalid]]:border-pui-negative",
        "has-[[data-slot=input-group-control][aria-invalid=true]]:border-pui-negative",
        className,
      )}
      {...props}
    />
  );
});

export const inputGroupAddonVariants = /* @__PURE__ */ cva(
  [
    "flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium text-pui-muted-foreground",
    "[&>svg:not([class*='size-'])]:size-4 [&>svg]:pointer-events-none [&>svg]:shrink-0",
    "[&>kbd]:rounded-pui-sm",
  ],
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-3 has-[>button]:-ml-1.5 has-[>kbd]:-ml-1 data-[has-button]:-ml-1.5 data-[has-kbd]:-ml-1",
        "inline-end":
          "order-last pr-3 has-[>button]:-mr-1.5 has-[>kbd]:-mr-1 data-[has-button]:-mr-1.5 data-[has-kbd]:-mr-1",
        "block-start":
          "order-first w-full justify-start px-3 pt-3 [&.border-b]:pb-3 group-has-[>input]/input-group:pt-2.5 group-data-[has-input]/input-group:pt-2.5",
        "block-end":
          "order-last w-full justify-start px-3 pb-3 [&.border-t]:pt-3 group-has-[>input]/input-group:pb-2.5 group-data-[has-input]/input-group:pb-2.5",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

export type InputGroupAddonAlign = NonNullable<VariantProps<typeof inputGroupAddonVariants>["align"]>;

export interface InputGroupAddonProps extends ComponentPropsWithoutRef<"div"> {
  align?: InputGroupAddonAlign;
}

/** Icon, text or button next to the control. Clicking it (outside buttons) focuses the control. */
export const InputGroupAddon = /* @__PURE__ */ forwardRef<HTMLDivElement, InputGroupAddonProps>(function InputGroupAddon(
  { className, align = "inline-start", onClick, ...props },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || (event.target as HTMLElement).closest("button")) return;
    event.currentTarget.parentElement?.querySelector<HTMLElement>("input, textarea")?.focus();
  };
  return (
    <div
      ref={ref}
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={handleClick}
      {...props}
    />
  );
});

export const inputGroupButtonVariants = /* @__PURE__ */ cva("gap-2 shadow-none", {
  variants: {
    size: {
      xs: "h-6 gap-1 rounded-pui-sm px-2 text-xs [&_svg]:size-3.5",
      sm: "h-pui-control-sm gap-1.5 px-2.5 text-xs",
      "icon-xs": "size-6 rounded-pui-sm p-0 [&_svg]:size-3.5",
      "icon-sm": "size-pui-control-sm p-0",
    },
  },
  defaultVariants: {
    size: "xs",
  },
});

export type InputGroupButtonSize = NonNullable<VariantProps<typeof inputGroupButtonVariants>["size"]>;

export interface InputGroupButtonProps extends Omit<ButtonProps, "size"> {
  size?: InputGroupButtonSize;
}

/** Compact button for use inside an addon (ghost by default). */
export const InputGroupButton = /* @__PURE__ */ forwardRef<HTMLElement, InputGroupButtonProps>(function InputGroupButton(
  { className, variant = "ghost", size = "xs", ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      data-slot="input-group-button"
      data-size={size}
      className={mergeClassName(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
});

export type InputGroupTextProps = ComponentPropsWithoutRef<"span">;

/** Muted inline text such as a unit, prefix or counter. */
export const InputGroupText = /* @__PURE__ */ forwardRef<HTMLSpanElement, InputGroupTextProps>(function InputGroupText(
  { className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      data-slot="input-group-text"
      className={cn(
        "flex items-center gap-2 text-sm text-pui-muted-foreground",
        "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
});

const controlBase = [
  "flex-1 min-w-0 w-full rounded-none border-0 bg-transparent text-sm text-pui-foreground shadow-none outline-none",
  "placeholder:text-pui-muted-foreground",
  "disabled:cursor-not-allowed data-[disabled]:cursor-not-allowed",
];

export type InputGroupInputProps = ComponentPropsWithoutRef<typeof BaseInput>;

/** Borderless input for use in `InputGroup`. Built on Base UI Input, so it links to a surrounding `Field`. */
export const InputGroupInput = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseInput>, InputGroupInputProps>(
  function InputGroupInput({ className, ...props }, ref) {
    return (
      <BaseInput
        ref={ref}
        data-slot="input-group-control"
        className={mergeClassName([controlBase, "h-full px-3"], className)}
        {...props}
      />
    );
  },
);

export interface InputGroupTextareaProps
  extends Omit<ComponentPropsWithoutRef<typeof BaseField.Control>, "render" | "size"> {
  rows?: number;
  cols?: number;
  wrap?: string;
}

/** Borderless textarea for use in `InputGroup` (`Field.Control` rendered as `<textarea>`). */
export const InputGroupTextarea = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseField.Control>, InputGroupTextareaProps>(
  function InputGroupTextarea({ className, ...props }, ref) {
    return (
      <BaseField.Control
        ref={ref}
        render={<textarea />}
        data-slot="input-group-control"
        className={mergeClassName([controlBase, "min-h-16 resize-none px-3 py-3 leading-snug"], className)}
        {...props}
      />
    );
  },
);
