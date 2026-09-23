import { forwardRef, type CSSProperties, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

/** All anchor positions, e.g. for a settings select. */
export const hudAnchors = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;

export type HudAnchor = (typeof hudAnchors)[number];

/** Distance in px from the anchor edges (inward). On a centred axis it shifts the element (+x right, +y down). */
export type HudOffset = number | { x: number; y: number };

export interface HudContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Default `"top-left"`. Can be changed at any time. */
  anchor?: HudAnchor;
  /** Default `0`. */
  offset?: HudOffset;
  /** `"fixed"` (default, relative to the viewport) or `"absolute"` (relative to the nearest positioned ancestor). */
  position?: "fixed" | "absolute";
  /** Animates changes of anchor and offset (`duration-pui-base`). */
  transition?: boolean;
  /** Lets the container receive pointer events. Off by default so the HUD never blocks the game cursor. */
  interactive?: boolean;
}

type Axis = "start" | "center" | "end";

function axes(anchor: HudAnchor): { x: Axis; y: Axis } {
  const y: Axis = anchor.startsWith("top") ? "start" : anchor.startsWith("bottom") ? "end" : "center";
  const x: Axis = anchor.endsWith("left") ? "start" : anchor.endsWith("right") ? "end" : "center";
  return { x, y };
}

/** Inline position styles for an anchor + offset (`left/right/top/bottom` + `transform` for centred axes). */
export function getHudPositionStyle(anchor: HudAnchor, offset: HudOffset = 0): CSSProperties {
  const { x: ox, y: oy } = typeof offset === "number" ? { x: offset, y: offset } : offset;
  const { x, y } = axes(anchor);
  const style: CSSProperties = {};
  if (x === "start") style.left = ox;
  else if (x === "end") style.right = ox;
  else style.left = ox ? `calc(50% + ${ox}px)` : "50%";
  if (y === "start") style.top = oy;
  else if (y === "end") style.bottom = oy;
  else style.top = oy ? `calc(50% + ${oy}px)` : "50%";
  // The `transform` property, not the individual `translate` property (Chromium 103).
  if (x === "center" || y === "center") {
    style.transform = `translate(${x === "center" ? "-50%" : "0"}, ${y === "center" ? "-50%" : "0"})`;
  }
  return style;
}

/**
 * Places a HUD element at one of nine anchors of the viewport (or of a positioned parent with
 * `position="absolute"`). Anchor and offset are plain props, so they can change at runtime.
 */
export const HudContainer = /* @__PURE__ */ forwardRef<HTMLDivElement, HudContainerProps>(function HudContainer(
  {
    className,
    style,
    anchor = "top-left",
    offset = 0,
    position = "fixed",
    transition = false,
    interactive = false,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="hud-container"
      data-anchor={anchor}
      data-interactive={interactive ? "" : undefined}
      className={cn(
        position === "absolute" ? "absolute" : "fixed",
        "z-40",
        interactive ? "pointer-events-auto" : "pointer-events-none",
        transition &&
          "transition-[left,right,top,bottom,transform] duration-pui-base ease-pui motion-reduce:transition-none",
        className,
      )}
      style={{ ...getHudPositionStyle(anchor, offset), ...style }}
      {...props}
    />
  );
});
