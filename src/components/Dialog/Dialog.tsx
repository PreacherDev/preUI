import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
  Children,
  cloneElement,
  forwardRef,
  Fragment,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";
import { useScrollTabStop } from "../../utils/scroll-tab-stop";
import { ScrollArea } from "../ScrollArea/ScrollArea";

/** Shared overlay styles (also used by AlertDialog). */
export const overlayClassName =
  "fixed inset-0 z-50 bg-pui-scrim/scrim transition-opacity duration-pui-base ease-pui data-[starting-style]:opacity-0 data-[ending-style]:opacity-0";

/** Shared centred-modal styles (also used by AlertDialog). */
export const modalPopupClassName = [
  "fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden",
  "rounded-pui border border-pui-border bg-pui-shell p-5 text-sm text-pui-foreground shadow-pui-window outline-none",
  "transition-[opacity,transform] duration-pui-base ease-pui",
  "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
];

/** Shared close (X) button styles (also used by Sheet and Drawer). */
export const modalCloseClassName = [
  "absolute right-4 top-4 inline-flex items-center justify-center rounded-pui-sm text-pui-muted-foreground",
  "transition-colors duration-pui-fast ease-pui hover:text-pui-foreground",
  "focus-visible:outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
];

/* ------------------------------------------------------------------------------------------------
 * Scrolling body shared by Dialog, AlertDialog, Sheet and Drawer
 * ----------------------------------------------------------------------------------------------*/

/** Flattens fragments so `<>…</>` children are sorted like direct children. */
function flattenChildren(children: ReactNode, keyPrefix = ""): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [child];
    if (child.type === Fragment) return flattenChildren(child.props.children, `${keyPrefix}${String(child.key)}/`);
    // Prefix the keys of fragment children so they can't collide with top-level siblings.
    return [keyPrefix ? cloneElement(child, { key: `${keyPrefix}${String(child.key)}` }) : child];
  });
}

export interface ModalSectionsProps {
  children?: ReactNode;
  /** Components that stay pinned above the scrolling body (e.g. `DialogHeader`). */
  header: ElementType[];
  /** Components that stay pinned below the scrolling body (e.g. `DialogFooter`). */
  footer: ElementType[];
}

/**
 * Lays out a modal surface like Base UI's "inside scroll" dialog: header and footer stay in place, everything
 * else scrolls in a preUI `ScrollArea`. The popup must be a padded (`p-5`) flex column with a max height;
 * the body spans the full popup width so its scrollbar sits in the right padding and nothing shifts.
 * @internal Used by Dialog, AlertDialog, Sheet and Drawer.
 */
export function ModalSections({ children, header, footer }: ModalSectionsProps) {
  const tabStop = useScrollTabStop();
  const top: ReactNode[] = [];
  const body: ReactNode[] = [];
  const bottom: ReactNode[] = [];
  for (const child of flattenChildren(children)) {
    const type = isValidElement(child) ? (child as ReactElement).type : null;
    if (type && header.includes(type as ElementType)) top.push(child);
    else if (type && footer.includes(type as ElementType)) bottom.push(child);
    else body.push(child);
  }
  return (
    <>
      {top}
      {body.length > 0 && (
        <ScrollArea
          data-modal-body=""
          reserveTrack={false}
          viewportRef={tabStop.viewportRef}
          viewportProps={tabStop.viewportProps}
          // -my-1/py-1 keep the gap but leave room for focus rings at the scroll edges.
          className="-mx-5 -my-1"
          contentClassName="flex flex-col gap-4 px-5 py-1"
        >
          {body}
        </ScrollArea>
      )}
      {bottom}
    </>
  );
}

export const Dialog = BaseDialog.Root;

export type DialogProps = BaseDialog.Root.Props;
export interface DialogTriggerProps extends BaseDialog.Trigger.Props {}
export interface DialogCloseProps extends ComponentPropsWithoutRef<typeof BaseDialog.Close> {}
export interface DialogPortalProps extends ComponentPropsWithoutRef<typeof BaseDialog.Portal> {}

/** Opens the dialog. Renders a `<button>` (`data-slot="dialog-trigger"`). */
export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(function DialogTrigger(props, ref) {
  return <BaseDialog.Trigger ref={ref} data-slot="dialog-trigger" {...props} />;
}) as unknown as typeof BaseDialog.Trigger;

/** Closes the dialog. Renders a `<button>` (`data-slot="dialog-close"`). */
export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(props, ref) {
  return <BaseDialog.Close ref={ref} data-slot="dialog-close" {...props} />;
});

export const DialogPortal = forwardRef<HTMLDivElement, DialogPortalProps>(function DialogPortal(props, ref) {
  return <BaseDialog.Portal ref={ref} data-slot="dialog-portal" {...props} />;
});

export interface DialogOverlayProps extends ComponentPropsWithoutRef<typeof BaseDialog.Backdrop> {}

/** The dimmed scrim behind the dialog. No blur: the content behind stays visible. */
export const DialogOverlay = forwardRef<ComponentRef<typeof BaseDialog.Backdrop>, DialogOverlayProps>(
  function DialogOverlay({ className, ...props }, ref) {
    return (
      <BaseDialog.Backdrop
        ref={ref}
        data-slot="dialog-overlay"
        className={mergeClassName(overlayClassName, className)}
        {...props}
      />
    );
  },
);

export interface DialogContentProps extends ComponentPropsWithoutRef<typeof BaseDialog.Popup> {
  /** Renders the close (X) button in the top-right corner. */
  showCloseButton?: boolean;
  /** Accessible label of the close button. */
  closeLabel?: string;
}

/**
 * Portal + Overlay + Popup in one, styled as a centred modal on the shell surface.
 * `DialogHeader` and `DialogFooter` stay in place; all other children scroll in a preUI `ScrollArea`
 * once the dialog reaches its maximum height (85vh).
 */
export const DialogContent = forwardRef<ComponentRef<typeof BaseDialog.Popup>, DialogContentProps>(
  function DialogContent({ className, children, showCloseButton = true, closeLabel = "Close", ...props }, ref) {
    const CloseIcon = useIcon("close");
    return (
      <DialogPortal>
        <DialogOverlay />
        <BaseDialog.Popup
          ref={ref}
          data-slot="dialog-content"
          className={mergeClassName(modalPopupClassName, className)}
          {...props}
        >
          <ModalSections header={[DialogHeader]} footer={[DialogFooter]}>
            {children}
          </ModalSections>
          {showCloseButton && (
            <BaseDialog.Close aria-label={closeLabel} data-slot="dialog-close" className={cn(modalCloseClassName)}>
              <CloseIcon className="size-4" aria-hidden="true" />
            </BaseDialog.Close>
          )}
        </BaseDialog.Popup>
      </DialogPortal>
    );
  },
);

export interface DialogHeaderProps extends ComponentPropsWithoutRef<"div"> {}

/** Stacks title and description; leaves room for the close button. */
export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(function DialogHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="dialog-header" className={cn("flex flex-col gap-1 pr-6", className)} {...props} />;
});

export interface DialogFooterProps extends ComponentPropsWithoutRef<"div"> {}

/** Right-aligned action row, e.g. a ghost cancel and a solid confirm. */
export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(function DialogFooter(
  { className, ...props },
  ref,
) {
  return (
    <div ref={ref} data-slot="dialog-footer" className={cn("flex justify-end gap-2 pt-1", className)} {...props} />
  );
});

export interface DialogTitleProps extends ComponentPropsWithoutRef<typeof BaseDialog.Title> {}

export const DialogTitle = forwardRef<ComponentRef<typeof BaseDialog.Title>, DialogTitleProps>(function DialogTitle(
  { className, ...props },
  ref,
) {
  return (
    <BaseDialog.Title
      ref={ref}
      data-slot="dialog-title"
      className={mergeClassName("text-base font-semibold text-pui-foreground", className)}
      {...props}
    />
  );
});

export interface DialogDescriptionProps extends ComponentPropsWithoutRef<typeof BaseDialog.Description> {}

export const DialogDescription = forwardRef<ComponentRef<typeof BaseDialog.Description>, DialogDescriptionProps>(
  function DialogDescription({ className, ...props }, ref) {
    return (
      <BaseDialog.Description
        ref={ref}
        data-slot="dialog-description"
        className={mergeClassName("text-sm text-pui-muted-foreground", className)}
        {...props}
      />
    );
  },
);
