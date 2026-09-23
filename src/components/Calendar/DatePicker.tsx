import { useFieldRootContext } from "@base-ui/react/internals/field-root-context";
import { useLabelableContext, useLabelableId } from "@base-ui/react/internals/labelable-provider";
import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import type { DateRange, DayPickerLocale, PropsBase } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger, type PopoverContentProps } from "../Popover/Popover";
import { useIcon } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";
import { useMediaQuery } from "../../utils/use-media-query";
import { Calendar } from "./Calendar";

/** Calendar props a picker passes through (selection and locale are managed by the picker). */
export type DatePickerCalendarProps = Omit<PropsBase, "mode" | "required" | "locale">;

type TriggerProps = Omit<ComponentPropsWithoutRef<typeof PopoverTrigger>, "children" | "disabled" | "value" | "defaultValue">;

interface PickerBaseProps extends TriggerProps {
  /** Text shown while nothing is selected. */
  placeholder?: ReactNode;
  /** Locale for the calendar and the default date format, e.g. `de` from `react-day-picker/locale`. */
  locale?: DayPickerLocale;
  /**
   * Formats a date for the trigger. Default: `toLocaleDateString` with the `locale`'s code (medium date style),
   * falling back to `"en-US"` — never the runtime locale, so server and client render the same text.
   */
  formatDate?: (date: Date) => string;
  disabled?: boolean;
  /**
   * Marks the picker invalid (`aria-invalid`, `data-invalid`, negative border). Inside a `Field` it also follows the
   * field's validity (`<Field invalid>`), so this is mainly for use without a Field.
   */
  invalid?: boolean;
  /** Leading icon in the trigger. Defaults to the `calendar` icon from the IconProvider; pass `null` to hide it. */
  icon?: ReactNode;
  /** Extra props for the Calendar (e.g. `disabled` days, `captionLayout`, `startMonth`). */
  calendarProps?: DatePickerCalendarProps;
  /** Props for the popover surface (e.g. `align`, `side`, `className`). */
  contentProps?: Omit<PopoverContentProps, "children">;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface DatePickerProps extends PickerBaseProps {
  /** Selected date (controlled). Use `null` for a controlled empty value. */
  value?: Date | null;
  defaultValue?: Date;
  onValueChange?: (value: Date | undefined) => void;
  /** Closes the popover after a day was picked. */
  closeOnSelect?: boolean;
}

export interface DateRangePickerProps extends PickerBaseProps {
  /** Selected range (controlled). Use `null` for a controlled empty value. */
  value?: DateRange | null;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange | undefined) => void;
  /** Number of months; default 2 on screens ≥ 640px, otherwise 1. */
  numberOfMonths?: number;
  /** Separator between start and end date in the trigger. */
  separator?: string;
}

function useControllable<T>(
  value: T | null | undefined,
  defaultValue: T | undefined,
  onChange?: (value: T | undefined) => void,
) {
  const [inner, setInner] = useState<T | undefined>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value ?? undefined) : inner;
  const set = useCallback(
    (next: T | undefined) => {
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set] as const;
}

/** SSR-safe (`false` on the server and while hydrating), see `useMediaQuery`. */
function useIsWide(query = "(min-width: 640px)") {
  return useMediaQuery(query);
}

function defaultFormat(locale?: DayPickerLocale) {
  return (date: Date) => date.toLocaleDateString(locale?.code ?? "en-US", { dateStyle: "medium" });
}

const fieldTriggerClassName = [
  "flex h-pui-control w-full items-center gap-2 rounded-pui-md border border-pui-input bg-pui-background px-3 text-left text-sm text-pui-foreground",
  "outline-none transition-colors duration-pui-fast ease-pui focus-visible:border-pui-ring data-[popup-open]:border-pui-ring",
  "data-[invalid]:border-pui-negative",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
];

interface PickerFieldParams {
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  filled: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  onFocus?: TriggerProps["onFocus"];
  onBlur?: TriggerProps["onBlur"];
}

type TriggerFocusEvent = Parameters<NonNullable<TriggerProps["onFocus"]>>[0];

/**
 * Connects a picker trigger to a surrounding Base UI `Field` the way `Select.Trigger` does: `id` for the label's
 * `htmlFor`, `aria-labelledby` (label + current value), `aria-describedby` (description / error), disabled,
 * invalid and the field's focused / touched / filled state. Outside a Field the contexts are no-op defaults.
 */
function usePickerField({
  id: idProp,
  disabled: disabledProp,
  invalid: invalidProp,
  filled,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  onFocus,
  onBlur,
}: PickerFieldParams) {
  const field = useFieldRootContext();
  const { labelId, getDescriptionProps } = useLabelableContext();
  const id = useLabelableId({ id: idProp });
  const disabled = Boolean(field.disabled || disabledProp);
  const invalid = Boolean(invalidProp || field.state.valid === false);
  const valueId = id ? `${id}-value` : undefined;
  const { setFilled, setFocused, setTouched } = field;

  useEffect(() => {
    setFilled(filled);
  }, [filled, setFilled]);

  const describedBy = getDescriptionProps({ "aria-describedby": ariaDescribedBy })["aria-describedby"] as string | undefined;

  return {
    valueId,
    triggerProps: {
      id,
      disabled,
      "aria-label": ariaLabel,
      // Accessible name = field label + current value ("Birthday Mar 12, 2025"), like a labelled native control.
      "aria-labelledby": ariaLabelledBy ?? (labelId && !ariaLabel ? `${labelId} ${valueId}` : undefined),
      "aria-describedby": describedBy,
      "aria-invalid": invalid || undefined,
      "data-invalid": invalid ? "" : undefined,
      "data-touched": field.state.touched ? "" : undefined,
      "data-filled": filled ? "" : undefined,
      onFocus(event: TriggerFocusEvent) {
        setFocused(true);
        onFocus?.(event);
      },
      onBlur(event: TriggerFocusEvent) {
        setTouched(true);
        setFocused(false);
        onBlur?.(event);
      },
    },
  };
}

interface TriggerContentProps {
  /** `data-slot` prefix of the parts (`date-picker` / `date-range-picker`). */
  slot: string;
  /** `id` of the value span (part of the trigger's accessible name inside a Field). */
  valueId?: string;
  icon?: ReactNode;
  text?: string;
  placeholder?: ReactNode;
}

function TriggerContent({ slot, valueId, icon, text, placeholder }: TriggerContentProps) {
  const CalendarIcon = useIcon("calendar");
  const leading = icon === undefined ? <CalendarIcon /> : icon;

  return (
    <>
      {leading && (
        <span data-slot={`${slot}-icon`} className="inline-flex text-pui-muted-foreground" aria-hidden="true">
          {leading}
        </span>
      )}
      <span id={valueId} data-slot={`${slot}-value`} className={cn("flex-1 truncate", !text && "text-pui-muted-foreground")}>
        {text || placeholder}
      </span>
    </>
  );
}

/** A field-like trigger that opens a Calendar in a popover (single date). */
export const DatePicker = /* @__PURE__ */ forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  {
    value,
    defaultValue,
    onValueChange,
    placeholder,
    locale,
    formatDate,
    disabled,
    invalid,
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    onFocus,
    onBlur,
    icon,
    calendarProps,
    contentProps,
    closeOnSelect = true,
    open,
    defaultOpen,
    onOpenChange,
    className,
    ...props
  },
  ref,
) {
  const [date, setDate] = useControllable(value, defaultValue, onValueChange);
  const [isOpen, setOpen] = useControllable(open, defaultOpen ?? false, (next) => onOpenChange?.(Boolean(next)));
  const format = formatDate ?? defaultFormat(locale);

  const { valueId, triggerProps } = usePickerField({
    id,
    disabled,
    invalid,
    filled: Boolean(date),
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    onFocus,
    onBlur,
  });

  return (
    <Popover open={Boolean(isOpen)} onOpenChange={(next) => setOpen(next)}>
      <PopoverTrigger
        ref={ref}
        {...triggerProps}
        data-slot="date-picker"
        data-placeholder={date ? undefined : ""}
        className={mergeClassName(fieldTriggerClassName, className)}
        {...props}
      >
        <TriggerContent slot="date-picker" valueId={valueId} icon={icon} text={date ? format(date) : undefined} placeholder={placeholder} />
      </PopoverTrigger>
      <PopoverContent align="start" {...contentProps} className={mergeClassName("w-auto p-0", contentProps?.className)}>
        <Calendar
          defaultMonth={date}
          autoFocus
          {...calendarProps}
          locale={locale}
          mode="single"
          selected={date}
          onSelect={(next) => {
            setDate(next);
            if (closeOnSelect && next) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
});

/** A field-like trigger that opens a Calendar in range mode (two months on wide screens). */
export const DateRangePicker = /* @__PURE__ */ forwardRef<HTMLButtonElement, DateRangePickerProps>(function DateRangePicker(
  {
    value,
    defaultValue,
    onValueChange,
    placeholder,
    locale,
    formatDate,
    disabled,
    invalid,
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    onFocus,
    onBlur,
    icon,
    calendarProps,
    contentProps,
    numberOfMonths,
    separator = " – ",
    open,
    defaultOpen,
    onOpenChange,
    className,
    ...props
  },
  ref,
) {
  const [range, setRange] = useControllable(value, defaultValue, onValueChange);
  const [isOpen, setOpen] = useControllable(open, defaultOpen ?? false, (next) => onOpenChange?.(Boolean(next)));
  const wide = useIsWide();
  const format = formatDate ?? defaultFormat(locale);

  let text: string | undefined;
  if (range?.from) {
    // react-day-picker starts a range with from = to (first click): show that as a single date.
    const sameDay = !range.to || range.to.toDateString() === range.from.toDateString();
    text = sameDay ? format(range.from) : `${format(range.from)}${separator}${format(range.to!)}`;
  }

  const { valueId, triggerProps } = usePickerField({
    id,
    disabled,
    invalid,
    filled: Boolean(range?.from),
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    onFocus,
    onBlur,
  });

  return (
    <Popover open={Boolean(isOpen)} onOpenChange={(next) => setOpen(next)}>
      <PopoverTrigger
        ref={ref}
        {...triggerProps}
        data-slot="date-range-picker"
        data-placeholder={text ? undefined : ""}
        className={mergeClassName(fieldTriggerClassName, className)}
        {...props}
      >
        <TriggerContent slot="date-range-picker" valueId={valueId} icon={icon} text={text} placeholder={placeholder} />
      </PopoverTrigger>
      <PopoverContent align="start" {...contentProps} className={mergeClassName("w-auto p-0", contentProps?.className)}>
        <Calendar
          defaultMonth={range?.from}
          numberOfMonths={numberOfMonths ?? (wide ? 2 : 1)}
          autoFocus
          {...calendarProps}
          locale={locale}
          mode="range"
          selected={range}
          onSelect={(next) => setRange(next)}
        />
      </PopoverContent>
    </Popover>
  );
});
