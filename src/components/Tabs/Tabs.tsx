import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import { cn, mergeClassName } from "../../utils/cn";

export type TabsProps = ComponentPropsWithoutRef<typeof BaseTabs.Root>;

/**
 * Groups the tab list and its panels. Lays them out as a column (a row with `orientation="vertical"`).
 */
export const Tabs = forwardRef<ComponentRef<typeof BaseTabs.Root>, TabsProps>(function Tabs(
  { className, ...props },
  ref,
) {
  return (
    <BaseTabs.Root
      ref={ref}
      data-slot="tabs"
      className={mergeClassName("flex flex-col gap-4 data-[orientation=vertical]:flex-row", className)}
      {...props}
    />
  );
});

export type TabsListProps = ComponentPropsWithoutRef<typeof BaseTabs.List>;

/** Row of tabs on a hairline; the underline of the active tab sits on top of it. */
export const TabsList = forwardRef<ComponentRef<typeof BaseTabs.List>, TabsListProps>(function TabsList(
  // Arrow keys activate the tab right away, like shadcn/Radix (Base UI's default only moves focus).
  { className, activateOnFocus = true, ...props },
  ref,
) {
  return (
    <BaseTabs.List
      ref={ref}
      data-slot="tabs-list"
      activateOnFocus={activateOnFocus}
      className={mergeClassName(
        [
          "flex items-center gap-1 border-b border-pui-border",
          "data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-r",
        ],
        className,
      )}
      {...props}
    />
  );
});

export type TabsTriggerProps = ComponentPropsWithoutRef<typeof BaseTabs.Tab>;

/** A tab. The active one gets a 2px foreground underline, never a filled pill. */
export const TabsTrigger = forwardRef<ComponentRef<typeof BaseTabs.Tab>, TabsTriggerProps>(function TabsTrigger(
  { className, ...props },
  ref,
) {
  return (
    <BaseTabs.Tab
      ref={ref}
      data-slot="tabs-trigger"
      className={mergeClassName(
        [
          "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 pb-2.5 pt-1",
          "text-sm font-medium text-pui-muted-foreground select-none outline-none",
          "transition-colors duration-pui-fast ease-pui hover:text-pui-foreground",
          "focus-visible:ring-pui focus-visible:ring-inset focus-visible:ring-pui-ring",
          "data-[active]:border-pui-foreground data-[active]:text-pui-foreground",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "data-[orientation=vertical]:-mr-px data-[orientation=vertical]:mb-0 data-[orientation=vertical]:border-b-0 data-[orientation=vertical]:border-r-2 data-[orientation=vertical]:py-1.5",
        ],
        className,
      )}
      {...props}
    />
  );
});

export type TabsContentProps = ComponentPropsWithoutRef<typeof BaseTabs.Panel>;

/** Content of one tab. */
export const TabsContent = forwardRef<ComponentRef<typeof BaseTabs.Panel>, TabsContentProps>(function TabsContent(
  { className, ...props },
  ref,
) {
  return (
    <BaseTabs.Panel
      ref={ref}
      data-slot="tabs-content"
      className={mergeClassName(
        "flex-1 text-sm outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
        className,
      )}
      {...props}
    />
  );
});

export interface TabsBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Right-aligned element on the baseline of the tabs, e.g. a button. */
  action?: ReactNode;
}

/**
 * Tab list plus a trailing action on the same baseline. Put a `TabsList` inside; the bar draws the
 * hairline instead of the list. When space runs out the tabs scroll horizontally (no wrapping, the action
 * stays inside the bar).
 */
export const TabsBar = forwardRef<HTMLDivElement, TabsBarProps>(function TabsBar(
  { className, action, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="tabs-bar"
      className={cn(
        "flex items-end justify-between gap-4 border-b border-pui-border [&_[role=tablist]]:border-b-0",
        className,
      )}
      {...props}
    >
      {/* min-w-0 + flex-1: the list area may shrink below its content width and scrolls instead of pushing the
          action out. The 1px overlap (-mb-px + pb-px) keeps the active underline on the bar's hairline. */}
      <ScrollArea
        data-slot="tabs-bar-list"
        orientation="horizontal"
        reserveTrack={false}
        className="-mb-px min-w-0 flex-1"
        contentClassName="w-max pb-px"
      >
        {children}
      </ScrollArea>
      {action != null && (
        <div data-slot="tabs-bar-action" className="mb-2 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
});
