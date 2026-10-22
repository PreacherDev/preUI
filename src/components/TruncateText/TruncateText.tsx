import { forwardRef, useCallback, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Tooltip, TooltipContent, TooltipTrigger, type TooltipContentProps } from "../Tooltip/Tooltip";

export interface TruncateTextProps extends HTMLAttributes<HTMLSpanElement> {
  /** Lines before it cuts off with "…". @default 1 */
  lines?: number;
  /** Tooltip content while the text is cut off. @default children */
  tooltip?: ReactNode;
  /** Props of the tooltip surface (`side`, `align`, `className` …). */
  tooltipProps?: Omit<TooltipContentProps, "children">;
}

/** Whether the text doesn't fit (measured when the tooltip wants to open, never during render). */
function isCutOff(element: HTMLElement | null) {
  if (!element) return false;
  return element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1;
}

/**
 * Text that cuts off with "…" after `lines` lines and shows the whole text as a tooltip — only while it is actually
 * cut off. The full text stays in the DOM for screen readers. Use it instead of a `title` attribute, which FiveM's
 * CEF never shows, e.g. for long German or French texts in a narrow header.
 */
export const TruncateText = /* @__PURE__ */ forwardRef<HTMLSpanElement, TruncateTextProps>(function TruncateText(
  { lines = 1, tooltip, tooltipProps, className, style, children, ...props },
  forwardedRef,
) {
  const element = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const setRefs = useCallback(
    (node: HTMLSpanElement | null) => {
      element.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );
  const clamp: CSSProperties | undefined = lines > 1 ? { WebkitLineClamp: lines, ...style } : style;
  return (
    <Tooltip open={open} onOpenChange={(next) => setOpen(next && isCutOff(element.current))}>
      <TooltipTrigger
        render={
          <span
            ref={setRefs}
            data-slot="truncate-text"
            data-lines={lines}
            className={cn(
              "min-w-0",
              lines > 1 ? "overflow-hidden [-webkit-box-orient:vertical] [display:-webkit-box]" : "block truncate",
              className,
            )}
            style={clamp}
            {...props}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent {...tooltipProps}>{tooltip ?? children}</TooltipContent>
    </Tooltip>
  );
});
