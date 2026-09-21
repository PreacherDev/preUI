import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef, type ReactNode } from "react";
import { useIcon } from "../../icons";
import { mergeClassName } from "../../utils/cn";
import {
  bareInputClass,
  emptyClass,
  fieldClass,
  fieldIconButtonClass,
  fieldSizeClass,
  groupLabelClass,
  listClass,
  listPopupClass,
  listPositionerClass,
  optionClass,
  optionIndicatorClass,
  separatorClass,
  type FieldSize,
} from "../Select/select-styles";
import { renderListInScrollArea } from "../Select/list-scroll-area";

/** Pass `items` and render `ComboboxList` with a function child to get filtering for free. */
export const Combobox = BaseCombobox.Root;
export const ComboboxValue = BaseCombobox.Value;
export const ComboboxCollection = BaseCombobox.Collection;
export const ComboboxRow = BaseCombobox.Row;
export const useComboboxFilter = BaseCombobox.useFilter;

type InputGroupProps = ComponentPropsWithoutRef<typeof BaseCombobox.InputGroup>;
type BaseInputProps = ComponentPropsWithoutRef<typeof BaseCombobox.Input>;

export interface ComboboxInputProps extends Omit<BaseInputProps, "className" | "size"> {
  /** Class for the field (input group) around the input. */
  className?: InputGroupProps["className"];
  /** Class for the `<input>` itself. */
  inputClassName?: BaseInputProps["className"];
  size?: FieldSize;
  /** Leading icon, e.g. `<SearchIcon />`. Pass `true` for the built-in search icon. */
  icon?: ReactNode | true;
  /** Show a clear button while a value is selected. */
  showClear?: boolean;
  /** Show a chevron button that opens the list. */
  showTrigger?: boolean;
  clearLabel?: string;
  triggerLabel?: string;
}

/** Field with the input, an optional leading icon, a clear button and a chevron trigger. */
export const ComboboxInput = forwardRef<ComponentRef<typeof BaseCombobox.Input>, ComboboxInputProps>(
  function ComboboxInput(
    {
      className,
      inputClassName,
      size = "default",
      icon,
      showClear = true,
      showTrigger = true,
      clearLabel = "Clear",
      triggerLabel = "Open",
      ...props
    },
    ref,
  ) {
    const Search = useIcon("search");
    const Close = useIcon("close");
    const ChevronDown = useIcon("chevronDown");
    return (
      <BaseCombobox.InputGroup
        data-slot="combobox-input-group"
        data-size={size}
        className={mergeClassName(
          [
            fieldClass,
            fieldSizeClass[size],
            "flex items-center gap-2 pl-3 focus-within:border-pui-ring",
            showClear || showTrigger ? "pr-1.5" : "pr-3",
          ],
          className,
        )}
      >
        {icon != null && icon !== false && (
          <span data-slot="combobox-icon" className="inline-flex shrink-0 text-pui-muted-foreground [&_svg]:size-4" aria-hidden="true">
            {icon === true ? <Search /> : icon}
          </span>
        )}
        <BaseCombobox.Input ref={ref} data-slot="combobox-input" className={mergeClassName(bareInputClass, inputClassName)} {...props} />
        {(showClear || showTrigger) && (
          <span data-slot="combobox-actions" className="flex shrink-0 items-center gap-0.5">
            {showClear && (
              <BaseCombobox.Clear data-slot="combobox-clear" className={fieldIconButtonClass} aria-label={clearLabel}>
                <Close aria-hidden="true" />
              </BaseCombobox.Clear>
            )}
            {showTrigger && (
              <BaseCombobox.Trigger data-slot="combobox-trigger" className={`group ${fieldIconButtonClass}`} aria-label={triggerLabel}>
                <ChevronDown
                  className="transition-transform duration-pui-fast ease-pui group-data-[popup-open]:rotate-180"
                  aria-hidden="true"
                />
              </BaseCombobox.Trigger>
            )}
          </span>
        )}
      </BaseCombobox.InputGroup>
    );
  },
);

export interface ComboboxChipsProps extends ComponentPropsWithoutRef<typeof BaseCombobox.InputGroup> {
  size?: FieldSize;
}

/**
 * Field for `multiple` comboboxes: wraps selected chips and a `ComboboxChipsInput`.
 * Typically rendered as `<ComboboxChips><ComboboxValue>{(value) => …}</ComboboxValue></ComboboxChips>`.
 */
export const ComboboxChips = forwardRef<ComponentRef<typeof BaseCombobox.InputGroup>, ComboboxChipsProps>(
  function ComboboxChips({ className, size = "default", children, ...props }, ref) {
    const minHeight = { sm: "min-h-pui-control-sm", default: "min-h-pui-control", lg: "min-h-pui-control-lg" }[size];
    return (
      <BaseCombobox.InputGroup
        ref={ref}
        data-slot="combobox-chips"
        data-size={size}
        className={mergeClassName(
          [fieldClass, minHeight, "flex cursor-text items-center px-1.5 py-1 focus-within:border-pui-ring"],
          className,
        )}
        {...props}
      >
        <BaseCombobox.Chips data-slot="combobox-chips-list" className="flex w-full flex-wrap items-center gap-1">{children}</BaseCombobox.Chips>
      </BaseCombobox.InputGroup>
    );
  },
);

export type ComboboxChipsInputProps = BaseInputProps;

/** Bare input placed after the chips inside `ComboboxChips`. */
export const ComboboxChipsInput = forwardRef<ComponentRef<typeof BaseCombobox.Input>, ComboboxChipsInputProps>(
  function ComboboxChipsInput({ className, ...props }, ref) {
    return <BaseCombobox.Input ref={ref} data-slot="combobox-chips-input" className={mergeClassName([bareInputClass, "h-6 min-w-16 px-1.5"], className)} {...props} />;
  },
);

export interface ComboboxChipProps extends ComponentPropsWithoutRef<typeof BaseCombobox.Chip> {
  /** Accessible label of the remove button. */
  removeLabel?: string;
  /** Hide the remove button. */
  hideRemove?: boolean;
}

/** Selected value as a tinted pill with a remove button. */
export const ComboboxChip = forwardRef<ComponentRef<typeof BaseCombobox.Chip>, ComboboxChipProps>(function ComboboxChip(
  { className, children, removeLabel = "Remove", hideRemove = false, ...props },
  ref,
) {
  const Close = useIcon("close");
  return (
    <BaseCombobox.Chip
      ref={ref}
      data-slot="combobox-chip"
      className={mergeClassName(
        [
          "inline-flex h-6 cursor-default items-center gap-1 rounded-pui-sm border border-pui-border bg-pui-secondary pl-2 pr-0.5 text-xs font-medium text-pui-secondary-foreground outline-none",
          "transition-colors duration-pui-fast ease-pui",
          "focus-within:border-pui-ring data-[highlighted]:border-pui-ring",
          hideRemove && "pr-2",
        ],
        className,
      )}
      {...props}
    >
      {children}
      {!hideRemove && (
        <BaseCombobox.ChipRemove
          data-slot="combobox-chip-remove"
          className="inline-flex size-4 items-center justify-center rounded-pui-sm text-pui-muted-foreground transition-colors duration-pui-fast ease-pui hover:bg-pui-accent hover:text-pui-foreground"
          aria-label={removeLabel}
        >
          <Close className="size-3" aria-hidden="true" />
        </BaseCombobox.ChipRemove>
      )}
    </BaseCombobox.Chip>
  );
});

type PositionerProps = BaseCombobox.Positioner.Props;

export interface ComboboxContentProps extends ComponentPropsWithoutRef<typeof BaseCombobox.Popup> {
  side?: PositionerProps["side"];
  align?: PositionerProps["align"];
  sideOffset?: PositionerProps["sideOffset"];
  alignOffset?: PositionerProps["alignOffset"];
  positionerProps?: Omit<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset">;
}

/** Portal + Positioner + Popup in one. Put `ComboboxEmpty` and `ComboboxList` inside. */
export const ComboboxContent = forwardRef<ComponentRef<typeof BaseCombobox.Popup>, ComboboxContentProps>(
  function ComboboxContent(
    { className, side = "bottom", align = "start", sideOffset = 4, alignOffset = 0, positionerProps, ...props },
    ref,
  ) {
    return (
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          data-slot="combobox-positioner"
          {...positionerProps}
          className={mergeClassName(listPositionerClass, positionerProps?.className)}
        >
          <BaseCombobox.Popup ref={ref} data-slot="combobox-content" className={mergeClassName(listPopupClass, className)} {...props} />
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    );
  },
);

export type ComboboxListProps = ComponentPropsWithoutRef<typeof BaseCombobox.List>;

/**
 * The scrolling list. It is rendered as the viewport of a preUI ScrollArea (floating thumb, no native
 * scrollbar); `className` applies to that scrolling element, e.g. `max-h-96`.
 */
export const ComboboxList = forwardRef<ComponentRef<typeof BaseCombobox.List>, ComboboxListProps>(function ComboboxList(
  { className, ...props },
  ref,
) {
  return <BaseCombobox.List ref={ref} className={mergeClassName(listClass, className)} render={renderListInScrollArea} {...props} />;
});

export type ComboboxItemProps = ComponentPropsWithoutRef<typeof BaseCombobox.Item>;

/** Option with a check mark on the right when selected. */
export const ComboboxItem = forwardRef<ComponentRef<typeof BaseCombobox.Item>, ComboboxItemProps>(function ComboboxItem(
  { className, children, ...props },
  ref,
) {
  const Check = useIcon("check");
  return (
    <BaseCombobox.Item ref={ref} data-slot="combobox-item" className={mergeClassName(optionClass, className)} {...props}>
      <span data-slot="combobox-item-text" className="min-w-0 flex-1 truncate">{children}</span>
      <BaseCombobox.ItemIndicator data-slot="combobox-item-indicator" className={optionIndicatorClass}>
        <Check aria-hidden="true" />
      </BaseCombobox.ItemIndicator>
    </BaseCombobox.Item>
  );
});

export type ComboboxEmptyProps = ComponentPropsWithoutRef<typeof BaseCombobox.Empty>;

/** Shown when no item matches. Collapses otherwise. */
export const ComboboxEmpty = forwardRef<ComponentRef<typeof BaseCombobox.Empty>, ComboboxEmptyProps>(
  function ComboboxEmpty({ className, ...props }, ref) {
    return <BaseCombobox.Empty ref={ref} data-slot="combobox-empty" className={mergeClassName(emptyClass, className)} {...props} />;
  },
);

export type ComboboxStatusProps = ComponentPropsWithoutRef<typeof BaseCombobox.Status>;

/** Live status line, e.g. "Suche läuft …" for async lists. */
export const ComboboxStatus = forwardRef<ComponentRef<typeof BaseCombobox.Status>, ComboboxStatusProps>(
  function ComboboxStatus({ className, ...props }, ref) {
    return <BaseCombobox.Status ref={ref} data-slot="combobox-status" className={mergeClassName(emptyClass, className)} {...props} />;
  },
);

export type ComboboxGroupProps = ComponentPropsWithoutRef<typeof BaseCombobox.Group>;

export const ComboboxGroup = forwardRef<ComponentRef<typeof BaseCombobox.Group>, ComboboxGroupProps>(
  function ComboboxGroup({ className, ...props }, ref) {
    return <BaseCombobox.Group ref={ref} data-slot="combobox-group" className={mergeClassName("block", className)} {...props} />;
  },
);

export type ComboboxLabelProps = ComponentPropsWithoutRef<typeof BaseCombobox.GroupLabel>;

export const ComboboxLabel = forwardRef<ComponentRef<typeof BaseCombobox.GroupLabel>, ComboboxLabelProps>(
  function ComboboxLabel({ className, ...props }, ref) {
    return <BaseCombobox.GroupLabel ref={ref} data-slot="combobox-label" className={mergeClassName(groupLabelClass, className)} {...props} />;
  },
);

export type ComboboxSeparatorProps = ComponentPropsWithoutRef<typeof BaseCombobox.Separator>;

export const ComboboxSeparator = forwardRef<ComponentRef<typeof BaseCombobox.Separator>, ComboboxSeparatorProps>(
  function ComboboxSeparator({ className, ...props }, ref) {
    return <BaseCombobox.Separator ref={ref} data-slot="combobox-separator" className={mergeClassName(separatorClass, className)} {...props} />;
  },
);
