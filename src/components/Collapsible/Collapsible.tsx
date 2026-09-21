import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { useIcon } from "../../icons";
import { mergeClassName } from "../../utils/cn";

export type CollapsibleProps = ComponentPropsWithoutRef<typeof BaseCollapsible.Root>;

/** Groups a trigger and its panel. Use `open`/`onOpenChange` or `defaultOpen`. */
export const Collapsible = forwardRef<ComponentRef<typeof BaseCollapsible.Root>, CollapsibleProps>(function Collapsible(
  props,
  ref,
) {
  return <BaseCollapsible.Root ref={ref} data-slot="collapsible" {...props} />;
});

export interface CollapsibleTriggerProps extends ComponentPropsWithoutRef<typeof BaseCollapsible.Trigger> {
  /** Hides the trailing chevron (e.g. when you render your own trigger content). */
  hideChevron?: boolean;
}

/** Text button with a chevron that turns 180° while the panel is open. */
export const CollapsibleTrigger = forwardRef<ComponentRef<typeof BaseCollapsible.Trigger>, CollapsibleTriggerProps>(
  function CollapsibleTrigger({ className, children, hideChevron = false, ...props }, ref) {
    const ChevronDown = useIcon("chevronDown");
    return (
      <BaseCollapsible.Trigger
        ref={ref}
        data-slot="collapsible-trigger"
        className={mergeClassName(
          [
            "group inline-flex items-center gap-2 rounded-pui-sm text-sm font-medium text-pui-foreground select-none outline-none",
            "transition-colors duration-pui-fast ease-pui",
            "focus-visible:ring-pui focus-visible:ring-pui-ring",
            "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          ],
          className,
        )}
        {...props}
      >
        {children}
        {!hideChevron && (
          <ChevronDown
            className="size-4 shrink-0 text-pui-muted-foreground transition-[transform,color] duration-pui-base ease-pui group-hover:text-pui-foreground group-data-[panel-open]:rotate-180"
            aria-hidden="true"
          />
        )}
      </BaseCollapsible.Trigger>
    );
  },
);

export type CollapsibleContentProps = ComponentPropsWithoutRef<typeof BaseCollapsible.Panel>;

/** Collapsible content; animates its height via `--collapsible-panel-height` (`--pui-duration-base`). */
export const CollapsibleContent = forwardRef<ComponentRef<typeof BaseCollapsible.Panel>, CollapsibleContentProps>(
  function CollapsibleContent({ className, ...props }, ref) {
    return (
      <BaseCollapsible.Panel
        ref={ref}
        data-slot="collapsible-content"
        className={mergeClassName(
          [
            "h-[var(--collapsible-panel-height)] overflow-hidden",
            "transition-[height] duration-pui-base ease-pui",
            "data-[starting-style]:h-0 data-[ending-style]:h-0",
          ],
          className,
        )}
        {...props}
      />
    );
  },
);

