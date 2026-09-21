import { Autocomplete as BaseAutocomplete } from "@base-ui/react/autocomplete";
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
  plainOptionClass,
  separatorClass,
  type FieldSize,
} from "../Select/select-styles";
import { renderListInScrollArea } from "../Select/list-scroll-area";

/** Free-text input with suggestions. Pass `items` and render `AutocompleteList` with a function child. */
export const Autocomplete = BaseAutocomplete.Root;
export const AutocompleteValue = BaseAutocomplete.Value;
export const AutocompleteCollection = BaseAutocomplete.Collection;
export const AutocompleteRow = BaseAutocomplete.Row;
export const useAutocompleteFilter = BaseAutocomplete.useFilter;

type InputGroupProps = ComponentPropsWithoutRef<typeof BaseAutocomplete.InputGroup>;
type BaseInputProps = ComponentPropsWithoutRef<typeof BaseAutocomplete.Input>;

export interface AutocompleteInputProps extends Omit<BaseInputProps, "className" | "size"> {
  /** Class for the field (input group) around the input. */
  className?: InputGroupProps["className"];
  /** Class for the `<input>` itself. */
  inputClassName?: BaseInputProps["className"];
  size?: FieldSize;
  /** Leading icon. Defaults to the built-in search icon; pass `null` to hide it. */
  icon?: ReactNode;
  /** Show a clear button while the input has text. */
  showClear?: boolean;
  /** Show a chevron button that opens the suggestions. */
  showTrigger?: boolean;
  clearLabel?: string;
  triggerLabel?: string;
}

/** Search-style field: leading search icon, input, clear button (and optional chevron trigger). */
export const AutocompleteInput = forwardRef<ComponentRef<typeof BaseAutocomplete.Input>, AutocompleteInputProps>(
  function AutocompleteInput(
    {
      className,
      inputClassName,
      size = "default",
      icon,
      showClear = true,
      showTrigger = false,
      clearLabel = "Clear",
      triggerLabel = "Open",
      ...props
    },
    ref,
  ) {
    const Search = useIcon("search");
    const Close = useIcon("close");
    const ChevronDown = useIcon("chevronDown");
    const leading = icon === undefined ? <Search /> : icon;
    return (
      <BaseAutocomplete.InputGroup
        data-slot="autocomplete-input-group"
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
        {leading != null && leading !== false && (
          <span data-slot="autocomplete-icon" className="inline-flex shrink-0 text-pui-muted-foreground [&_svg]:size-4" aria-hidden="true">
            {leading}
          </span>
        )}
        <BaseAutocomplete.Input ref={ref} data-slot="autocomplete-input" className={mergeClassName(bareInputClass, inputClassName)} {...props} />
        {(showClear || showTrigger) && (
          <span data-slot="autocomplete-actions" className="flex shrink-0 items-center gap-0.5">
            {showClear && (
              <BaseAutocomplete.Clear data-slot="autocomplete-clear" className={fieldIconButtonClass} aria-label={clearLabel}>
                <Close aria-hidden="true" />
              </BaseAutocomplete.Clear>
            )}
            {showTrigger && (
              <BaseAutocomplete.Trigger data-slot="autocomplete-trigger" className={`group ${fieldIconButtonClass}`} aria-label={triggerLabel}>
                <ChevronDown
                  className="transition-transform duration-pui-fast ease-pui group-data-[popup-open]:rotate-180"
                  aria-hidden="true"
                />
              </BaseAutocomplete.Trigger>
            )}
          </span>
        )}
      </BaseAutocomplete.InputGroup>
    );
  },
);

type PositionerProps = BaseAutocomplete.Positioner.Props;

export interface AutocompleteContentProps extends ComponentPropsWithoutRef<typeof BaseAutocomplete.Popup> {
  side?: PositionerProps["side"];
  align?: PositionerProps["align"];
  sideOffset?: PositionerProps["sideOffset"];
  alignOffset?: PositionerProps["alignOffset"];
  positionerProps?: Omit<PositionerProps, "side" | "align" | "sideOffset" | "alignOffset">;
}

/** Portal + Positioner + Popup in one. Put `AutocompleteEmpty` and `AutocompleteList` inside. */
export const AutocompleteContent = forwardRef<ComponentRef<typeof BaseAutocomplete.Popup>, AutocompleteContentProps>(
  function AutocompleteContent(
    { className, side = "bottom", align = "start", sideOffset = 4, alignOffset = 0, positionerProps, ...props },
    ref,
  ) {
    return (
      <BaseAutocomplete.Portal>
        <BaseAutocomplete.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          data-slot="autocomplete-positioner"
          {...positionerProps}
          className={mergeClassName(listPositionerClass, positionerProps?.className)}
        >
          <BaseAutocomplete.Popup ref={ref} data-slot="autocomplete-content" className={mergeClassName(listPopupClass, className)} {...props} />
        </BaseAutocomplete.Positioner>
      </BaseAutocomplete.Portal>
    );
  },
);

export type AutocompleteListProps = ComponentPropsWithoutRef<typeof BaseAutocomplete.List>;

/**
 * The scrolling list. It is rendered as the viewport of a preUI ScrollArea (floating thumb, no native
 * scrollbar); `className` applies to that scrolling element, e.g. `max-h-96`.
 */
export const AutocompleteList = forwardRef<ComponentRef<typeof BaseAutocomplete.List>, AutocompleteListProps>(
  function AutocompleteList({ className, ...props }, ref) {
    return <BaseAutocomplete.List ref={ref} className={mergeClassName(listClass, className)} render={renderListInScrollArea} {...props} />;
  },
);

export type AutocompleteItemProps = ComponentPropsWithoutRef<typeof BaseAutocomplete.Item>;

/** Suggestion row. */
export const AutocompleteItem = forwardRef<ComponentRef<typeof BaseAutocomplete.Item>, AutocompleteItemProps>(
  function AutocompleteItem({ className, ...props }, ref) {
    return <BaseAutocomplete.Item ref={ref} data-slot="autocomplete-item" className={mergeClassName(plainOptionClass, className)} {...props} />;
  },
);

export type AutocompleteEmptyProps = ComponentPropsWithoutRef<typeof BaseAutocomplete.Empty>;

/** Shown when no suggestion matches. Collapses otherwise. */
export const AutocompleteEmpty = forwardRef<ComponentRef<typeof BaseAutocomplete.Empty>, AutocompleteEmptyProps>(
  function AutocompleteEmpty({ className, ...props }, ref) {
    return <BaseAutocomplete.Empty ref={ref} data-slot="autocomplete-empty" className={mergeClassName(emptyClass, className)} {...props} />;
  },
);

export type AutocompleteStatusProps = ComponentPropsWithoutRef<typeof BaseAutocomplete.Status>;

export const AutocompleteStatus = forwardRef<ComponentRef<typeof BaseAutocomplete.Status>, AutocompleteStatusProps>(
  function AutocompleteStatus({ className, ...props }, ref) {
    return <BaseAutocomplete.Status ref={ref} data-slot="autocomplete-status" className={mergeClassName(emptyClass, className)} {...props} />;
  },
);

export type AutocompleteGroupProps = ComponentPropsWithoutRef<typeof BaseAutocomplete.Group>;

export const AutocompleteGroup = forwardRef<ComponentRef<typeof BaseAutocomplete.Group>, AutocompleteGroupProps>(
  function AutocompleteGroup({ className, ...props }, ref) {
    return <BaseAutocomplete.Group ref={ref} data-slot="autocomplete-group" className={mergeClassName("block", className)} {...props} />;
  },
);

export type AutocompleteLabelProps = ComponentPropsWithoutRef<typeof BaseAutocomplete.GroupLabel>;

export const AutocompleteLabel = forwardRef<
  ComponentRef<typeof BaseAutocomplete.GroupLabel>,
  AutocompleteLabelProps
>(function AutocompleteLabel({ className, ...props }, ref) {
  return <BaseAutocomplete.GroupLabel ref={ref} data-slot="autocomplete-label" className={mergeClassName(groupLabelClass, className)} {...props} />;
});

export type AutocompleteSeparatorProps = ComponentPropsWithoutRef<typeof BaseAutocomplete.Separator>;

export const AutocompleteSeparator = forwardRef<
  ComponentRef<typeof BaseAutocomplete.Separator>,
  AutocompleteSeparatorProps
>(function AutocompleteSeparator({ className, ...props }, ref) {
  return <BaseAutocomplete.Separator ref={ref} data-slot="autocomplete-separator" className={mergeClassName(separatorClass, className)} {...props} />;
});
