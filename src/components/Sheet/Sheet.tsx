import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cva } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";
import { useInitialFocusWithoutScroll } from "../../utils/modal-focus";
import {
  containedAttr,
  ModalContainedContext,
  ModalSections,
  modalCloseClassName,
  modalOverlayClassName,
  useModalContained,
  type ModalContentOptions,
  type ModalPortalOptions,
} from "../Dialog/Dialog";

export const Sheet = BaseDialog.Root;

export type SheetProps = BaseDialog.Root.Props;
export interface SheetTriggerProps extends BaseDialog.Trigger.Props {}
export interface SheetCloseProps extends ComponentPropsWithoutRef<typeof BaseDialog.Close> {}
export interface SheetPortalProps extends ComponentPropsWithoutRef<typeof BaseDialog.Portal>, ModalPortalOptions {}

/** Opens the sheet. Renders a `<button>` (`data-slot="sheet-trigger"`). */
export const SheetTrigger = /* @__PURE__ */ forwardRef<HTMLButtonElement, SheetTriggerProps>(function SheetTrigger(props, ref) {
  return <BaseDialog.Trigger ref={ref} data-slot="sheet-trigger" {...props} />;
}) as unknown as typeof BaseDialog.Trigger;

/** Closes the sheet. Renders a `<button>` (`data-slot="sheet-close"`). */
export const SheetClose = /* @__PURE__ */ forwardRef<HTMLButtonElement, SheetCloseProps>(function SheetClose(props, ref) {
  return <BaseDialog.Close ref={ref} data-slot="sheet-close" {...props} />;
});

/**
 * Renders overlay and popup into `container` (default `document.body`). With a `container`, the sheet docks to the
 * container's edge and the overlay only covers the container (see `contained`).
 */
export const SheetPortal = /* @__PURE__ */ forwardRef<HTMLDivElement, SheetPortalProps>(function SheetPortal(
  { contained, ...props },
  ref,
) {
  return (
    <ModalContainedContext.Provider value={contained ?? props.container != null}>
      <BaseDialog.Portal ref={ref} data-slot="sheet-portal" {...props} />
    </ModalContainedContext.Provider>
  );
});

export interface SheetOverlayProps extends ComponentPropsWithoutRef<typeof BaseDialog.Backdrop> {}

/** The dimmed scrim behind the sheet. */
export const SheetOverlay = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Backdrop>, SheetOverlayProps>(
  function SheetOverlay({ className, ...props }, ref) {
    const contained = useModalContained();
    return (
      <BaseDialog.Backdrop
        ref={ref}
        data-slot="sheet-overlay"
        data-contained={containedAttr(contained)}
        className={mergeClassName([modalOverlayClassName, contained && "absolute"], className)}
        {...props}
      />
    );
  },
);

const sheetVariants = /* @__PURE__ */ cva(
  [
    "fixed z-50 flex flex-col gap-4 overflow-hidden",
    "border-pui-border bg-pui-shell p-5 text-sm text-pui-foreground shadow-pui-window outline-none",
    "transition-transform duration-pui-base ease-pui",
  ],
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 max-h-[80vh] border-b data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
        bottom:
          "inset-x-0 bottom-0 max-h-[80vh] border-t data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
        left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
      },
    },
    defaultVariants: { side: "right" },
  },
);

export type SheetSide = "top" | "right" | "bottom" | "left";

export interface SheetPopupProps extends ComponentPropsWithoutRef<typeof BaseDialog.Popup> {
  /** Edge the sheet is attached to and slides in from. */
  side?: SheetSide;
  /** Renders the close (X) button in the top-right corner. */
  showCloseButton?: boolean;
  /** Accessible label of the close button. */
  closeLabel?: string;
}

/**
 * The styled sheet panel without portal and overlay — for composing your own
 * `<SheetPortal><SheetOverlay /><SheetPopup side="right">…</SheetPopup></SheetPortal>`.
 * Initial focus goes to the first tabbable element without scrolling the page or a parent frame.
 */
export const SheetPopup = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Popup>, SheetPopupProps>(function SheetPopup(
  { className, children, side = "right", showCloseButton = true, closeLabel = "Close", initialFocus, ...props },
  ref,
) {
  const CloseIcon = useIcon("close");
  const contained = useModalContained();
  const focus = useInitialFocusWithoutScroll(initialFocus, ref);
  return (
    <BaseDialog.Popup
      ref={focus.ref}
      initialFocus={focus.initialFocus}
      data-slot="sheet-popup"
      data-side={side}
      data-contained={containedAttr(contained)}
      className={mergeClassName(
        [sheetVariants({ side }), contained && ["absolute", (side === "top" || side === "bottom") && "max-h-[80%]"]],
        className,
      )}
      {...props}
    >
      <ModalSections header={[SheetHeader]} footer={[SheetFooter]}>
        {children}
      </ModalSections>
      {showCloseButton && (
        <BaseDialog.Close aria-label={closeLabel} data-slot="sheet-close" className={cn(modalCloseClassName)}>
          <CloseIcon className="size-4" aria-hidden="true" />
        </BaseDialog.Close>
      )}
    </BaseDialog.Popup>
  );
});

export interface SheetContentProps extends SheetPopupProps, ModalContentOptions<SheetOverlayProps["className"]> {}

/**
 * Portal + Overlay + Popup in one: a panel attached to one edge of the screen (built on Base UI Dialog).
 * With `container` it attaches to that element's edge instead and the overlay only covers the element.
 * For a swipeable bottom sheet use `Drawer`. `SheetHeader` and `SheetFooter` stay in place; all other children
 * scroll in a preUI `ScrollArea`.
 */
export const SheetContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Popup>, SheetContentProps>(function SheetContent(
  { container, contained, overlay = true, overlayClassName, ...props },
  ref,
) {
  return (
    <SheetPortal container={container} contained={contained}>
      {overlay && <SheetOverlay className={overlayClassName} />}
      <SheetPopup ref={ref} data-slot="sheet-content" {...props} />
    </SheetPortal>
  );
});

export interface SheetHeaderProps extends ComponentPropsWithoutRef<"div"> {}

/** Stacks title and description; leaves room for the close button. */
export const SheetHeader = /* @__PURE__ */ forwardRef<HTMLDivElement, SheetHeaderProps>(function SheetHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="sheet-header" className={cn("flex flex-col gap-1 pr-6", className)} {...props} />;
});

export interface SheetFooterProps extends ComponentPropsWithoutRef<"div"> {}

/** Right-aligned action row, pushed to the bottom of the sheet. */
export const SheetFooter = /* @__PURE__ */ forwardRef<HTMLDivElement, SheetFooterProps>(function SheetFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="sheet-footer"
      className={cn("mt-auto flex justify-end gap-2 pt-1", className)}
      {...props}
    />
  );
});

export interface SheetTitleProps extends ComponentPropsWithoutRef<typeof BaseDialog.Title> {}

export const SheetTitle = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Title>, SheetTitleProps>(function SheetTitle(
  { className, ...props },
  ref,
) {
  return (
    <BaseDialog.Title
      ref={ref}
      data-slot="sheet-title"
      className={mergeClassName("text-base font-semibold text-pui-foreground", className)}
      {...props}
    />
  );
});

export interface SheetDescriptionProps extends ComponentPropsWithoutRef<typeof BaseDialog.Description> {}

export const SheetDescription = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseDialog.Description>, SheetDescriptionProps>(
  function SheetDescription({ className, ...props }, ref) {
    return (
      <BaseDialog.Description
        ref={ref}
        data-slot="sheet-description"
        className={mergeClassName("text-sm text-pui-muted-foreground", className)}
        {...props}
      />
    );
  },
);
