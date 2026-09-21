import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type KbdProps = HTMLAttributes<HTMLElement>;

/** Keyboard key cap for shortcuts, e.g. `<Kbd>Esc</Kbd>`. */
export const Kbd = forwardRef<HTMLElement, KbdProps>(function Kbd({ className, ...props }, ref) {
  return (
    <kbd
      ref={ref}
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 select-none items-center justify-center gap-1",
        "rounded-pui-sm border border-pui-border bg-pui-muted px-1",
        "font-sans text-xs font-medium text-pui-muted-foreground",
        "[&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
});

export type KbdGroupProps = HTMLAttributes<HTMLElement>;

/** Groups the keys of one shortcut, e.g. `<KbdGroup><Kbd>Strg</Kbd><Kbd>K</Kbd></KbdGroup>`. */
export const KbdGroup = forwardRef<HTMLElement, KbdGroupProps>(function KbdGroup({ className, ...props }, ref) {
  return (
    <kbd ref={ref} data-slot="kbd-group" className={cn("inline-flex items-center gap-1", className)} {...props} />
  );
});
