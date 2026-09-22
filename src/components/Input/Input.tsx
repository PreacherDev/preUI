import { Input as BaseInput } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { mergeClassName } from "../../utils/cn";

/** Shared text-field look (Input, Field control). */
export const inputVariants = cva(
  [
    "flex w-full min-w-0 rounded-pui-md border border-pui-input bg-pui-background text-pui-foreground",
    "placeholder:text-pui-muted-foreground",
    "outline-none transition-colors duration-pui-fast ease-pui focus-visible:border-pui-ring",
    "data-[invalid]:border-pui-negative aria-[invalid=true]:border-pui-negative",
    "disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
    // File picker: the button fills the field height so its label is centred, and starts at the text inset.
    "file:mr-3 file:h-full file:border-0 file:bg-transparent file:p-0 file:text-sm file:font-medium file:text-pui-foreground",
    // type="search": hide the browser's native (white, untokened) clear button.
    "[&::-webkit-search-cancel-button]:appearance-none",
  ],
  {
    variants: {
      size: {
        sm: "h-pui-control-sm px-2.5 text-xs",
        default: "h-pui-control px-3 text-sm",
        lg: "h-pui-control-lg px-3.5 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export type InputSize = NonNullable<VariantProps<typeof inputVariants>["size"]>;

export interface InputProps extends Omit<BaseInput.Props, "size"> {
  size?: InputSize;
  /** The native `size` attribute (visible character width). */
  htmlSize?: number;
}

/** Single-line text field. Works standalone or inside `Field` (label, description, validation). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size, htmlSize, ...props },
  ref,
) {
  return (
    <BaseInput
      ref={ref}
      size={htmlSize}
      data-slot="input"
      data-size={size ?? "default"}
      className={mergeClassName(inputVariants({ size }), className)}
      {...props}
    />
  );
});
