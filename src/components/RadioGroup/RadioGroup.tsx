import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { forwardRef, type ReactElement, type Ref, type RefAttributes } from "react";
import { mergeClassName, type StateClassName } from "../../utils/cn";

/** Props of `RadioGroup`; `Value` is inferred from `value` / `defaultValue` / `onValueChange` like in Base UI. */
export type RadioGroupProps<Value = any> = BaseRadioGroup.Props<Value>;

/**
 * Single selection from a list of `RadioGroupItem`s. Label it with `aria-labelledby` or `FieldSet`.
 * Generic like Base UI's: `<RadioGroup<"a" | "b"> onValueChange={(value) => …}>` types `value`.
 */
export const RadioGroup = forwardRef(function RadioGroup({ className, ...props }: RadioGroupProps, ref: Ref<HTMLDivElement>) {
  return (
    <BaseRadioGroup
      ref={ref}
      data-slot="radio-group"
      className={mergeClassName("flex flex-col items-start gap-2", className)}
      {...props}
    />
  );
}) as <Value = any>(props: RadioGroupProps<Value> & RefAttributes<HTMLDivElement>) => ReactElement;

export interface RadioGroupItemProps extends BaseRadio.Root.Props {
  /** Classes for the inner dot. */
  indicatorClassName?: StateClassName<BaseRadio.Indicator.State>;
}

/** 16px round radio; checked fills with primary and shows a centred dot. Wrap it in a `<label>` with its text. */
export const RadioGroupItem = forwardRef<HTMLElement, RadioGroupItemProps>(function RadioGroupItem(
  { className, indicatorClassName, ...props },
  ref,
) {
  return (
    <BaseRadio.Root
      ref={ref}
      data-slot="radio-group-item"
      className={mergeClassName(
        [
          "peer inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-pui-input bg-transparent p-0",
          "outline-none transition-colors duration-pui-fast ease-pui",
          // 1px gap before the ring, otherwise it vanishes against the primary fill when checked.
          "focus-visible:ring-pui focus-visible:ring-pui-ring focus-visible:ring-offset-pui focus-visible:ring-offset-pui-background",
          "data-[checked]:border-pui-primary data-[checked]:bg-pui-primary",
          "data-[invalid]:border-pui-negative",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        ],
        className,
      )}
      {...props}
    >
      <BaseRadio.Indicator
        data-slot="radio-group-indicator"
        className={mergeClassName("block size-1.5 rounded-full bg-pui-primary-foreground", indicatorClassName)}
      />
    </BaseRadio.Root>
  );
});
