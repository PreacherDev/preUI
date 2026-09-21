import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";

export type CheckboxGroupProps = ComponentPropsWithoutRef<typeof BaseCheckboxGroup>;

/**
 * Shared state for a list of `Checkbox`es (by `value`). Supports a parent checkbox via `allValues` +
 * `<Checkbox parent />`. Label it with `aria-labelledby` or render it inside `FieldSet`.
 */
export const CheckboxGroup = forwardRef<ComponentRef<typeof BaseCheckboxGroup>, CheckboxGroupProps>(
  function CheckboxGroup({ className, ...props }, ref) {
    return (
      <BaseCheckboxGroup
        ref={ref}
        data-slot="checkbox-group"
        className={mergeClassName("flex flex-col items-start gap-2", className)}
        {...props}
      />
    );
  },
);
