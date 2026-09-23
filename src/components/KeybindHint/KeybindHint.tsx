import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, Fragment, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { Kbd, KbdGroup } from "../Kbd/Kbd";

export const keybindHintVariants = /* @__PURE__ */ cva("inline-flex items-center text-pui-foreground", {
  variants: {
    size: {
      default: "gap-2 text-sm",
      sm: "gap-1.5 text-xs",
    },
    // Rendered as a button or link: hover/focus/pressed like a ghost control. The key caps are
    // `pointer-events-none`, so clicks on them land on the hint itself.
    interactive: {
      true: [
        "cursor-pointer select-none rounded-pui-md text-left outline-none transition-colors duration-pui-fast ease-pui",
        "hover:bg-pui-accent focus-visible:ring-pui focus-visible:ring-pui-ring",
        "aria-pressed:bg-pui-primary/tint aria-pressed:hover:bg-pui-primary/tint-hover",
        "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
      ],
      false: "",
    },
  },
  compoundVariants: [
    { interactive: true, size: "default", className: "px-2.5 py-1" },
    { interactive: true, size: "sm", className: "px-2 py-0.5" },
  ],
  defaultVariants: { size: "default", interactive: false },
});

export type KeybindHintSize = NonNullable<VariantProps<typeof keybindHintVariants>["size"]>;

/** Smaller key caps for `size="sm"` (compact footers). */
const smallKeyClass = "h-4 min-w-4 px-1 text-pui-2xs";

export interface KeybindHintProps extends Omit<useRender.ComponentProps<"div">, "children" | "ref"> {
  /** One key or a combination; each entry is rendered as a `Kbd`, e.g. `"E"` or `["Shift", "F"]`. */
  keys: ReactNode | ReactNode[];
  /** What the key does, e.g. "Interagieren". */
  label?: ReactNode;
  /** Shown between the keys of a combination. Default `"+"`; `null` renders the keys side by side. */
  separator?: ReactNode;
  /** Extra classes for every key cap. */
  keyClassName?: string;
  /** `"default"` or `"sm"` (smaller key caps and `text-xs`, for compact footers). */
  size?: KeybindHintSize;
  /**
   * Hover, focus ring, padding and an `aria-pressed` tint for a clickable hint. Default: `true` when `render` is set
   * (e.g. `render={<button type="button" />}`).
   */
  interactive?: boolean;
}

/**
 * One keybind prompt: key cap(s) followed by a label, e.g. `[E] Interact`. Make it clickable with
 * `render={<button type="button" onClick={…} />}` — it then gets hover/focus styles (and a tint with `aria-pressed`).
 */
export const KeybindHint = /* @__PURE__ */ forwardRef<HTMLDivElement, KeybindHintProps>(function KeybindHint(
  { className, keys, label, separator = "+", keyClassName, size = "default", interactive, render, ...props },
  ref,
) {
  const list = Array.isArray(keys) ? keys : [keys];
  const children = (
    <>
      <KbdGroup data-slot="keybind-hint-keys" className="shrink-0">
        {list.map((key, index) => (
          <Fragment key={index}>
            {index > 0 && separator != null && separator !== false && separator !== "" && (
              <span data-slot="keybind-hint-separator" className="text-xs text-pui-muted-foreground">
                {separator}
              </span>
            )}
            <Kbd data-slot="keybind-hint-key" className={cn(size === "sm" && smallKeyClass, keyClassName)}>
              {key}
            </Kbd>
          </Fragment>
        ))}
      </KbdGroup>
      {label != null && label !== false && (
        <span data-slot="keybind-hint-label" className="min-w-0">
          {label}
        </span>
      )}
    </>
  );
  return useRender({
    defaultTagName: "div",
    render,
    ref,
    props: {
      "data-slot": "keybind-hint",
      "data-size": size,
      ...props,
      "data-interactive": (interactive ?? render !== undefined) ? "" : undefined,
      className: cn(keybindHintVariants({ size, interactive: interactive ?? render !== undefined }), className),
      children,
    },
  });
});

export const keybindHintBarVariants = /* @__PURE__ */ cva("flex w-fit", {
  variants: {
    orientation: {
      horizontal: "flex-row flex-wrap items-center gap-x-4 gap-y-2",
      vertical: "flex-col items-start gap-2",
    },
    variant: {
      default: "",
      surface: "border border-pui-border bg-pui-card/80 text-pui-card-foreground",
    },
  },
  compoundVariants: [
    { orientation: "horizontal", variant: "surface", className: "rounded-full px-4 py-1.5" },
    { orientation: "vertical", variant: "surface", className: "rounded-pui px-3 py-2.5" },
  ],
  defaultVariants: {
    orientation: "horizontal",
    variant: "default",
  },
});

export type KeybindHintBarVariant = NonNullable<VariantProps<typeof keybindHintBarVariants>["variant"]>;
export type KeybindHintBarOrientation = NonNullable<VariantProps<typeof keybindHintBarVariants>["orientation"]>;

export interface KeybindHintBarProps extends Omit<useRender.ComponentProps<"div">, "ref"> {
  /** Default `"horizontal"`. */
  orientation?: KeybindHintBarOrientation;
  /** `"default"` is plain, `"surface"` a subtle card-coloured pill (horizontal) or panel (vertical). */
  variant?: KeybindHintBarVariant;
  /** Space between the hints in px (overrides the default gap). */
  gap?: number;
}

/** Row or column of `KeybindHint`s, e.g. at the bottom of a HUD. `render` swaps the element (e.g. `<footer />`). */
export const KeybindHintBar = /* @__PURE__ */ forwardRef<HTMLDivElement, KeybindHintBarProps>(function KeybindHintBar(
  { className, orientation = "horizontal", variant = "default", gap, style, render, ...props },
  ref,
) {
  return useRender({
    defaultTagName: "div",
    render,
    ref,
    props: {
      "data-slot": "keybind-hint-bar",
      "data-orientation": orientation,
      "data-variant": variant,
      ...props,
      className: cn(keybindHintBarVariants({ orientation, variant }), className),
      style: gap === undefined ? style : { gap, ...style },
    },
  });
});
