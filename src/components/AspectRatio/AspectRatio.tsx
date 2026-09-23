import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface AspectRatioProps extends HTMLAttributes<HTMLDivElement> {
  /** Width divided by height, e.g. `16 / 9`. Defaults to `1`. */
  ratio?: number;
}

/** Keeps its content at a fixed width-to-height ratio. Children usually fill it (`size-full object-cover`). */
export const AspectRatio = /* @__PURE__ */ forwardRef<HTMLDivElement, AspectRatioProps>(function AspectRatio(
  { ratio = 1, className, style, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="aspect-ratio"
      className={cn("relative w-full", className)}
      style={{ aspectRatio: String(ratio), ...style }}
      {...props}
    />
  );
});
