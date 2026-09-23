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
  /**
   * Leading icon: a node, `true` for the built-in search icon, `false` / `null` for none.
   * Default: the search icon (same `icon` type as `ComboboxInput`, whose default is none).
   */
  icon?: ReactNode | boolean;
  /** Show a clear button while the input has text. Default `true`. */
  showClear?: boolean;
  /** Show a chevron button that opens the suggestions. Default `false` (search field look). */
  showTrigger?: boolean;
  /** Accessible label of the clear button. Default `"Clear"`. */
  clearLabel?: string;
  /** Accessible label of the chevron trigger. Default `"Open"`. */
  triggerLabel?: string;
}

/**
 * Search-style field: leading search icon, input, clear button (chevron trigger with `showTrigger`).
 * `ComboboxInput` is the select-like counterpart (no icon, trigger shown by default) — both take the same props.
 */
export const AutocompleteInput = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAutocomplete.Input>, AutocompleteInputProps>(
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
    const leading = icon === undefined || icon === true ? <Search /> : icon;
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
  /** Element the portal renders into (Base UI Portal `container`); defaults to `document.body`. */
  container?: BaseAutocomplete.Portal.Props["container"];
}

/** Portal + Positioner + Popup in one. Put `AutocompleteEmpty` and `AutocompleteList` inside. */
export const AutocompleteContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAutocomplete.Popup>, AutocompleteContentProps>(
  function AutocompleteContent(
    { className, side = "bottom", align = "start", sideOffset = 4, alignOffset = 0, positionerProps, container, ...props },
    ref,
  ) {
    return (
      <BaseAutocomplete.Portal container={container}>
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

export interface AutocompleteListProps extends ComponentPropsWithoutRef<typeof BaseAutocomplete.List> {}

/**
 * The scrolling list. It is rendered as the viewport of a preUI ScrollArea (floating thumb, no native
 * scrollbar); `className` applies to that scrolling element, e.g. `max-h-96`.
 */
export const AutocompleteList = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAutocomplete.List>, AutocompleteListProps>(
  function AutocompleteList({ className, ...props }, ref) {
    return <BaseAutocomplete.List ref={ref} className={mergeClassName(listClass, className)} render={renderListInScrollArea} {...props} />;
  },
);

export interface AutocompleteItemProps extends ComponentPropsWithoutRef<typeof BaseAutocomplete.Item> {}

/** Suggestion row. */
export const AutocompleteItem = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAutocomplete.Item>, AutocompleteItemProps>(
  function AutocompleteItem({ className, ...props }, ref) {
    return <BaseAutocomplete.Item ref={ref} data-slot="autocomplete-item" className={mergeClassName(plainOptionClass, className)} {...props} />;
  },
);

export interface AutocompleteEmptyProps extends ComponentPropsWithoutRef<typeof BaseAutocomplete.Empty> {}

/** Shown when no suggestion matches. Collapses otherwise. */
export const AutocompleteEmpty = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAutocomplete.Empty>, AutocompleteEmptyProps>(
  function AutocompleteEmpty({ className, ...props }, ref) {
    return <BaseAutocomplete.Empty ref={ref} data-slot="autocomplete-empty" className={mergeClassName(emptyClass, className)} {...props} />;
  },
);

export interface AutocompleteStatusProps extends ComponentPropsWithoutRef<typeof BaseAutocomplete.Status> {}

export const AutocompleteStatus = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAutocomplete.Status>, AutocompleteStatusProps>(
  function AutocompleteStatus({ className, ...props }, ref) {
    return <BaseAutocomplete.Status ref={ref} data-slot="autocomplete-status" className={mergeClassName(emptyClass, className)} {...props} />;
  },
);

export interface AutocompleteGroupProps extends ComponentPropsWithoutRef<typeof BaseAutocomplete.Group> {}

export const AutocompleteGroup = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAutocomplete.Group>, AutocompleteGroupProps>(
  function AutocompleteGroup({ className, ...props }, ref) {
    return <BaseAutocomplete.Group ref={ref} data-slot="autocomplete-group" className={mergeClassName("block", className)} {...props} />;
  },
);

export interface AutocompleteLabelProps extends ComponentPropsWithoutRef<typeof BaseAutocomplete.GroupLabel> {}

export const AutocompleteLabel = /* @__PURE__ */ forwardRef<
  ComponentRef<typeof BaseAutocomplete.GroupLabel>,
  AutocompleteLabelProps
>(function AutocompleteLabel({ className, ...props }, ref) {
  return <BaseAutocomplete.GroupLabel ref={ref} data-slot="autocomplete-label" className={mergeClassName(groupLabelClass, className)} {...props} />;
});

export interface AutocompleteSeparatorProps extends ComponentPropsWithoutRef<typeof BaseAutocomplete.Separator> {}

export const AutocompleteSeparator = /* @__PURE__ */ forwardRef<
  ComponentRef<typeof BaseAutocomplete.Separator>,
  AutocompleteSeparatorProps
>(function AutocompleteSeparator({ className, ...props }, ref) {
  return <BaseAutocomplete.Separator ref={ref} data-slot="autocomplete-separator" className={mergeClassName(separatorClass, className)} {...props} />;
});
