import { forwardRef } from "react";
import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from "react-resizable-panels";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";

export type ResizablePanelGroupProps = Omit<GroupProps, "elementRef">;

/**
 * Wraps resizable panels (react-resizable-panels 4 `Group`).
 * Use `orientation="horizontal" | "vertical"`; sizes like `defaultSize="30%"` (plain numbers are pixels in v4).
 */
export const ResizablePanelGroup = /* @__PURE__ */ forwardRef<HTMLDivElement, ResizablePanelGroupProps>(
  function ResizablePanelGroup({ className, orientation = "horizontal", ...props }, ref) {
    return (
      <Group
        elementRef={ref}
        data-slot="resizable-panel-group"
        orientation={orientation}
        data-orientation={orientation}
        className={cn("h-full w-full", className)}
        {...props}
      />
    );
  },
);

export type ResizablePanelProps = Omit<PanelProps, "elementRef">;

/** One resizable panel (react-resizable-panels 4 `Panel`). `className` styles the inner content element. */
export const ResizablePanel = /* @__PURE__ */ forwardRef<HTMLDivElement, ResizablePanelProps>(function ResizablePanel(
  props,
  ref,
) {
  return <Panel elementRef={ref} data-slot="resizable-panel" {...props} />;
});

export interface ResizableHandleProps extends Omit<SeparatorProps, "elementRef"> {
  /** Shows a small grip in the middle of the handle. */
  withHandle?: boolean;
}

/**
 * Drag/keyboard handle between two panels (react-resizable-panels 4 `Separator`).
 * The library sets `aria-orientation` (opposite of the group orientation) and `data-separator`
 * (`inactive | hover | active | focus | disabled`), which drive the styles.
 */
export const ResizableHandle = /* @__PURE__ */ forwardRef<HTMLDivElement, ResizableHandleProps>(function ResizableHandle(
  { withHandle = false, className, children, ...props },
  ref,
) {
  const Grip = useIcon("gripVertical");

  return (
    <Separator
      elementRef={ref}
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-px items-center justify-center bg-pui-border outline-none",
        "transition-colors duration-pui-fast ease-pui",
        // Enlarged invisible hit area.
        "after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2",
        "hover:bg-pui-ring data-[separator=hover]:bg-pui-ring data-[separator=active]:bg-pui-ring",
        "focus-visible:ring-pui focus-visible:ring-pui-ring",
        "data-[separator=disabled]:pointer-events-none data-[separator=disabled]:opacity-50",
        // Vertical groups render a horizontal separator.
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
        "aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:inset-y-auto",
        "aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:top-1/2",
        "aria-[orientation=horizontal]:after:h-2 aria-[orientation=horizontal]:after:w-full",
        "aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2",
        "[&[aria-orientation=horizontal]>[data-slot=resizable-grip]]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div
          data-slot="resizable-grip"
          aria-hidden="true"
          className="z-10 flex h-4 w-3 shrink-0 items-center justify-center rounded-pui-sm border border-pui-border bg-pui-border"
        >
          <Grip className="size-2.5 text-pui-muted-foreground" aria-hidden="true" />
        </div>
      )}
      {children}
    </Separator>
  );
});
