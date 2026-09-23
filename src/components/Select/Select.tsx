import { Select as BaseSelect } from "@base-ui/react/select";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { useIcon } from "../../icons";
import { mergeClassName } from "../../utils/cn";
import {
  fieldClass,
  fieldSizeClass,
  groupLabelClass,
  listClass,
  listPopupClass,
  listPositionerClass,
  optionClass,
  optionIndicatorClass,
  separatorClass,
  type FieldSize,
} from "./select-styles";
import { renderListInScrollArea } from "./list-scroll-area";

/** Pass `items` (`{ value, label }[]`) so `SelectValue` renders the label of the selected value. */
export const Select = BaseSelect.Root;
export type SelectGroupProps = ComponentPropsWithoutRef<typeof BaseSelect.Group>;

export const SelectGroup = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSelect.Group>, SelectGroupProps>(function SelectGroup(
  props,
  ref,
) {
  return <BaseSelect.Group ref={ref} data-slot="select-group" {...props} />;
});

export interface SelectTriggerProps extends ComponentPropsWithoutRef<typeof BaseSelect.Trigger> {
  size?: FieldSize;
}

/** Field-styled trigger with an up/down chevron. Put a `SelectValue` inside. */
export const SelectTrigger = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSelect.Trigger>, SelectTriggerProps>(
  function SelectTrigger({ className, size = "default", children, ...props }, ref) {
    const ChevronsUpDown = useIcon("chevronsUpDown");
    return (
      <BaseSelect.Trigger
        ref={ref}
        data-slot="select-trigger"
        data-size={size}
        className={mergeClassName(
          [
            fieldClass,
            fieldSizeClass[size],
            "flex cursor-default select-none items-center justify-between gap-2 px-3 text-left",
            "focus-visible:border-pui-ring data-[popup-open]:border-pui-ring",
            "data-[placeholder]:text-pui-muted-foreground",
          ],
          className,
        )}
        {...props}
      >
        {children}
        <BaseSelect.Icon data-slot="select-icon" className="flex shrink-0 text-pui-muted-foreground">
          <ChevronsUpDown className="size-4" aria-hidden="true" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
    );
  },
);

export type SelectValueProps = ComponentPropsWithoutRef<typeof BaseSelect.Value>;

export const SelectValue = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSelect.Value>, SelectValueProps>(function SelectValue(
  { className, ...props },
  ref,
) {
  return (
    <BaseSelect.Value
      ref={ref}
      data-slot="select-value"
      className={mergeClassName("min-w-0 flex-1 truncate data-[placeholder]:text-pui-muted-foreground", className)}
      {...props}
    />
  );
});

type PositionerProps = BaseSelect.Positioner.Props;

export interface SelectContentProps extends ComponentPropsWithoutRef<typeof BaseSelect.Popup> {
  side?: PositionerProps["side"];
  align?: PositionerProps["align"];
  sideOffset?: PositionerProps["sideOffset"];
  alignOffset?: PositionerProps["alignOffset"];
  /** Overlap the trigger so the selected option sits on top of it (macOS style). Off by default. */
  alignItemWithTrigger?: PositionerProps["alignItemWithTrigger"];
  /** Props for the positioner element. */
  positionerProps?: Omit<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "alignItemWithTrigger">;
  /** Class for the scrolling list inside the popup (it is the ScrollArea viewport, e.g. for its max height). */
  listClassName?: ComponentPropsWithoutRef<typeof BaseSelect.List>["className"];
  /**
   * Also render the hover-to-scroll arrows at the top/bottom of an overflowing list.
   * Off by default — the list scrolls with the preUI ScrollArea thumb, wheel and keyboard.
   */
  scrollButtons?: boolean;
  /** Element the portal renders into (Base UI Portal `container`); defaults to `document.body`. */
  container?: BaseSelect.Portal.Props["container"];
}

/**
 * Portal + Positioner + Popup + List in one, styled as a floating list below the trigger.
 * The list scrolls inside a preUI ScrollArea (floating thumb, no native scrollbar).
 */
export const SelectContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSelect.Popup>, SelectContentProps>(
  function SelectContent(
    {
      className,
      side = "bottom",
      align = "start",
      sideOffset = 4,
      alignOffset = 0,
      alignItemWithTrigger = false,
      positionerProps,
      listClassName,
      scrollButtons = false,
      container,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <BaseSelect.Portal container={container}>
        <BaseSelect.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          alignItemWithTrigger={alignItemWithTrigger}
          data-slot="select-positioner"
          {...positionerProps}
          className={mergeClassName(listPositionerClass, positionerProps?.className)}
        >
          <BaseSelect.Popup ref={ref} data-slot="select-content" className={mergeClassName([listPopupClass, "relative"], className)} {...props}>
            {scrollButtons && <SelectScrollUpButton />}
            {/* scroll-py-6 keeps highlighted/selected items clear of the 1.5rem scroll arrows. */}
            <BaseSelect.List
              className={mergeClassName([listClass, scrollButtons && "scroll-py-6"], listClassName)}
              render={renderListInScrollArea}
            >
              {children}
            </BaseSelect.List>
            {scrollButtons && <SelectScrollDownButton />}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    );
  },
);

export type SelectItemProps = ComponentPropsWithoutRef<typeof BaseSelect.Item>;

/** Option with a check mark on the right when selected. */
export const SelectItem = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSelect.Item>, SelectItemProps>(function SelectItem(
  { className, children, ...props },
  ref,
) {
  const Check = useIcon("check");
  return (
    <BaseSelect.Item ref={ref} data-slot="select-item" className={mergeClassName(optionClass, className)} {...props}>
      <BaseSelect.ItemText data-slot="select-item-text" className="min-w-0 flex-1 truncate">{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator data-slot="select-item-indicator" className={optionIndicatorClass}>
        <Check aria-hidden="true" />
      </BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
});

export type SelectLabelProps = ComponentPropsWithoutRef<typeof BaseSelect.GroupLabel>;

/** Eyebrow label of a `SelectGroup` (announced as the group's name). Label the field itself with `FieldLabel`. */
export const SelectLabel = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSelect.GroupLabel>, SelectLabelProps>(
  function SelectLabel({ className, ...props }, ref) {
    return <BaseSelect.GroupLabel ref={ref} data-slot="select-label" className={mergeClassName(groupLabelClass, className)} {...props} />;
  },
);

export type SelectSeparatorProps = ComponentPropsWithoutRef<typeof BaseSelect.Separator>;

export const SelectSeparator = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSelect.Separator>, SelectSeparatorProps>(
  function SelectSeparator({ className, ...props }, ref) {
    return <BaseSelect.Separator ref={ref} data-slot="select-separator" className={mergeClassName(separatorClass, className)} {...props} />;
  },
);

const scrollButtonClass = [
  "left-0 z-[1] flex h-6 w-full cursor-default items-center justify-center bg-pui-popover text-pui-muted-foreground",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
];

export type SelectScrollUpButtonProps = ComponentPropsWithoutRef<typeof BaseSelect.ScrollUpArrow>;

/** Shown at the top of an overflowing list; scrolls up while hovered. Enable in `SelectContent` with `scrollButtons`. */
export const SelectScrollUpButton = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSelect.ScrollUpArrow>, SelectScrollUpButtonProps>(
  function SelectScrollUpButton({ className, children, ...props }, ref) {
    const ChevronUp = useIcon("chevronUp");
    return (
      <BaseSelect.ScrollUpArrow
        ref={ref}
        data-slot="select-scroll-up-button"
        className={mergeClassName([scrollButtonClass, "top-0 rounded-t-pui-md"], className)}
        {...props}
      >
        {children ?? <ChevronUp aria-hidden="true" />}
      </BaseSelect.ScrollUpArrow>
    );
  },
);

export type SelectScrollDownButtonProps = ComponentPropsWithoutRef<typeof BaseSelect.ScrollDownArrow>;

/** Shown at the bottom of an overflowing list; scrolls down while hovered. Enable in `SelectContent` with `scrollButtons`. */
export const SelectScrollDownButton = /* @__PURE__ */ forwardRef<
  ComponentRef<typeof BaseSelect.ScrollDownArrow>,
  SelectScrollDownButtonProps
>(function SelectScrollDownButton({ className, children, ...props }, ref) {
  const ChevronDown = useIcon("chevronDown");
  return (
    <BaseSelect.ScrollDownArrow
      ref={ref}
      data-slot="select-scroll-down-button"
      className={mergeClassName([scrollButtonClass, "bottom-0 rounded-b-pui-md"], className)}
      {...props}
    >
      {children ?? <ChevronDown aria-hidden="true" />}
    </BaseSelect.ScrollDownArrow>
  );
});
