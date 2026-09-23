import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  Fragment,
  isValidElement,
  useContext,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";
import { useInitialFocusWithoutScroll } from "../../utils/modal-focus";
import { useScrollTabStop } from "../../utils/scroll-tab-stop";
import { ScrollArea } from "../ScrollArea/ScrollArea";

/** Shared overlay styles (also used by AlertDialog and Sheet). */
export const modalOverlayClassName =
  "fixed inset-0 z-50 bg-pui-scrim/scrim transition-opacity duration-pui-base ease-pui data-[starting-style]:opacity-0 data-[ending-style]:opacity-0";

/** Shared centred-modal styles (also used by AlertDialog). */
export const modalPopupClassName = [
  "fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden",
  "rounded-pui border border-pui-border bg-pui-shell p-5 text-sm text-pui-foreground shadow-pui-window outline-none",
  "transition-[opacity,transform] duration-pui-base ease-pui",
  "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
];

/** Centred modal inside a portal container: positioned against the container, height relative to it. */
export const modalPopupContainedClassName = "absolute max-h-[85%]";

/* ------------------------------------------------------------------------------------------------
 * Contained modals (portal into a frame instead of the viewport)
 * ----------------------------------------------------------------------------------------------*/

/**
 * Set by the modal portals (Dialog, AlertDialog, Sheet, Drawer): `true` when overlay and popup position inside the
 * portal container (`absolute`) instead of the viewport (`fixed`).
 * @internal
 */
export const ModalContainedContext = /* @__PURE__ */ createContext(false);

/** Whether the surrounding modal portal is contained in its container. @internal */
export function useModalContained() {
  return useContext(ModalContainedContext);
}

/** Props shared by the modal portals. */
export interface ModalPortalOptions {
  /**
   * Positions overlay and popup inside `container` (`absolute`, `inset-0` of the container) instead of the viewport
   * (`fixed`): the scrim only covers the container and sheets/drawers dock to its edges. Defaults to `true` when a
   * `container` is given. The container needs a positioning context (`relative`) and usually `overflow-hidden`.
   * Set `false` to portal into another element (e.g. a themed root) but keep viewport positioning.
   */
  contained?: boolean;
}

/** Props shared by the all-in-one modal contents (`DialogContent`, `SheetContent` …). */
export interface ModalContentOptions<OverlayClassName> extends ModalPortalOptions {
  /** Element the portal renders into (Base UI Portal `container`); defaults to `document.body`. */
  container?: BaseDialog.Portal.Props["container"];
  /** Renders the dimmed scrim. `false` = no scrim (the dialog stays modal). Default `true`. */
  overlay?: boolean;
  /** Class name merged into the scrim, e.g. a lighter in-game scrim: `"bg-pui-scrim/40"`. */
  overlayClassName?: OverlayClassName;
}

/** `data-contained` for overlays and popups. @internal */
export const containedAttr = (contained: boolean) => (contained ? "" : undefined);

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
export interface DialogPortalProps extends ComponentPropsWithoutRef<typeof BaseDialog.Portal>, ModalPortalOptions {}

/** Opens the dialog. Renders a `<button>` (`data-slot="dialog-trigger"`). */
export const DialogTrigger = /* @__PURE__ */ forwardRef<HTMLButtonElement, DialogTriggerProps>(function DialogTrigger(props, ref) {
  return <BaseDialog.Trigger ref={ref} data-slot="dialog-trigger" {...props} />;
}) as unknown as typeof BaseDialog.Trigger;

/** Closes the dialog. Renders a `<button>` (`data-slot="dialog-close"`). */
export const DialogClose = /* @__PURE__ */ forwardRef<HTMLButtonElement, DialogCloseProps>(function DialogClose(props, ref) {
  return <BaseDialog.Close ref={ref} data-slot="dialog-close" {...props} />;
});

/**
 * Renders overlay and popup into `container` (default `document.body`). With a `container`, overlay and popup
 * position inside it (see `contained`).
 */
export const DialogPortal = /* @__PURE__ */ forwardRef<HTMLDivElement, DialogPortalProps>(function DialogPortal(
  { contained, ...props },
  ref,
) {
  return (
    <ModalContainedContext.Provider value={contained ?? props.container != null}>
      <BaseDialog.Portal ref={ref} data-slot="dialog-portal" {...props} />
    </ModalContainedContext.Provider>
  );
});

export interface DialogOverlayProps extends ComponentPropsWithoutRef<typeof BaseDialog.Backdrop> {}

/** The dimmed scrim behind the dialog. No blur: the content behind stays visible. */
export const DialogOverlay = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Backdrop>, DialogOverlayProps>(
  function DialogOverlay({ className, ...props }, ref) {
    const contained = useModalContained();
    return (
      <BaseDialog.Backdrop
        ref={ref}
        data-slot="dialog-overlay"
        data-contained={containedAttr(contained)}
        className={mergeClassName([modalOverlayClassName, contained && "absolute"], className)}
        {...props}
      />
    );
  },
);

export interface DialogPopupProps extends ComponentPropsWithoutRef<typeof BaseDialog.Popup> {
  /** Renders the close (X) button in the top-right corner. */
  showCloseButton?: boolean;
  /** Accessible label of the close button. */
  closeLabel?: string;
}

/**
 * The styled dialog surface without portal and overlay — for composing your own
 * `<DialogPortal><DialogOverlay /><DialogPopup>…</DialogPopup></DialogPortal>`.
 * `DialogHeader` / `DialogFooter` stay in place, the rest scrolls. Initial focus goes to the first tabbable element
 * (as in Base UI) but never scrolls the page or a parent frame; `initialFocus` / `finalFocus` pass through.
 */
export const DialogPopup = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Popup>, DialogPopupProps>(
  function DialogPopup({ className, children, showCloseButton = true, closeLabel = "Close", initialFocus, ...props }, ref) {
    const CloseIcon = useIcon("close");
    const contained = useModalContained();
    const focus = useInitialFocusWithoutScroll(initialFocus, ref);
    return (
      <BaseDialog.Popup
        ref={focus.ref}
        initialFocus={focus.initialFocus}
        data-slot="dialog-popup"
        data-contained={containedAttr(contained)}
        className={mergeClassName([modalPopupClassName, contained && modalPopupContainedClassName], className)}
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
    );
  },
);

export interface DialogContentProps extends DialogPopupProps, ModalContentOptions<DialogOverlayProps["className"]> {}

/**
 * Portal + Overlay + Popup in one, styled as a centred modal on the shell surface.
 * `DialogHeader` and `DialogFooter` stay in place; all other children scroll in a preUI `ScrollArea`
 * once the dialog reaches its maximum height (85vh, or 85% of the container when contained).
 * `container` renders it into another element (e.g. a phone or tablet frame) and centres it there.
 */
export const DialogContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Popup>, DialogContentProps>(
  function DialogContent({ container, contained, overlay = true, overlayClassName, ...props }, ref) {
    return (
      <DialogPortal container={container} contained={contained}>
        {overlay && <DialogOverlay className={overlayClassName} />}
        <DialogPopup ref={ref} data-slot="dialog-content" {...props} />
      </DialogPortal>
    );
  },
);

export interface DialogHeaderProps extends ComponentPropsWithoutRef<"div"> {}

/** Stacks title and description; leaves room for the close button. */
export const DialogHeader = /* @__PURE__ */ forwardRef<HTMLDivElement, DialogHeaderProps>(function DialogHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="dialog-header" className={cn("flex flex-col gap-1 pr-6", className)} {...props} />;
});

export interface DialogFooterProps extends ComponentPropsWithoutRef<"div"> {}

/** Right-aligned action row, e.g. a ghost cancel and a solid confirm. */
export const DialogFooter = /* @__PURE__ */ forwardRef<HTMLDivElement, DialogFooterProps>(function DialogFooter(
  { className, ...props },
  ref,
) {
  return (
    <div ref={ref} data-slot="dialog-footer" className={cn("flex justify-end gap-2 pt-1", className)} {...props} />
  );
});

export interface DialogTitleProps extends ComponentPropsWithoutRef<typeof BaseDialog.Title> {}

export const DialogTitle = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Title>, DialogTitleProps>(function DialogTitle(
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

export const DialogDescription = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Description>, DialogDescriptionProps>(
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
