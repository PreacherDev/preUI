import { forwardRef, type HTMLAttributes } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Accessible name announced by screen readers. */
  label?: string;
}

/**
 * Rotating loading indicator using the registered `spinner` icon.
 * Size it with `className` (`size-4` by default); the icon inherits the text color.
 */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { label = "Loading", className, ...props },
  ref,
) {
  const SpinnerIcon = useIcon("spinner");

  return (
    <span
      ref={ref}
      role="status"
      aria-label={label}
      data-slot="spinner"
      className={cn("inline-flex size-4 shrink-0", className)}
      {...props}
    >
      <SpinnerIcon
        data-slot="spinner-icon"
        className="size-full animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
    </span>
  );
});
