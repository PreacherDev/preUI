import type { ComponentType, SVGProps } from "react";

/** Props every icon component must accept to be usable inside preUI. */
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export type IconComponent = ComponentType<IconProps>;

/**
 * Icons that preUI components render internally.
 * Extend this union when a new component needs a built-in icon.
 */
export type IconName = "spinner" | "check" | "close" | "chevronDown";

export type IconSet = Record<IconName, IconComponent>;
