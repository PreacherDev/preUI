import { isValidElement, type ReactElement, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger, type TooltipContentProps } from "./Tooltip";

/** Placement, delay and classes of a built-in tooltip. Every field is optional. */
export interface IconTooltipOptions {
  /** Tooltip text. Without it the button's own label (`label`, `aria-label`, `closeLabel` …) is shown. */
  content?: ReactNode;
  side?: TooltipContentProps["side"];
  align?: TooltipContentProps["align"];
  sideOffset?: TooltipContentProps["sideOffset"];
  alignOffset?: TooltipContentProps["alignOffset"];
  /**
   * Open delay in ms. Without it the delay of the nearest `TooltipProvider` applies
   * (`<TooltipProvider delay={100}>` makes every tooltip — built-in ones too — open after 100 ms),
   * and without a provider Base UI's default of 600 ms.
   */
  delay?: number;
  /** Close delay in ms. Default `0`. */
  closeDelay?: number;
  /** Class name merged into the tooltip surface. */
  className?: TooltipContentProps["className"];
  /** Element the tooltip portals into. Defaults to the nearest portal container, else `document.body`. */
  container?: TooltipContentProps["container"];
}

/**
 * Tooltip of a built-in icon-only button:
 *
 * - `undefined` / `true` — show the button's own label,
 * - `false` — no tooltip (the label stays as `aria-label`),
 * - a string or node — show that text,
 * - an options object — text plus `side` / `align` / `delay` …
 */
export type IconTooltip = boolean | ReactNode | IconTooltipOptions;

function isOptions(tooltip: IconTooltip): tooltip is IconTooltipOptions {
  return typeof tooltip === "object" && tooltip !== null && !isValidElement(tooltip) && !Array.isArray(tooltip);
}

export interface WithTooltipProps extends IconTooltipOptions {
  /** The `tooltip` prop as the user passed it; its options win over the defaults given here. */
  tooltip?: IconTooltip;
  /** Fallback text when neither `tooltip` nor `content` carries one. */
  label?: ReactNode;
  /** The trigger element (a button). Rendered unchanged when there is no tooltip. */
  children: ReactElement;
}

/**
 * Wraps a (usually icon-only) button in a tooltip. Used by preUI's own icon buttons, and useful for your own:
 * `<WithTooltip label="Save"><Button …/></WithTooltip>`. Needs no `TooltipProvider` — with one, its `delay`
 * is shared with every other tooltip. Renders the child alone when `tooltip` is `false` or no text is left.
 */
export function WithTooltip({ tooltip, label, children, ...defaults }: WithTooltipProps) {
  if (tooltip === false) return children;
  const options: IconTooltipOptions = isOptions(tooltip)
    ? { ...defaults, ...tooltip }
    : tooltip === true || tooltip === undefined
      ? defaults
      : { ...defaults, content: tooltip };
  const content = options.content ?? label;
  if (content === undefined || content === null || content === false || content === "") return children;

  return (
    <Tooltip>
      <TooltipTrigger delay={options.delay} closeDelay={options.closeDelay} render={children} />
      <TooltipContent
        side={options.side}
        align={options.align}
        sideOffset={options.sideOffset}
        alignOffset={options.alignOffset}
        container={options.container}
        className={options.className}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
