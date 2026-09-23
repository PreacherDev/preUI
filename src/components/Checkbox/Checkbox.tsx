import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { forwardRef } from "react";
import { useIcon } from "../../icons";
import { mergeClassName, type StateClassName } from "../../utils/cn";

export interface CheckboxProps extends BaseCheckbox.Root.Props {
  /** Classes for the indicator that holds the check / minus icon. */
  indicatorClassName?: StateClassName<BaseCheckbox.Indicator.State>;
}

/**
 * 16px checkbox with a 4px radius. Checked and indeterminate fill with primary and show the `check` /
 * `minus` icon. Wrap it in a `<label>` (or `FieldLabel`) together with its text.
 */
export const Checkbox = /* @__PURE__ */ forwardRef<HTMLElement, CheckboxProps>(function Checkbox(
  { className, indicatorClassName, ...props },
  ref,
) {
  const Check = useIcon("check");
  const Minus = useIcon("minus");

  return (
    <BaseCheckbox.Root
      ref={ref}
      data-slot="checkbox"
      className={mergeClassName(
        [
          "peer inline-flex size-4 shrink-0 items-center justify-center rounded-pui-sm border border-pui-input bg-transparent p-0",
          "text-pui-primary-foreground outline-none transition-colors duration-pui-fast ease-pui",
          // 1px gap before the ring, otherwise it vanishes against the primary fill when checked.
          "focus-visible:ring-pui focus-visible:ring-pui-ring focus-visible:ring-offset-pui focus-visible:ring-offset-pui-background",
          "data-[checked]:border-pui-primary data-[checked]:bg-pui-primary",
          "data-[indeterminate]:border-pui-primary data-[indeterminate]:bg-pui-primary",
          "data-[invalid]:border-pui-negative",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        ],
        className,
      )}
      {...props}
    >
      <BaseCheckbox.Indicator
        data-slot="checkbox-indicator"
        className={mergeClassName("flex items-center justify-center text-current", indicatorClassName)}
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            {state.indeterminate ? (
              <Minus className="size-3.5" aria-hidden="true" />
            ) : (
              <Check className="size-3.5" aria-hidden="true" />
            )}
          </span>
        )}
      />
    </BaseCheckbox.Root>
  );
});
