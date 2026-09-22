import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef, type Ref } from "react";
import { cn, mergeClassName } from "../../utils/cn";

export type ScrollAreaOrientation = "vertical" | "horizontal" | "both";

export interface ScrollAreaProps extends ComponentPropsWithoutRef<typeof BaseScrollArea.Root> {
  /** Which scrollbars to render. Default `vertical`. */
  orientation?: ScrollAreaOrientation;
  /** Classes for the scrollable viewport (e.g. `max-h-72`). */
  viewportClassName?: string;
  /** Ref to the scrolling element — for scrollIntoView logic, virtualisers or editors that need their scroll parent. */
  viewportRef?: Ref<HTMLDivElement>;
  /** Extra props for the viewport (e.g. `tabIndex={-1}` inside menus/lists that manage focus themselves). */
  viewportProps?: Omit<ComponentPropsWithoutRef<typeof BaseScrollArea.Viewport>, "className" | "children">;
  /** Classes for the content wrapper inside the viewport. */
  contentClassName?: string;
  /**
   * `true` (default): the 10px track is reserved as content padding, so nothing shifts when the thumb shows.
   * `false`: the thumb floats over the content — for tight surfaces like menus and lists.
   */
  reserveTrack?: boolean;
  /**
   * Fades the left/right edge while more content is hidden there, so horizontal overflow is visible
   * without hovering. Only with a horizontal scrollbar. Default `true`; editors with a caret turn it off.
   */
  edgeFade?: boolean;
}

// Mask stops come from per-root variables, reset on every root so nested areas don't inherit them.
const edgeFadeRoot =
  "[--pui-fade-start:0px] [--pui-fade-end:0px] data-[overflow-x-start]:[--pui-fade-start:2.5rem] data-[overflow-x-end]:[--pui-fade-end:2.5rem]";
// -webkit-mask-image for Chromium < 120 (e.g. CEF / FiveM on Chromium 103), which lacks the unprefixed property.
const edgeFadeViewport =
  "[-webkit-mask-image:linear-gradient(to_right,transparent,#000_var(--pui-fade-start),#000_calc(100%_-_var(--pui-fade-end)),transparent)] [mask-image:linear-gradient(to_right,transparent,#000_var(--pui-fade-start),#000_calc(100%_-_var(--pui-fade-end)),transparent)]";

/**
 * Root + Viewport + Content + Scrollbar(s) in one. The 10px track is always reserved (content padding),
 * so nothing shifts; the thumb only appears while the area is hovered or scrolled.
 * Constrain the height on the root (`className="h-72"`) or the viewport (`viewportClassName="max-h-72"`).
 */
export const ScrollArea = forwardRef<ComponentRef<typeof BaseScrollArea.Root>, ScrollAreaProps>(
  function ScrollArea(
    {
      className,
      orientation = "vertical",
      viewportClassName,
      viewportRef,
      viewportProps,
      contentClassName,
      reserveTrack = true,
      edgeFade = true,
      children,
      ...props
    },
    ref,
  ) {
    const vertical = orientation !== "horizontal";
    const horizontal = orientation !== "vertical";
    const fade = edgeFade && horizontal;
    return (
      <BaseScrollArea.Root
        ref={ref}
        data-slot="scroll-area"
        className={mergeClassName(cn("relative flex min-h-0 flex-col overflow-clip", fade && edgeFadeRoot), className)}
        {...props}
      >
        <BaseScrollArea.Viewport
          ref={viewportRef}
          data-slot="scroll-area-viewport"
          {...viewportProps}
          className={cn(
            "size-full min-h-0 flex-1 overscroll-contain rounded-[inherit] outline-none focus-visible:ring-pui focus-visible:ring-inset focus-visible:ring-pui-ring",
            fade && edgeFadeViewport,
            viewportClassName,
          )}
        >
          <BaseScrollArea.Content
            data-slot="scroll-area-content"
            className={cn(
              reserveTrack && vertical && "pr-2.5",
              reserveTrack && horizontal && "pb-2.5",
              // Base UI gives the content an inline `min-width: fit-content`. With a horizontal bar the content
              // may grow wider than the viewport (at least full width); vertical-only it must follow the
              // viewport width, so wide children (code, tables) wrap or scroll in their own areas instead of
              // being clipped. `!` beats the inline style.
              horizontal ? "min-w-full" : "!min-w-0",
              contentClassName,
            )}
          >
            {children}
          </BaseScrollArea.Content>
        </BaseScrollArea.Viewport>
        {vertical && <ScrollBar orientation="vertical" />}
        {horizontal && <ScrollBar orientation="horizontal" />}
        {vertical && horizontal && <BaseScrollArea.Corner data-slot="scroll-area-corner" />}
      </BaseScrollArea.Root>
    );
  },
);

export type ScrollBarProps = ComponentPropsWithoutRef<typeof BaseScrollArea.Scrollbar>;

/**
 * A 10px scrollbar with a 4px pill thumb. Hidden (transparent) until the pointer is over the scroll area,
 * `/35` muted foreground on hover, `/60` while the thumb itself is hovered.
 */
export const ScrollBar = forwardRef<
  ComponentRef<typeof BaseScrollArea.Scrollbar>,
  ScrollBarProps
>(function ScrollBar({ className, orientation = "vertical", ...props }, ref) {
  return (
    <BaseScrollArea.Scrollbar
      ref={ref}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={mergeClassName(
        [
          "group/scrollbar flex touch-none select-none p-[3px]",
          "data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col",
        ],
        className,
      )}
      {...props}
    >
      <BaseScrollArea.Thumb
        data-slot="scroll-area-thumb"
        className={cn(
          "rounded-full bg-transparent transition-colors duration-pui-fast ease-pui",
          "data-[orientation=vertical]:w-full data-[orientation=horizontal]:h-full",
          "group-data-[hovering]/scrollbar:bg-pui-muted-foreground/35 group-data-[scrolling]/scrollbar:bg-pui-muted-foreground/35",
          "hover:!bg-pui-muted-foreground/60",
        )}
      />
    </BaseScrollArea.Scrollbar>
  );
});

