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
export type IconName =
  | "spinner"
  | "check"
  | "close"
  | "chevronDown"
  | "chevronUp"
  | "chevronLeft"
  | "chevronRight"
  | "chevronsUpDown"
  | "chevronsLeft"
  | "chevronsRight"
  | "minus"
  | "plus"
  | "search"
  | "more"
  | "lock"
  | "info"
  | "success"
  | "error"
  | "warning"
  | "calendar"
  | "panelLeft"
  | "arrowUp"
  | "arrowDown"
  | "arrowUpDown"
  | "gripVertical"
  | "copy"
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"
  | "codeBlock"
  | "heading1"
  | "heading2"
  | "heading3"
  | "list"
  | "listOrdered"
  | "quote"
  | "link"
  | "undo"
  | "redo"
  | "eye";

export type IconSet = Record<IconName, IconComponent>;
