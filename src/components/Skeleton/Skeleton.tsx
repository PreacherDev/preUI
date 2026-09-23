import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Placeholder block for content that is still loading. Size it with `className`. */
export const Skeleton = /* @__PURE__ */ forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-pui-md bg-pui-muted motion-reduce:animate-none", className)}
      {...props}
    />
  );
});
