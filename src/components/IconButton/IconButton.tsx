import { forwardRef, type ReactNode } from "react";
import { Button, type ButtonProps, type ButtonSize } from "../Button/Button";
import { WithTooltip, type IconTooltip } from "../Tooltip/IconTooltip";

/** Text sizes map to the square icon size of the same control height. */
const iconSizes: Record<ButtonSize, Extract<ButtonSize, `icon${string}`>> = {
  default: "icon",
  sm: "icon-sm",
  lg: "icon-lg",
  icon: "icon",
  "icon-sm": "icon-sm",
  "icon-lg": "icon-lg",
};

export interface IconButtonProps extends Omit<ButtonProps, "children" | "leftIcon" | "rightIcon"> {
  /** What the button does: its accessible name (`aria-label`) and, by default, its tooltip text. */
  label: string;
  /** The icon, e.g. from lucide, heroicons or phosphor. Sized by the button (16px). */
  icon: ReactNode;
  /**
   * `false` = no tooltip (the `label` stays as `aria-label`), a string or node = other text,
   * an options object = text plus `side` / `align` / `delay`. Default: the `label`.
   */
  tooltip?: IconTooltip;
  /** Square size; the text sizes (`sm` / `default` / `lg`) map to `icon-sm` / `icon` / `icon-lg`. @default "icon" */
  size?: ButtonSize;
}

/**
 * Square icon-only button that always says what it does: `label` becomes its `aria-label` and its tooltip.
 * Works as the `render` of a trigger (`<DropdownMenuTrigger render={<IconButton …/>} />`, `PopoverTrigger`,
 * `DialogTrigger` …); when the trigger is a `TooltipTrigger` of your own, pass `tooltip={false}`.
 * Needs no `TooltipProvider`; with one, `<TooltipProvider delay={100}>` sets the open delay of every tooltip.
 */
export const IconButton = /* @__PURE__ */ forwardRef<HTMLElement, IconButtonProps>(function IconButton(
  { label, icon, tooltip, variant = "ghost", size = "icon", ...props },
  ref,
) {
  return (
    <WithTooltip tooltip={tooltip} label={label}>
      <Button ref={ref} variant={variant} size={iconSizes[size]} aria-label={label} data-slot="icon-button" {...props}>
        {icon}
      </Button>
    </WithTooltip>
  );
});
