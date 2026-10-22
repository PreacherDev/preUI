import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName, type StateClassName } from "../../utils/cn";
import { WithTooltip, type IconTooltip } from "../Tooltip/IconTooltip";
import { usePreuiLabels } from "../Labels/LabelsProvider";

export const numberFieldVariants = /* @__PURE__ */ cva(
  [
    "flex w-full items-stretch overflow-hidden rounded-pui-md border border-pui-input bg-pui-background",
    "transition-colors duration-pui-fast ease-pui focus-within:border-pui-ring",
    "data-[invalid]:border-pui-negative",
    // The invalid border outranks the focus border: a ring in the negative colour shows the focus instead.
    "data-[invalid]:focus-within:ring-pui data-[invalid]:focus-within:ring-pui-negative",
    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
  ],
  {
    variants: {
      // Text size like `inputVariants` (the inner input inherits it).
      size: {
        sm: "h-pui-control-sm text-xs",
        default: "h-pui-control text-sm",
        lg: "h-pui-control-lg text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export type NumberFieldSize = NonNullable<VariantProps<typeof numberFieldVariants>["size"]>;

// Without steppers the input gets the padding of `inputVariants` per size, so it looks like a plain Input.
const plainInputPadding: Record<NumberFieldSize, string> = {
  sm: "px-2.5",
  default: "px-3",
  lg: "px-3.5",
};

const stepperClassName = [
  "flex w-8 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-pui-muted-foreground outline-none",
  "transition-colors duration-pui-fast ease-pui hover:bg-pui-accent hover:text-pui-foreground",
  "focus-visible:bg-pui-accent focus-visible:text-pui-foreground",
  "disabled:pointer-events-none disabled:opacity-40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
];

export interface NumberFieldProps extends BaseNumberField.Root.Props {
  size?: NumberFieldSize;
  /**
   * Locale for formatting and parsing the value (`Intl.NumberFormat`). Default `"en-US"` — not the runtime
   * locale, so server and client render the same value. Pass e.g. `"de-DE"` for `1.234,5`.
   */
  locale?: Intl.LocalesArgument;
  placeholder?: string;
  /**
   * Show the -/+ buttons. `false` leaves them out (dense tables): the value is left-aligned with the padding of an
   * `Input` of the same size. Keyboard, wheel and scrub stepping stay. @default true
   */
  steppers?: boolean;
  /** Accessible label of the minus button. */
  decrementLabel?: string;
  /** Accessible label of the plus button. */
  incrementLabel?: string;
  /**
   * Tooltips of the -/+ buttons, each showing its own label: `false` = none, a string or node = the same text for
   * both, an options object = `side` / `align` / `delay`. Default: the labels.
   */
  stepperTooltip?: IconTooltip;
  inputClassName?: StateClassName<BaseNumberField.Input.State>;
  /** Extra props for the inner `<input>` (e.g. `aria-label`, `aria-describedby`). */
  inputProps?: Omit<ComponentPropsWithoutRef<typeof BaseNumberField.Input>, "className">;
}

/**
 * Numeric field with -/+ steppers on both sides, separated by borders; the value is centred with
 * tabular figures. Keyboard (arrows, Page Up/Down, Home/End) and wheel/scrub stepping come from Base UI.
 * `steppers={false}` drops the buttons and looks like a plain `Input`.
 */
export const NumberField = /* @__PURE__ */ forwardRef<HTMLDivElement, NumberFieldProps>(function NumberField(
  {
    className,
    size,
    steppers = true,
    placeholder,
    decrementLabel: decrementLabelProp,
    incrementLabel: incrementLabelProp,
    stepperTooltip,
    inputClassName,
    inputProps,
    locale = "en-US",
    ...props
  },
  ref,
) {
  const preuiLabels = usePreuiLabels();
  const decrementLabel = decrementLabelProp ?? preuiLabels.decrease;
  const incrementLabel = incrementLabelProp ?? preuiLabels.increase;
  const Minus = useIcon("minus");
  const Plus = useIcon("plus");

  return (
    <BaseNumberField.Root
      ref={ref}
      data-slot="number-field"
      data-size={size ?? "default"}
      data-steppers={steppers ? undefined : "false"}
      locale={locale}
      className={mergeClassName(numberFieldVariants({ size }), className)}
      {...props}
    >
      <BaseNumberField.Group data-slot="number-field-group" className="flex min-w-0 flex-1 items-stretch">
        {steppers && (
          <WithTooltip tooltip={stepperTooltip} label={decrementLabel}>
            <BaseNumberField.Decrement
              data-slot="number-field-decrement"
              aria-label={decrementLabel}
              className={cn(stepperClassName, "border-r border-solid border-pui-input")}
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </BaseNumberField.Decrement>
          </WithTooltip>
        )}
        <BaseNumberField.Input
          data-slot="number-field-input"
          placeholder={placeholder}
          {...inputProps}
          className={mergeClassName(
            [
              "min-w-0 flex-1 border-0 bg-transparent text-[length:inherit] tabular-nums text-pui-foreground outline-none",
              steppers ? "px-2 text-center" : cn(plainInputPadding[size ?? "default"], "text-left"),
              "placeholder:text-pui-muted-foreground",
            ],
            inputClassName,
          )}
        />
        {steppers && (
          <WithTooltip tooltip={stepperTooltip} label={incrementLabel}>
            <BaseNumberField.Increment
              data-slot="number-field-increment"
              aria-label={incrementLabel}
              className={cn(stepperClassName, "border-l border-solid border-pui-input")}
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </BaseNumberField.Increment>
          </WithTooltip>
        )}
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
});
