import { Field as BaseField } from "@base-ui/react/field";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";

export interface TextareaProps extends Omit<ComponentPropsWithoutRef<typeof BaseField.Control>, "render" | "size"> {
  rows?: number;
  cols?: number;
  wrap?: string;
}

/**
 * Multi-line text field (min-height 80px, no resize). Works standalone or inside `Field`
 * (label, description, validation).
 */
export const Textarea = forwardRef<ComponentRef<typeof BaseField.Control>, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <BaseField.Control
      ref={ref}
      render={<textarea />}
      data-slot="textarea"
      className={mergeClassName(
        [
          "flex min-h-20 w-full min-w-0 resize-none rounded-pui-md border border-pui-input bg-pui-background px-3 py-2",
          "text-sm leading-snug text-pui-foreground placeholder:text-pui-muted-foreground",
          "outline-none transition-colors duration-pui-fast ease-pui focus-visible:border-pui-ring",
          "data-[invalid]:border-pui-negative aria-[invalid=true]:border-pui-negative",
          "disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        ],
        className,
      )}
      {...props}
    />
  );
});
