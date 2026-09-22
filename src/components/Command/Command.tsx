import { Command as CommandPrimitive } from "cmdk";
import {
  forwardRef,
  useCallback,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ForwardedRef,
  type ReactNode,
} from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../Dialog/Dialog";
import { ScrollArea } from "../ScrollArea/ScrollArea";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";

/**
 * cmdk keeps the selected item visible with `element.scrollIntoView()` — which also scrolls every
 * scrollable ancestor, so an inline Command further down a page makes the whole page jump on mount.
 * Items and group headings get a replacement that only scrolls the surrounding `[cmdk-list]` — which is
 * the ScrollArea viewport (see `CommandList`), so the thumb follows and the page never moves.
 */
function scrollWithinList(this: HTMLElement) {
  const list = this.closest<HTMLElement>("[cmdk-list]");
  if (!list) return;
  const listRect = list.getBoundingClientRect();
  const rect = this.getBoundingClientRect();
  if (rect.top < listRect.top) list.scrollTop -= listRect.top - rect.top;
  else if (rect.bottom > listRect.bottom) list.scrollTop += rect.bottom - listRect.bottom;
}

function useListScrollRef<T extends HTMLElement>(ref: ForwardedRef<T>, target?: (node: T) => HTMLElement | null) {
  return useCallback(
    (node: T | null) => {
      if (node) {
        const element = target ? target(node) : node;
        if (element) element.scrollIntoView = scrollWithinList;
      }
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref, target],
  );
}

const findGroupHeading = (node: HTMLElement) => node.querySelector<HTMLElement>("[cmdk-group-heading]");

export interface CommandProps extends ComponentPropsWithoutRef<typeof CommandPrimitive> {}

/** The command menu root (cmdk). Filters and sorts its items by the input value. */
export const Command = forwardRef<ComponentRef<typeof CommandPrimitive>, CommandProps>(function Command(
  { className, ...props },
  ref,
) {
  return (
    <CommandPrimitive
      ref={ref}
      data-slot="command"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-pui-md bg-pui-popover text-pui-popover-foreground",
        className,
      )}
      {...props}
    />
  );
});

export interface CommandDialogProps extends Omit<ComponentProps<typeof Dialog>, "children"> {
  children?: ReactNode;
  /** Accessible (visually hidden) dialog title. Default `"Command Palette"`. */
  title?: string;
  /** Accessible (visually hidden) dialog description. Default `"Search for a command to run…"`. */
  description?: string;
  /** Class name of the dialog popup. */
  className?: string;
  showCloseButton?: boolean;
  /** Accessible label of the close button. Default `"Close"` (from `DialogContent`). */
  closeLabel?: string;
  /** Props for the inner `Command` (e.g. `filter`, `loop`, `shouldFilter`). */
  commandProps?: CommandProps;
}

/** A Command palette inside a modal Dialog. Control it with `open` / `onOpenChange`. */
export function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run…",
  children,
  className,
  showCloseButton = true,
  closeLabel,
  commandProps,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent
        // Anchored near the top instead of centred: filtering changes the list height, and the input must
        // not jump while typing — the palette only grows and shrinks downwards.
        className={cn(
          "top-[15vh] max-h-[70vh] origin-top translate-y-0 gap-0 overflow-hidden bg-pui-popover p-0",
          className,
        )}
        showCloseButton={showCloseButton}
        closeLabel={closeLabel}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <Command
          {...commandProps}
          className={cn(
            "rounded-none [&_[data-slot=command-input-wrapper]]:h-12",
            showCloseButton && "[&_[data-slot=command-input-wrapper]]:pr-10",
            "[&_[cmdk-group]:not([hidden])~[cmdk-group]]:pt-0",
            commandProps?.className,
          )}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export interface CommandInputProps extends ComponentPropsWithoutRef<typeof CommandPrimitive.Input> {}

/** Search field with a leading search icon and a bottom border. */
export const CommandInput = forwardRef<ComponentRef<typeof CommandPrimitive.Input>, CommandInputProps>(
  function CommandInput({ className, ...props }, ref) {
    const SearchIcon = useIcon("search");
    return (
      <div
        data-slot="command-input-wrapper"
        className="flex h-pui-control-lg shrink-0 items-center gap-2 border-b border-pui-border px-3"
      >
        <SearchIcon className="size-4 shrink-0 text-pui-muted-foreground" aria-hidden="true" />
        <CommandPrimitive.Input
          ref={ref}
          data-slot="command-input"
          className={cn(
            "flex h-full w-full bg-transparent py-3 text-sm text-pui-foreground outline-none placeholder:text-pui-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

export interface CommandListProps extends ComponentPropsWithoutRef<typeof CommandPrimitive.List> {}

/**
 * The scrolling list (max 18rem). The `[cmdk-list]` element is rendered as the viewport of a preUI
 * ScrollArea — floating thumb instead of the native scrollbar; `className` applies to that scrolling
 * element (e.g. `max-h-96`). The list element carries `[cmdk-list]` and `data-slot="scroll-area-viewport"`,
 * the wrapper `data-slot="scroll-area"`. The viewport is not a Tab stop (focus stays in the input).
 */
export const CommandList = forwardRef<ComponentRef<typeof CommandPrimitive.List>, CommandListProps>(
  function CommandList({ className, children, ...props }, ref) {
    return (
      <ScrollArea
        reserveTrack={false}
        className="min-h-0"
        viewportClassName={cn("max-h-72 scroll-py-1 focus-visible:ring-0", className)}
        viewportProps={{ tabIndex: -1, render: <CommandPrimitive.List ref={ref} {...props} /> }}
      >
        {children}
      </ScrollArea>
    );
  },
);

export interface CommandEmptyProps extends ComponentPropsWithoutRef<typeof CommandPrimitive.Empty> {}

/** Shown when no item matches the search. */
export const CommandEmpty = forwardRef<ComponentRef<typeof CommandPrimitive.Empty>, CommandEmptyProps>(
  function CommandEmpty({ className, ...props }, ref) {
    return (
      <CommandPrimitive.Empty
        ref={ref}
        data-slot="command-empty"
        className={cn("py-6 text-center text-sm text-pui-muted-foreground", className)}
        {...props}
      />
    );
  },
);

export interface CommandGroupProps extends ComponentPropsWithoutRef<typeof CommandPrimitive.Group> {}

/** A group of items; `heading` is rendered as an eyebrow label. */
export const CommandGroup = forwardRef<ComponentRef<typeof CommandPrimitive.Group>, CommandGroupProps>(
  function CommandGroup({ className, ...props }, ref) {
    const groupRef = useListScrollRef(ref, findGroupHeading);
    return (
      <CommandPrimitive.Group
        ref={groupRef}
        data-slot="command-group"
        className={cn(
          "overflow-hidden p-1 text-pui-foreground",
          "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-pui-eyebrow [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-pui-muted-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);

export interface CommandSeparatorProps extends ComponentPropsWithoutRef<typeof CommandPrimitive.Separator> {}

export const CommandSeparator = forwardRef<ComponentRef<typeof CommandPrimitive.Separator>, CommandSeparatorProps>(
  function CommandSeparator({ className, ...props }, ref) {
    return (
      <CommandPrimitive.Separator
        ref={ref}
        data-slot="command-separator"
        className={cn("-mx-1 h-px bg-pui-border", className)}
        {...props}
      />
    );
  },
);

export interface CommandItemProps extends ComponentPropsWithoutRef<typeof CommandPrimitive.Item> {}

/** A selectable entry, styled like a menu item. `onSelect` fires on click and Enter. */
export const CommandItem = forwardRef<ComponentRef<typeof CommandPrimitive.Item>, CommandItemProps>(
  function CommandItem({ className, ...props }, ref) {
    const itemRef = useListScrollRef(ref);
    return (
      <CommandPrimitive.Item
        ref={itemRef}
        data-slot="command-item"
        className={cn(
          "relative flex cursor-default select-none items-center gap-2.5 rounded-pui-sm p-2 text-sm text-pui-foreground outline-none",
          "transition-colors duration-pui-fast ease-pui",
          "data-[selected=true]:bg-pui-accent data-[selected=true]:text-pui-accent-foreground",
          "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-pui-muted-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);

export interface CommandShortcutProps extends ComponentPropsWithoutRef<"span"> {}

/** Right-aligned keyboard hint inside an item. */
export const CommandShortcut = forwardRef<HTMLSpanElement, CommandShortcutProps>(function CommandShortcut(
  { className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      data-slot="command-shortcut"
      className={cn("ml-auto text-xs tracking-widest text-pui-muted-foreground", className)}
      {...props}
    />
  );
});
