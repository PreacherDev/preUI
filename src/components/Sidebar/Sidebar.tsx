import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";
import { useHasFallbackRef, type HasFallbackRule } from "../../utils/use-has-fallback";
import { Button, type ButtonProps } from "../Button/Button";
import { Input, type InputProps } from "../Input/Input";
import { ScrollArea, type ScrollAreaProps } from "../ScrollArea/ScrollArea";
import { Separator, type SeparatorProps } from "../Separator/Separator";
import { Sheet, SheetDescription, SheetOverlay, SheetPortal, SheetTitle } from "../Sheet/Sheet";
import { Skeleton } from "../Skeleton/Skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type TooltipContentProps,
} from "../Tooltip/Tooltip";
import { useIsMobile } from "./useIsMobile";

/** Cookie in which `SidebarProvider` persists the desktop open state (`"true"` / `"false"`). */
export const SIDEBAR_COOKIE_NAME = "sidebar_state";
/** Lifetime of the `sidebar_state` cookie in seconds (7 days). */
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
/** Expanded rail width (handoff: 208px). */
export const SIDEBAR_WIDTH = "13rem";
/** Width of the sheet on small screens. */
export const SIDEBAR_WIDTH_MOBILE = "18rem";
/** Collapsed icon rail width (handoff: 56px). */
export const SIDEBAR_WIDTH_ICON = "3.5rem";
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";

/**
 * Reads the persisted desktop state from a `Cookie` header (or `document.cookie`). Returns `undefined` when the
 * cookie is missing or invalid. Call it where the request is available — server loader / layout — and pass the
 * result to `SidebarProvider`'s `defaultOpen`, so the server already renders the remembered state:
 *
 * ```tsx
 * const defaultOpen = getSidebarStateFromCookie(request.headers.get("cookie")) ?? true;
 * <SidebarProvider defaultOpen={defaultOpen}>…</SidebarProvider>
 * ```
 *
 * The provider never reads the cookie itself during render (that would differ between server and client).
 */
export function getSidebarStateFromCookie(
  cookieHeader: string | null | undefined,
  cookieName: string = SIDEBAR_COOKIE_NAME,
): boolean | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1 || part.slice(0, index).trim() !== cookieName) continue;
    const value = part.slice(index + 1).trim();
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
  }
  return undefined;
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

export interface SidebarContextValue {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean | ((open: boolean) => boolean)) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = /* @__PURE__ */ createContext<SidebarContextValue | null>(null);

/** Reads the sidebar state. Must be used inside `SidebarProvider`. */
export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

/* -------------------------------------------------------------------------------------------------
 * SidebarProvider
 * -----------------------------------------------------------------------------------------------*/

export interface SidebarProviderProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Initial open state (uncontrolled). To restore the persisted state, read the cookie on the server with
   * `getSidebarStateFromCookie(cookieHeader)` and pass it here.
   */
  defaultOpen?: boolean;
  /** Open state (controlled). Only affects the desktop sidebar; the mobile sheet has its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Key that toggles the sidebar together with Ctrl/Cmd. `false` disables the shortcut. */
  keyboardShortcut?: string | false;
  /**
   * Open delay (ms) of the `TooltipProvider` the provider wraps around the sidebar (menu button tooltips in the
   * icon rail). Default `0`.
   */
  tooltipDelay?: number;
}

// `has-[[data-variant=inset]]` for browsers without :has() (Chromium < 105).
const sidebarWrapperHasRules: HasFallbackRule[] = [
  { attr: "data-has-inset", has: ":scope > [data-slot=sidebar][data-variant=inset]" },
];

/**
 * Holds the sidebar state, sets `--sidebar-width` / `--sidebar-width-icon`, persists the desktop state in the
 * `sidebar_state` cookie (read it back with `getSidebarStateFromCookie` → `defaultOpen`) and toggles on
 * Ctrl/Cmd+B. Wraps `Sidebar` and `SidebarInset`.
 */
export const SidebarProvider = /* @__PURE__ */ forwardRef<HTMLDivElement, SidebarProviderProps>(function SidebarProvider(
  {
    defaultOpen = true,
    open: openProp,
    onOpenChange,
    keyboardShortcut = SIDEBAR_KEYBOARD_SHORTCUT,
    tooltipDelay = 0,
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  const isMobile = useIsMobile();
  const wrapperRef = useHasFallbackRef(ref, sidebarWrapperHasRules);
  const [openMobile, setOpenMobile] = useState(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = openProp ?? internalOpen;

  const setOpen = useCallback(
    (value: boolean | ((open: boolean) => boolean)) => {
      const next = typeof value === "function" ? value(open) : value;
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
      if (typeof document !== "undefined") {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      }
    },
    [open, openProp, onOpenChange],
  );

  const toggleSidebar = useCallback(() => {
    if (isMobile) setOpenMobile((value) => !value);
    else setOpen((value) => !value);
  }, [isMobile, setOpen]);

  useEffect(() => {
    if (!keyboardShortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === keyboardShortcut.toLowerCase() && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardShortcut, toggleSidebar]);

  const state = open ? "expanded" : "collapsed";

  const contextValue = useMemo<SidebarContextValue>(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delay={tooltipDelay}>
        <div
          ref={wrapperRef}
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as CSSProperties
          }
          className={cn(
            // --pui-viewport-height is 100svh where supported (set by the preset), else 100vh — Chromium < 108
            // (CEF / FiveM) has no svh units. One class, so `min-h-0` etc. in className still replaces it.
            "group/sidebar-wrapper flex min-h-[var(--pui-viewport-height,100vh)] w-full",
            "has-[[data-variant=inset]]:bg-pui-shell data-[has-inset]:bg-pui-shell",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
});

/* -------------------------------------------------------------------------------------------------
 * Sidebar
 * -----------------------------------------------------------------------------------------------*/

export interface SidebarProps extends ComponentPropsWithoutRef<"div"> {
  side?: "left" | "right";
  /** `sidebar`: flush rail with a border · `floating`: detached, rounded panel · `inset`: rail on the shell surface next to a bordered `SidebarInset`. */
  variant?: "sidebar" | "floating" | "inset";
  /** `offcanvas`: slides out completely · `icon`: collapses to the 56px icon rail · `none`: always expanded. */
  collapsible?: "offcanvas" | "icon" | "none";
  /** Accessible title of the mobile sheet (visually hidden). */
  mobileTitle?: string;
  /** Accessible description of the mobile sheet (visually hidden). */
  mobileDescription?: string;
}

/**
 * The side panel. On desktop it is a fixed column (`className` goes to that column — pass e.g. `absolute h-full`
 * to keep it inside a positioned container); below 768px it renders inside a `Sheet`.
 */
export const Sidebar = /* @__PURE__ */ forwardRef<HTMLDivElement, SidebarProps>(function Sidebar(
  {
    side = "left",
    variant = "sidebar",
    collapsible = "offcanvas",
    mobileTitle = "Sidebar",
    mobileDescription = "Displays the mobile sidebar.",
    className,
    style,
    children,
    ...props
  },
  ref,
) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        ref={ref}
        data-slot="sidebar"
        className={cn(
          "flex h-full w-[var(--sidebar-width)] flex-col bg-pui-shell text-pui-foreground",
          className,
        )}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    // Built from the Sheet parts rather than `SheetContent`: SheetContent scrolls its body in its own ScrollArea,
    // while the sidebar pins header/footer and scrolls only `SidebarContent`.
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetPortal>
          <SheetOverlay />
          <BaseDialog.Popup
            ref={ref}
            data-side={side}
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            className={cn(
              "fixed inset-y-0 z-50 flex h-full w-[var(--sidebar-width)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden",
              "border-pui-border bg-pui-shell text-sm text-pui-foreground shadow-pui-window outline-none",
              "transition-transform duration-pui-base ease-pui",
              side === "left"
                ? "left-0 border-r data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full"
                : "right-0 border-l data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full",
              className,
            )}
            style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE, ...style } as CSSProperties}
            {...props}
          >
            <SheetTitle className="sr-only">{mobileTitle}</SheetTitle>
            <SheetDescription className="sr-only">{mobileDescription}</SheetDescription>
            <div data-sidebar="sidebar" data-slot="sidebar-inner" className="flex h-full w-full flex-col">
              {children}
            </div>
          </BaseDialog.Popup>
        </SheetPortal>
      </Sheet>
    );
  }

  const detached = variant === "floating";

  return (
    <div
      className="group peer hidden text-pui-foreground md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* Reserves the sidebar's width in the flex layout. */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-[var(--sidebar-width)] bg-transparent transition-[width] duration-pui-base ease-pui",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          detached
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
            : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]",
        )}
      />
      <div
        ref={ref}
        data-slot="sidebar-container"
        className={cn(
          "fixed inset-y-0 z-10 hidden h-[var(--pui-viewport-height,100vh)] w-[var(--sidebar-width)] transition-[left,right,width] duration-pui-base ease-pui md:flex",
          side === "left"
            ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
            : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
          detached
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+_2px)]"
            : "group-data-[collapsible=icon]:w-[var(--sidebar-width-icon)]",
          variant === "sidebar" && "border-pui-border group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className,
        )}
        style={style}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className={cn(
            "flex h-full w-full flex-col bg-pui-shell",
            "group-data-[variant=floating]:rounded-pui group-data-[variant=floating]:border group-data-[variant=floating]:border-pui-border group-data-[variant=floating]:shadow-pui-floating",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------------------------------
 * SidebarTrigger / SidebarRail
 * -----------------------------------------------------------------------------------------------*/

export interface SidebarTriggerProps extends ButtonProps {
  /** Accessible label (visually hidden). */
  label?: string;
}

/** Ghost icon button that toggles the sidebar (sheet on mobile). */
export const SidebarTrigger = /* @__PURE__ */ forwardRef<HTMLElement, SidebarTriggerProps>(function SidebarTrigger(
  { label = "Toggle Sidebar", variant = "ghost", size = "icon-sm", onClick, children, ...props },
  ref,
) {
  const { toggleSidebar } = useSidebar();
  const PanelLeft = useIcon("panelLeft");
  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant={variant}
      size={size}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      {children ?? <PanelLeft aria-hidden="true" />}
      <span className="sr-only">{label}</span>
    </Button>
  );
});

export interface SidebarRailProps extends ComponentPropsWithoutRef<"button"> {
  /** Accessible label and hover title. */
  label?: string;
}

/** Thin, invisible hit area on the sidebar's edge that toggles it on click. */
export const SidebarRail = /* @__PURE__ */ forwardRef<HTMLButtonElement, SidebarRailProps>(function SidebarRail(
  { label = "Toggle Sidebar", className, onClick, ...props },
  ref,
) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      ref={ref}
      type="button"
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label={label}
      title={label}
      tabIndex={-1}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        toggleSidebar();
      }}
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 outline-none transition-all duration-pui-base ease-pui sm:flex",
        "group-data-[side=left]:-right-4 group-data-[side=right]:left-0",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] after:transition-colors after:duration-pui-fast hover:after:bg-pui-border",
        "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-pui-shell",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      {...props}
    />
  );
});

/* -------------------------------------------------------------------------------------------------
 * Layout parts
 * -----------------------------------------------------------------------------------------------*/

export type SidebarInsetProps = ComponentPropsWithoutRef<"main">;

/** The main content next to the sidebar. With `variant="inset"` it becomes the bordered content panel. */
export const SidebarInset = /* @__PURE__ */ forwardRef<HTMLElement, SidebarInsetProps>(function SidebarInset(
  { className, ...props },
  ref,
) {
  return (
    <main
      ref={ref}
      data-slot="sidebar-inset"
      className={cn(
        "relative flex w-full min-w-0 flex-1 flex-col bg-pui-background",
        "md:peer-data-[variant=inset]:m-3 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:overflow-hidden md:peer-data-[variant=inset]:rounded-pui md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:border-pui-border",
        "md:[.peer[data-variant=inset][data-collapsible=offcanvas]~&]:ml-3",
        className,
      )}
      {...props}
    />
  );
});

export type SidebarInputProps = InputProps;

/** Compact search/filter field for the sidebar header. */
export const SidebarInput = /* @__PURE__ */ forwardRef<HTMLInputElement, SidebarInputProps>(function SidebarInput(
  { className, size = "sm", ...props },
  ref,
) {
  return (
    <Input
      ref={ref}
      size={size}
      data-slot="sidebar-input"
      data-sidebar="input"
      className={mergeClassName("w-full bg-pui-background", className)}
      {...props}
    />
  );
});

export type SidebarHeaderProps = ComponentPropsWithoutRef<"div">;

export const SidebarHeader = /* @__PURE__ */ forwardRef<HTMLDivElement, SidebarHeaderProps>(function SidebarHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
});

export type SidebarFooterProps = ComponentPropsWithoutRef<"div">;

export const SidebarFooter = /* @__PURE__ */ forwardRef<HTMLDivElement, SidebarFooterProps>(function SidebarFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
});

export type SidebarSeparatorProps = SeparatorProps;

/** 1px hairline between groups; 24px wide in the icon rail. */
export const SidebarSeparator = /* @__PURE__ */ forwardRef<ComponentRef<typeof Separator>, SidebarSeparatorProps>(
  function SidebarSeparator({ className, ...props }, ref) {
    return (
      <Separator
        ref={ref}
        data-slot="sidebar-separator"
        data-sidebar="separator"
        className={mergeClassName(
          // In the icon rail the hairline shrinks to 24px, centred (handoff NavRail divider).
          "mx-2 my-0.5 bg-pui-border data-[orientation=horizontal]:w-auto group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:data-[orientation=horizontal]:w-6",
          className,
        )}
        {...props}
      />
    );
  },
);

export type SidebarContentProps = Omit<ScrollAreaProps, "orientation" | "reserveTrack">;

/**
 * Scrollable middle section holding the groups, built on `ScrollArea` (thumb on hover, nothing shifts).
 * `className` goes to the scroll area root; its `gap` is inherited by the column of groups, so shadcn-style
 * `className="gap-0"` still works. The thumb floats in the groups' 8px padding, so it never covers a button,
 * also not in the 56px icon rail. Horizontal overflow is clipped (the rail animates its width).
 */
export const SidebarContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof ScrollArea>, SidebarContentProps>(function SidebarContent(
  { className, viewportClassName, viewportProps, contentClassName, ...props },
  ref,
) {
  return (
    <ScrollArea
      ref={ref}
      data-slot="sidebar-content"
      data-sidebar="content"
      reserveTrack={false}
      className={mergeClassName("min-h-0 flex-1", className)}
      viewportClassName={cn("!overflow-x-hidden [gap:inherit]", viewportClassName)}
      // The menu buttons are the Tab stops; the scrolling viewport itself is not one.
      viewportProps={{ tabIndex: -1, ...viewportProps }}
      contentClassName={cn("flex !min-w-0 flex-col [gap:inherit]", contentClassName)}
      {...props}
    />
  );
});

/* -------------------------------------------------------------------------------------------------
 * Groups
 * -----------------------------------------------------------------------------------------------*/

export type SidebarGroupProps = ComponentPropsWithoutRef<"div">;

export const SidebarGroup = /* @__PURE__ */ forwardRef<HTMLDivElement, SidebarGroupProps>(function SidebarGroup(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
});

export interface SidebarGroupLabelProps extends Omit<useRender.ComponentProps<"div">, "ref"> {}

/** Eyebrow heading of a group; fades out in the icon rail. */
export const SidebarGroupLabel = /* @__PURE__ */ forwardRef<HTMLElement, SidebarGroupLabelProps>(function SidebarGroupLabel(
  { className, render, ...props },
  ref,
) {
  return useRender({
    defaultTagName: "div",
    render,
    ref,
    props: {
      "data-slot": "sidebar-group-label",
      "data-sidebar": "group-label",
      className: cn(
        "flex h-8 shrink-0 items-center rounded-pui-md px-[11px] text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground outline-none",
        "transition-[margin,opacity] duration-pui-base ease-pui focus-visible:ring-pui focus-visible:ring-pui-ring",
        "[&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className,
      ),
      ...props,
    },
  });
});

export interface SidebarGroupActionProps extends Omit<useRender.ComponentProps<"button">, "ref"> {}

/** Small icon button at the right of a group label (e.g. "add"). Give it an `aria-label`. */
export const SidebarGroupAction = /* @__PURE__ */ forwardRef<HTMLElement, SidebarGroupActionProps>(function SidebarGroupAction(
  { className, render, ...props },
  ref,
) {
  return useRender({
    defaultTagName: "button",
    render,
    ref,
    props: {
      "data-slot": "sidebar-group-action",
      "data-sidebar": "group-action",
      type: render ? undefined : "button",
      className: cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-pui-sm p-0 text-pui-muted-foreground outline-none",
        "transition-colors duration-pui-fast ease-pui hover:bg-pui-accent hover:text-pui-foreground focus-visible:ring-pui focus-visible:ring-pui-ring",
        "[&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        className,
      ),
      ...props,
    },
  });
});

export type SidebarGroupContentProps = ComponentPropsWithoutRef<"div">;

export const SidebarGroupContent = /* @__PURE__ */ forwardRef<HTMLDivElement, SidebarGroupContentProps>(
  function SidebarGroupContent({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        data-slot="sidebar-group-content"
        data-sidebar="group-content"
        className={cn("w-full text-sm", className)}
        {...props}
      />
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * Menu
 * -----------------------------------------------------------------------------------------------*/

export type SidebarMenuProps = ComponentPropsWithoutRef<"ul">;

// `group-has-[…]/menu-item` rules of the menu button, emulated for browsers without :has() (Chromium < 105).
const sidebarMenuHasRules: HasFallbackRule[] = [
  { attr: "data-has-action", has: "[data-sidebar=menu-action]", target: ":scope > [data-sidebar=menu-item]" },
  { attr: "data-has-badge", has: "[data-sidebar=menu-badge]", target: ":scope > [data-sidebar=menu-item]" },
];

export const SidebarMenu = /* @__PURE__ */ forwardRef<HTMLUListElement, SidebarMenuProps>(function SidebarMenu(
  { className, ...props },
  ref,
) {
  const menuRef = useHasFallbackRef(ref, sidebarMenuHasRules);
  return (
    <ul
      ref={menuRef}
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
});

export type SidebarMenuItemProps = ComponentPropsWithoutRef<"li">;

export const SidebarMenuItem = /* @__PURE__ */ forwardRef<HTMLLIElement, SidebarMenuItemProps>(function SidebarMenuItem(
  { className, ...props },
  ref,
) {
  return (
    <li
      ref={ref}
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
});

export const sidebarMenuButtonVariants = /* @__PURE__ */ cva(
  [
    "peer/menu-button flex w-full items-center overflow-hidden rounded-pui-md text-left text-pui-muted-foreground outline-none",
    "transition-[width,height,padding,color,background-color] duration-pui-base ease-pui",
    "hover:bg-pui-accent/50 hover:text-pui-foreground",
    "focus-visible:ring-pui focus-visible:ring-pui-ring",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "data-[active=true]:bg-pui-rail-active data-[active=true]:text-pui-foreground",
    "data-[popup-open]:bg-pui-accent/50 data-[popup-open]:text-pui-foreground",
    "group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 group-has-[[data-sidebar=menu-badge]]/menu-item:pr-8",
    "group-data-[has-action]/menu-item:pr-8 group-data-[has-badge]/menu-item:pr-8",
    "[&>span:last-child]:truncate [&>svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: "",
        outline: "border border-pui-border bg-pui-background",
      },
      size: {
        default:
          "h-pui-control-lg gap-3 px-[11px] text-sm [&>svg]:size-[18px] group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-[11px]",
        sm: "h-pui-control-sm gap-2 px-2 text-xs [&>svg]:size-4 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-3",
        lg: "h-12 gap-3 px-2 text-sm [&>svg]:size-[18px] group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface SidebarMenuButtonProps
  extends Omit<useRender.ComponentProps<"button">, "ref">,
    VariantProps<typeof sidebarMenuButtonVariants> {
  /** Marks the current page (`data-active="true"`, `aria-current="page"`). */
  isActive?: boolean;
  /** Shown to the right while the sidebar is collapsed to the icon rail. */
  tooltip?: string | TooltipContentProps;
}

/**
 * A navigation entry: 40px high (`--pui-control-h-lg`), 18px icon, label truncates. Use `render` for links:
 * `<SidebarMenuButton render={<a href="/lager" />}>`.
 */
export const SidebarMenuButton = /* @__PURE__ */ forwardRef<HTMLElement, SidebarMenuButtonProps>(function SidebarMenuButton(
  { render, isActive = false, variant = "default", size = "default", tooltip, className, ...props },
  ref,
) {
  const { isMobile, state } = useSidebar();

  const button = useRender({
    defaultTagName: "button",
    render,
    ref,
    props: {
      "data-slot": "sidebar-menu-button",
      "data-sidebar": "menu-button",
      "data-variant": variant,
      "data-size": size,
      "data-active": isActive,
      "aria-current": isActive ? "page" : undefined,
      type: render ? undefined : "button",
      className: cn(sidebarMenuButtonVariants({ variant, size }), className),
      ...props,
    },
  });

  if (!tooltip) return button;

  const tooltipProps: TooltipContentProps = typeof tooltip === "string" ? { children: tooltip } : tooltip;

  return (
    <Tooltip disabled={state !== "collapsed" || isMobile}>
      <TooltipTrigger render={button} />
      <TooltipContent side="right" align="center" sideOffset={8} {...tooltipProps} />
    </Tooltip>
  );
});

export interface SidebarMenuActionProps extends Omit<useRender.ComponentProps<"button">, "ref"> {
  /** Only visible while the menu item is hovered or focused (always visible on touch screens). */
  showOnHover?: boolean;
}

/** Icon button on the right edge of a menu item (e.g. "more"). Give it an `aria-label`. */
export const SidebarMenuAction = /* @__PURE__ */ forwardRef<HTMLElement, SidebarMenuActionProps>(function SidebarMenuAction(
  { className, render, showOnHover = false, ...props },
  ref,
) {
  return useRender({
    defaultTagName: "button",
    render,
    ref,
    props: {
      "data-slot": "sidebar-menu-action",
      "data-sidebar": "menu-action",
      type: render ? undefined : "button",
      className: cn(
        "absolute right-2 top-[calc((var(--pui-control-h-lg)_-_1.25rem)/2)] flex aspect-square w-5 items-center justify-center rounded-pui-sm p-0 text-pui-muted-foreground outline-none",
        "transition-[color,background-color,opacity] duration-pui-fast ease-pui hover:bg-pui-accent hover:text-pui-foreground focus-visible:ring-pui focus-visible:ring-pui-ring",
        "peer-hover/menu-button:text-pui-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 md:after:hidden",
        // Centred on the menu button; follows the control-height tokens (default 40px → 10px).
        "peer-data-[size=sm]/menu-button:top-[calc((var(--pui-control-h-sm)_-_1.25rem)/2)] peer-data-[size=default]/menu-button:top-[calc((var(--pui-control-h-lg)_-_1.25rem)/2)] peer-data-[size=lg]/menu-button:top-3.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active=true]/menu-button:text-pui-foreground data-[popup-open]:opacity-100 md:opacity-0",
        className,
      ),
      ...props,
    },
  });
});

/**
 * Colours of `SidebarMenuBadge`, named like `Badge`'s variants. Solid fills with their `-foreground` token (the
 * counter is tiny, a tint would be too faint); `destructive` uses the `negative` colour like `Badge`.
 */
export const sidebarMenuBadgeVariants = /* @__PURE__ */ cva("", {
  variants: {
    variant: {
      /** Primary — "something waits here". */
      default: "bg-pui-primary text-pui-primary-foreground",
      /** Neutral count. */
      secondary: "bg-pui-muted text-pui-muted-foreground",
      positive: "bg-pui-positive text-pui-positive-foreground",
      warning: "bg-pui-warning text-pui-warning-foreground",
      destructive: "bg-pui-negative text-pui-negative-foreground",
      info: "bg-pui-info text-pui-info-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export type SidebarMenuBadgeVariant = NonNullable<VariantProps<typeof sidebarMenuBadgeVariants>["variant"]>;

export interface SidebarMenuBadgeProps extends ComponentPropsWithoutRef<"div"> {
  /** Colour, named like `Badge`'s variants. Default `"default"` (primary). */
  variant?: SidebarMenuBadgeVariant;
}

/**
 * Round counter on the right of a menu item — "something waits here", not "new". In the collapsed icon rail it
 * sits on the icon's top-right corner. `variant` colours it (e.g. `destructive` for urgent items).
 */
export const SidebarMenuBadge = /* @__PURE__ */ forwardRef<HTMLDivElement, SidebarMenuBadgeProps>(function SidebarMenuBadge(
  { className, variant, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      data-variant={variant ?? "default"}
      className={cn(
        "pointer-events-none absolute right-2.5 top-[calc((var(--pui-control-h-lg)_-_1rem)/2)] flex h-4 min-w-4 select-none items-center justify-center rounded-full px-1",
        "text-pui-2xs font-semibold tabular-nums",
        sidebarMenuBadgeVariants({ variant }),
        "peer-data-[size=sm]/menu-button:top-[calc((var(--pui-control-h-sm)_-_1rem)/2)] peer-data-[size=default]/menu-button:top-[calc((var(--pui-control-h-lg)_-_1rem)/2)] peer-data-[size=lg]/menu-button:top-4",
        // Icon rail (handoff): the counter stays visible, pinned to the icon's top-right corner.
        "group-data-[collapsible=icon]:!left-6 group-data-[collapsible=icon]:!right-auto group-data-[collapsible=icon]:!top-1",
        className,
      )}
      {...props}
    />
  );
});

export interface SidebarMenuSkeletonProps extends ComponentPropsWithoutRef<"div"> {
  /** Adds an icon placeholder before the text line. */
  showIcon?: boolean;
  /**
   * Width of the text line (CSS length, numbers are px). Default: a pseudo-random 50–90 % derived from `useId`,
   * so it differs between skeletons but is identical on server and client (no hydration mismatch).
   */
  width?: string | number;
}

/** Deterministic 50–89 (%) from a string (FNV-1a hash). */
function skeletonWidthFromId(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return 50 + ((hash >>> 0) % 40);
}

/** Loading placeholder with the height of a (default) menu button. */
export const SidebarMenuSkeleton = /* @__PURE__ */ forwardRef<HTMLDivElement, SidebarMenuSkeletonProps>(
  function SidebarMenuSkeleton({ className, showIcon = false, width: widthProp, ...props }, ref) {
    const id = useId();
    const width =
      widthProp === undefined ? `${skeletonWidthFromId(id)}%` : typeof widthProp === "number" ? `${widthProp}px` : widthProp;
    return (
      <div
        ref={ref}
        data-slot="sidebar-menu-skeleton"
        data-sidebar="menu-skeleton"
        className={cn("flex h-pui-control-lg items-center gap-3 rounded-pui-md px-[11px]", className)}
        {...props}
      >
        {showIcon && (
          <Skeleton data-sidebar="menu-skeleton-icon" className="size-[18px] shrink-0 rounded-pui-sm" />
        )}
        <Skeleton
          data-sidebar="menu-skeleton-text"
          className="h-4 max-w-[var(--skeleton-width)] flex-1"
          style={{ "--skeleton-width": width } as CSSProperties}
        />
      </div>
    );
  },
);

export type SidebarMenuSubProps = ComponentPropsWithoutRef<"ul">;

/** Nested list, indented under the parent icon with a hairline. Hidden in the icon rail. */
export const SidebarMenuSub = /* @__PURE__ */ forwardRef<HTMLUListElement, SidebarMenuSubProps>(function SidebarMenuSub(
  { className, ...props },
  ref,
) {
  return (
    <ul
      ref={ref}
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "mx-5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-pui-border px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
});

export type SidebarMenuSubItemProps = ComponentPropsWithoutRef<"li">;

export const SidebarMenuSubItem = /* @__PURE__ */ forwardRef<HTMLLIElement, SidebarMenuSubItemProps>(function SidebarMenuSubItem(
  { className, ...props },
  ref,
) {
  return (
    <li
      ref={ref}
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  );
});

export interface SidebarMenuSubButtonProps extends Omit<useRender.ComponentProps<"a">, "ref"> {
  size?: "sm" | "md";
  isActive?: boolean;
}

/** Entry of a nested list. Renders an `<a>`; use `render` for router links. */
export const SidebarMenuSubButton = /* @__PURE__ */ forwardRef<HTMLElement, SidebarMenuSubButtonProps>(
  function SidebarMenuSubButton({ render, size = "md", isActive = false, className, ...props }, ref) {
    return useRender({
      defaultTagName: "a",
      render,
      ref,
      props: {
        "data-slot": "sidebar-menu-sub-button",
        "data-sidebar": "menu-sub-button",
        "data-size": size,
        "data-active": isActive,
        "aria-current": isActive ? "page" : undefined,
        className: cn(
          "flex h-pui-control-sm min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-pui-sm px-2 text-pui-muted-foreground outline-none",
          "transition-colors duration-pui-fast ease-pui hover:bg-pui-accent/50 hover:text-pui-foreground focus-visible:ring-pui focus-visible:ring-pui-ring",
          "aria-disabled:pointer-events-none aria-disabled:opacity-50",
          "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
          "data-[active=true]:bg-pui-rail-active data-[active=true]:text-pui-foreground",
          size === "sm" ? "text-xs" : "text-sm",
          "group-data-[collapsible=icon]:hidden",
          className,
        ),
        ...props,
      },
    });
  },
);
