import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import { createContext, forwardRef, useContext, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";
import { Toggle, type ToggleProps, type ToggleSize, type ToggleVariant } from "../Toggle/Toggle";

export const toggleGroupVariants = /* @__PURE__ */ cva(
  [
    "inline-flex items-center data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  ],
  {
    variants: {
      variant: {
        /** Segmented control: framed track, compact h-6 items (chart ranges, short filters). */
        segmented: "gap-0.5 rounded-pui-md border border-pui-border bg-pui-background p-0.5",
        /** Loose row of regular toggles, e.g. inside a toolbar. */
        default: "gap-1",
      },
    },
    defaultVariants: {
      variant: "segmented",
    },
  },
);

export type ToggleGroupVariant = NonNullable<VariantProps<typeof toggleGroupVariants>["variant"]>;

interface ToggleGroupContextValue {
  size?: ToggleSize;
  itemVariant?: ToggleVariant;
}

const ToggleGroupContext = /* @__PURE__ */ createContext<ToggleGroupContextValue>({});

export interface ToggleGroupProps extends ComponentPropsWithoutRef<typeof BaseToggleGroup> {
  variant?: ToggleGroupVariant;
  /** Size of every item. Defaults to `segment` for the segmented variant, `default` otherwise. */
  size?: ToggleSize;
  /** Toggle variant of every item (only meaningful for `variant="default"`). */
  itemVariant?: ToggleVariant;
}

/**
 * Shared state for a set of toggles. Single choice by default (`value` is still a `string[]`);
 * pass `multiple` for several.
 */
export const ToggleGroup = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseToggleGroup>, ToggleGroupProps>(
  function ToggleGroup({ className, variant = "segmented", size, itemVariant, ...props }, ref) {
    const itemSize = size ?? (variant === "segmented" ? "segment" : "default");
    return (
      <ToggleGroupContext.Provider value={{ size: itemSize, itemVariant }}>
        <BaseToggleGroup
          ref={ref}
          data-slot="toggle-group"
          data-variant={variant}
          data-size={itemSize}
          className={mergeClassName(toggleGroupVariants({ variant }), className)}
          {...props}
        />
      </ToggleGroupContext.Provider>
    );
  },
);

export interface ToggleGroupItemProps extends ToggleProps {
  /** Identifies the item inside the group. */
  value: string;
}

/** A toggle inside a `ToggleGroup`; size and variant come from the group unless set here. */
export const ToggleGroupItem = /* @__PURE__ */ forwardRef<ComponentRef<typeof Toggle>, ToggleGroupItemProps>(
  function ToggleGroupItem({ size, variant, ...props }, ref) {
    const context = useContext(ToggleGroupContext);
    return (
      <Toggle
        ref={ref}
        data-slot="toggle-group-item"
        size={size ?? context.size}
        variant={variant ?? context.itemVariant}
        {...props}
      />
    );
  },
);
