import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName, type StateClassName } from "../../utils/cn";

export const numberFieldVariants = cva(
  [
    "flex w-full items-stretch overflow-hidden rounded-pui-md border border-pui-input bg-pui-background text-sm",
    "transition-colors duration-pui-fast ease-pui focus-within:border-pui-ring",
    "data-[invalid]:border-pui-negative",
    "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
  ],
  {
    variants: {
      size: {
        sm: "h-pui-control-sm",
        default: "h-pui-control",
        lg: "h-pui-control-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export type NumberFieldSize = NonNullable<VariantProps<typeof numberFieldVariants>["size"]>;

const stepperClassName = [
  "flex w-8 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-pui-muted-foreground outline-none",
  "transition-colors duration-pui-fast ease-pui hover:bg-pui-accent hover:text-pui-foreground",
  "focus-visible:bg-pui-accent focus-visible:text-pui-foreground",
  "disabled:pointer-events-none disabled:opacity-40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
];

export interface NumberFieldProps extends BaseNumberField.Root.Props {
  size?: NumberFieldSize;
  placeholder?: string;
  /** Accessible label of the minus button. */
  decrementLabel?: string;
  /** Accessible label of the plus button. */
  incrementLabel?: string;
  inputClassName?: StateClassName<BaseNumberField.Input.State>;
  /** Extra props for the inner `<input>` (e.g. `aria-label`, `aria-describedby`). */
  inputProps?: Omit<ComponentPropsWithoutRef<typeof BaseNumberField.Input>, "className">;
}

/**
 * Numeric field with -/+ steppers on both sides, separated by borders; the value is centred with
 * tabular figures. Keyboard (arrows, Page Up/Down, Home/End) and wheel/scrub stepping come from Base UI.
 */
export const NumberField = forwardRef<HTMLDivElement, NumberFieldProps>(function NumberField(
  {
    className,
    size,
    placeholder,
    decrementLabel = "Decrease",
    incrementLabel = "Increase",
    inputClassName,
    inputProps,
    ...props
  },
  ref,
) {
  const Minus = useIcon("minus");
  const Plus = useIcon("plus");

  return (
    <BaseNumberField.Root
      ref={ref}
      data-slot="number-field"
      data-size={size ?? "default"}
      className={mergeClassName(numberFieldVariants({ size }), className)}
      {...props}
    >
      <BaseNumberField.Group data-slot="number-field-group" className="flex min-w-0 flex-1 items-stretch">
        <BaseNumberField.Decrement
          data-slot="number-field-decrement"
          aria-label={decrementLabel}
          className={cn(stepperClassName, "border-r border-solid border-pui-input")}
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </BaseNumberField.Decrement>
        <BaseNumberField.Input
          data-slot="number-field-input"
          placeholder={placeholder}
          {...inputProps}
          className={mergeClassName(
            [
              "min-w-0 flex-1 border-0 bg-transparent px-2 text-center text-sm tabular-nums text-pui-foreground outline-none",
              "placeholder:text-pui-muted-foreground",
            ],
            inputClassName,
          )}
        />
        <BaseNumberField.Increment
          data-slot="number-field-increment"
          aria-label={incrementLabel}
          className={cn(stepperClassName, "border-l border-solid border-pui-input")}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </BaseNumberField.Increment>
      </BaseNumberField.Group>
    </BaseNumberField.Root>
  );
});
