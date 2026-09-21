import { Form as BaseForm } from "@base-ui/react/form";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";

export type FormProps = ComponentPropsWithoutRef<typeof BaseForm>;

/** Native form with consolidated error handling for the `Field`s inside it. */
export const Form = forwardRef<ComponentRef<typeof BaseForm>, FormProps>(function Form({ className, ...props }, ref) {
  return <BaseForm ref={ref} data-slot="form" className={mergeClassName("flex flex-col gap-4", className)} {...props} />;
});
