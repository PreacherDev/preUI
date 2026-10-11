import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
export const Tabs = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseTabs.Root>, TabsProps>(function Tabs(
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

/**
 * Row of tabs on a hairline; the underline of the active tab sits on top of it.
 * Arrow keys move the focus, Enter / Space or a click activate (Base UI's default). `activateOnFocus` switches on
 * focus instead — then focus coming back to a tab (e.g. from a closing dialog) switches the tab as well.
 */
export const TabsList = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseTabs.List>, TabsListProps>(function TabsList(
  { className, activateOnFocus = false, ...props },
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
export const TabsTrigger = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseTabs.Tab>, TabsTriggerProps>(function TabsTrigger(
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

// Set by TabsStack: its panels stay mounted and share one grid cell.
const TabsStackContext = /* @__PURE__ */ createContext(false);

/** Content of one tab. Inside a `TabsStack` it stays mounted while inactive and only turns invisible. */
export const TabsContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseTabs.Panel>, TabsContentProps>(function TabsContent(
  { className, keepMounted, ...props },
  ref,
) {
  const stacked = useContext(TabsStackContext);
  return (
    <BaseTabs.Panel
      ref={ref}
      data-slot="tabs-content"
      data-stacked={stacked ? "" : undefined}
      keepMounted={keepMounted ?? stacked}
      className={mergeClassName(
        cn(
          // flex-auto, not flex-1: still fills a taller Tabs, but its basis is the content / an explicit height, so
          // `h-96` on the panel works (flex-1's basis 0 ignored it).
          "flex-auto text-sm outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
          // Every panel in the stack's single grid cell. `block` beats the `[hidden] { display: none }` rule (a
          // `flex` / `grid` from className replaces it), so a hidden panel keeps its size and only turns invisible.
          // Keyed on `inert` too: Base UI sets it the moment a panel turns inactive, `hidden` only a frame later, so
          // both panels would show for that frame. No transitions inside an inactive panel, or its elements would
          // fade out after the switch.
          stacked &&
            "block min-h-0 min-w-0 [grid-area:1/1] [&[hidden]]:invisible [&[inert]]:invisible [&[hidden]_*]:!transition-none [&[inert]_*]:!transition-none",
        ),
        className,
      )}
      {...props}
    />
  );
});

export type TabsStackProps = HTMLAttributes<HTMLDivElement>;

/**
 * Wrap the `TabsContent`s in it to keep every panel mounted (state, scroll position and inputs survive a switch)
 * and stacked in one grid cell: the area is as large as the largest panel, so switching tabs never shifts the
 * layout. Inactive panels are invisible and inert. Give it a height (`flex-1 min-h-0`, `h-96`) and the panels a
 * `ScrollArea` when they should scroll inside.
 */
export const TabsStack = /* @__PURE__ */ forwardRef<HTMLDivElement, TabsStackProps>(function TabsStack(
  { className, ...props },
  ref,
) {
  return (
    <TabsStackContext.Provider value>
      <div
        ref={ref}
        data-slot="tabs-stack"
        className={cn("grid min-h-0 flex-auto grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]", className)}
        {...props}
      />
    </TabsStackContext.Provider>
  );
});

export interface TabsBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Right-aligned element on the baseline of the tabs, e.g. a button. */
  action?: ReactNode;
}

// When a tab is scrolled into view, it keeps this distance from the edge so it does not sit under the edge fade.
const EDGE_GAP = 40;

/** Scrolls the viewport horizontally (only the viewport, never the page) until the active tab is fully visible. */
function revealActiveTab(viewport: HTMLElement, smooth: boolean) {
  if (viewport.scrollWidth <= viewport.clientWidth) return;
  const tab = viewport.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  if (!tab) return;
  const view = viewport.getBoundingClientRect();
  const rect = tab.getBoundingClientRect();
  const gap = Math.min(EDGE_GAP, Math.max(0, (view.width - rect.width) / 2));
  let delta = 0;
  if (rect.left < view.left + gap) delta = rect.left - view.left - gap;
  else if (rect.right > view.right - gap) delta = rect.right - view.right + gap;
  const max = viewport.scrollWidth - viewport.clientWidth;
  const left = Math.min(max, Math.max(0, viewport.scrollLeft + delta));
  if (left === viewport.scrollLeft) return;
  if (smooth && typeof viewport.scrollTo === "function") viewport.scrollTo({ left, behavior: "smooth" });
  else viewport.scrollLeft = left;
}

/**
 * Tab list plus a trailing action on the same baseline. Put a `TabsList` inside; the bar draws the
 * hairline instead of the list. When space runs out the tabs scroll horizontally (no wrapping, the action
 * stays inside the bar): the side where more tabs follow fades out, and the active tab is scrolled into view
 * whenever it changes.
 */
export const TabsBar = /* @__PURE__ */ forwardRef<HTMLDivElement, TabsBarProps>(function TabsBar(
  { className, action, children, ...props },
  ref,
) {
  const viewport = useRef<HTMLDivElement | null>(null);
  const viewportRef = useCallback((node: HTMLDivElement | null) => {
    viewport.current = node;
  }, []);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    revealActiveTab(node, false);
    if (typeof MutationObserver === "undefined") return;
    const reducedMotion =
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const observer = new MutationObserver((records) => {
      if (records.some((record) => (record.target as Element).getAttribute("aria-selected") === "true")) {
        revealActiveTab(node, !reducedMotion?.matches);
      }
    });
    observer.observe(node, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
    return () => observer.disconnect();
  }, []);

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
          action out. The 1px overlap (-mb-px + pb-px) keeps the active underline on the bar's hairline. The
          ScrollArea fades the edge on the side where more tabs follow. */}
      <ScrollArea
        data-slot="tabs-bar-list"
        orientation="horizontal"
        reserveTrack={false}
        viewportRef={viewportRef}
        // The tabs are the keyboard stops (focusing one scrolls it into view); the viewport needs no extra stop.
        viewportProps={{ tabIndex: -1 }}
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
