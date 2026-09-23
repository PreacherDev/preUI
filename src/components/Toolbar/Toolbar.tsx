import { Toolbar as BaseToolbar } from "@base-ui/react/toolbar";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";
import { toggleVariants, type ToggleSize, type ToggleVariant } from "../Toggle/Toggle";

export const toolbarVariants = /* @__PURE__ */ cva(
  [
    "flex items-center gap-1",
    "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
  ],
  {
    variants: {
      variant: {
        /** Bare row of controls. */
        default: "",
        /** Framed panel look (card surface, hairline border). */
        panel: "rounded-pui-md border border-pui-border bg-pui-card p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type ToolbarVariant = NonNullable<VariantProps<typeof toolbarVariants>["variant"]>;

export interface ToolbarProps extends ComponentPropsWithoutRef<typeof BaseToolbar.Root> {
  variant?: ToolbarVariant;
}

/** Container with arrow-key navigation for buttons, toggles, links and inputs. Give it an `aria-label`. */
export const Toolbar = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseToolbar.Root>, ToolbarProps>(function Toolbar(
  { className, variant, ...props },
  ref,
) {
  return (
    <BaseToolbar.Root
      ref={ref}
      data-slot="toolbar"
      data-variant={variant ?? "default"}
      className={mergeClassName(toolbarVariants({ variant }), className)}
      {...props}
    />
  );
});

export type ToolbarGroupProps = ComponentPropsWithoutRef<typeof BaseToolbar.Group>;

/** Groups related toolbar items. */
export const ToolbarGroup = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseToolbar.Group>, ToolbarGroupProps>(
  function ToolbarGroup({ className, ...props }, ref) {
    return (
      <BaseToolbar.Group
        ref={ref}
        data-slot="toolbar-group"
        className={mergeClassName(
          "flex items-center gap-0.5 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
          className,
        )}
        {...props}
      />
    );
  },
);

export interface ToolbarButtonProps extends ComponentPropsWithoutRef<typeof BaseToolbar.Button> {
  variant?: ToggleVariant;
  /** Defaults to `sm` (small control height), or use `icon-sm` for icon-only buttons. */
  size?: ToggleSize;
}

/**
 * Toolbar button, styled like a `Toggle` (same classes, so `render={<Toggle size="sm" />}` composes cleanly
 * into a pressable toolbar item).
 */
export const ToolbarButton = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseToolbar.Button>, ToolbarButtonProps>(
  function ToolbarButton({ className, variant, size = "sm", type = "button", ...props }, ref) {
    return (
      <BaseToolbar.Button
        ref={ref}
        type={type}
        data-slot="toolbar-button"
        data-variant={variant ?? "default"}
        data-size={size}
        className={mergeClassName(toggleVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

export type ToolbarLinkProps = ComponentPropsWithoutRef<typeof BaseToolbar.Link>;

/** Text link inside a toolbar. */
export const ToolbarLink = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseToolbar.Link>, ToolbarLinkProps>(
  function ToolbarLink({ className, ...props }, ref) {
    return (
      <BaseToolbar.Link
        ref={ref}
        data-slot="toolbar-link"
        className={mergeClassName(
          [
            "inline-flex h-pui-control-sm items-center rounded-pui-md px-2.5 text-xs font-medium text-pui-muted-foreground no-underline outline-none",
            "transition-colors duration-pui-fast ease-pui hover:text-pui-foreground",
            "focus-visible:ring-pui focus-visible:ring-pui-ring",
          ],
          className,
        )}
        {...props}
      />
    );
  },
);

export type ToolbarInputProps = ComponentPropsWithoutRef<typeof BaseToolbar.Input>;

/** Compact (small control height) text field that takes part in toolbar keyboard navigation. */
export const ToolbarInput = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseToolbar.Input>, ToolbarInputProps>(
  function ToolbarInput({ className, ...props }, ref) {
    return (
      <BaseToolbar.Input
        ref={ref}
        data-slot="toolbar-input"
        className={mergeClassName(
          [
            "h-pui-control-sm min-w-0 rounded-pui-md border border-pui-input bg-pui-background px-2.5 text-xs text-pui-foreground outline-none",
            "placeholder:text-pui-muted-foreground transition-colors duration-pui-fast ease-pui focus-visible:border-pui-ring",
            "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          ],
          className,
        )}
        {...props}
      />
    );
  },
);

export type ToolbarSeparatorProps = ComponentPropsWithoutRef<typeof BaseToolbar.Separator>;

/** Hairline between toolbar groups; runs perpendicular to the toolbar. */
export const ToolbarSeparator = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseToolbar.Separator>, ToolbarSeparatorProps>(
  function ToolbarSeparator({ className, ...props }, ref) {
    return (
      <BaseToolbar.Separator
        ref={ref}
        data-slot="toolbar-separator"
        className={mergeClassName(
          [
            "shrink-0 bg-pui-border",
            "data-[orientation=vertical]:mx-1 data-[orientation=vertical]:h-5 data-[orientation=vertical]:w-px",
            "data-[orientation=horizontal]:my-1 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-auto",
          ],
          className,
        )}
        {...props}
      />
    );
  },
);
