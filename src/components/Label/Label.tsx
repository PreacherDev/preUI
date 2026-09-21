import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

/** Small muted field label (12px, medium, sentence case). Dims next to a disabled peer or inside a disabled group. */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      data-slot="label"
      className={cn(
        "flex select-none items-center gap-2 text-xs font-medium leading-4 text-pui-muted-foreground",
        // Native peers (`:disabled`) and Base UI peers such as Checkbox / Switch / Radio (`data-disabled`).
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        "peer-data-[disabled]:cursor-not-allowed peer-data-[disabled]:opacity-50",
        "group-data-[disabled]:pointer-events-none group-data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
