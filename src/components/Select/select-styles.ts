/**
 * Shared class strings for Select, Combobox and Autocomplete (field + option list).
 * Internal module — not exported from the package index.
 */

/** Field surface (select trigger, combobox/autocomplete input group). */
export const fieldClass = [
  "w-full rounded-pui-md border border-pui-input bg-pui-background text-sm text-pui-foreground",
  "transition-colors duration-pui-fast ease-pui outline-none",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "data-[invalid]:border-pui-negative",
].join(" ");

export const fieldSizeClass = {
  sm: "h-pui-control-sm",
  default: "h-pui-control",
  lg: "h-pui-control-lg",
} as const;

/** Size of the field-like controls (`SelectTrigger`, `ComboboxInput`, `ComboboxChips`, `AutocompleteInput`). */
export type FieldSize = keyof typeof fieldSizeClass;

export const listPositionerClass = "z-50 outline-none";

/** Floating list surface, at least as wide as its anchor. */
export const listPopupClass = [
  "min-w-[var(--anchor-width)] max-w-[var(--available-width)]",
  "rounded-pui-md border border-pui-border bg-pui-popover p-1 text-sm text-pui-popover-foreground shadow-pui-floating outline-none",
  "origin-[var(--transform-origin)] transition-[opacity,transform] duration-pui-base ease-pui",
  "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
].join(" ");

/**
 * Scrolling list inside the popup (max 18rem, like the handoff select). The list is rendered as the
 * viewport of a preUI ScrollArea (see `list-scroll-area.tsx`), which supplies the overflow and thumb.
 */
export const listClass =
  "max-h-[min(18rem,calc(var(--available-height)-0.625rem))] scroll-py-1 outline-none focus-visible:ring-0 data-[empty]:p-0";

/** Option row. Tighter than menu items, with room for the check mark on the right. */
export const optionClass = [
  "relative flex w-full cursor-default select-none items-center gap-2.5 rounded-pui-sm py-1.5 pl-2 pr-8 text-left text-sm outline-none",
  "transition-colors duration-pui-fast ease-pui",
  "data-[highlighted]:bg-pui-accent data-[highlighted]:text-pui-accent-foreground",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
].join(" ");

/** Option row without a check mark (Autocomplete suggestions). */
export const plainOptionClass = optionClass.replace("pr-8", "pr-2");

export const optionIndicatorClass = "absolute right-2 flex size-4 items-center justify-center";

export const groupLabelClass =
  "select-none px-2 py-1.5 text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground";

export const separatorClass = "-mx-1 my-1 h-px bg-pui-border";

/** "Nothing found" / status line. Collapses when it has no content. */
export const emptyClass = "px-2 py-3 text-center text-sm text-pui-muted-foreground empty:p-0";

/** Small icon button inside a field (clear, open). */
export const fieldIconButtonClass = [
  "inline-flex size-6 shrink-0 items-center justify-center rounded-pui-sm text-pui-muted-foreground outline-none",
  "transition-colors duration-pui-fast ease-pui hover:bg-pui-accent hover:text-pui-foreground",
  "focus-visible:ring-pui focus-visible:ring-pui-ring",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:size-4",
].join(" ");

/** Bare input inside a field group. */
export const bareInputClass =
  "h-full min-w-0 flex-1 bg-transparent text-sm text-pui-foreground outline-none placeholder:text-pui-muted-foreground disabled:cursor-not-allowed";
