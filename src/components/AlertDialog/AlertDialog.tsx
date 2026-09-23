import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn, mergeClassName } from "../../utils/cn";
import { buttonVariants, type ButtonSize, type ButtonVariant } from "../Button/Button";
import { useInitialFocusWithoutScroll } from "../../utils/modal-focus";
import {
  containedAttr,
  ModalContainedContext,
  ModalSections,
  modalOverlayClassName,
  modalPopupClassName,
  modalPopupContainedClassName,
  useModalContained,
  type ModalContentOptions,
  type ModalPortalOptions,
} from "../Dialog/Dialog";

export const AlertDialog = BaseAlertDialog.Root;

export type AlertDialogProps = BaseAlertDialog.Root.Props;
export interface AlertDialogTriggerProps extends BaseAlertDialog.Trigger.Props {}
export interface AlertDialogPortalProps extends ComponentPropsWithoutRef<typeof BaseAlertDialog.Portal>, ModalPortalOptions {}

/** Opens the alert dialog. Renders a `<button>` (`data-slot="alert-dialog-trigger"`). */
export const AlertDialogTrigger = /* @__PURE__ */ forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
  function AlertDialogTrigger(props, ref) {
    return <BaseAlertDialog.Trigger ref={ref} data-slot="alert-dialog-trigger" {...props} />;
  },
) as unknown as typeof BaseAlertDialog.Trigger;

/** Renders overlay and popup into `container` (default `document.body`); contained in it when set. */
export const AlertDialogPortal = /* @__PURE__ */ forwardRef<HTMLDivElement, AlertDialogPortalProps>(
  function AlertDialogPortal({ contained, ...props }, ref) {
    return (
      <ModalContainedContext.Provider value={contained ?? props.container != null}>
        <BaseAlertDialog.Portal ref={ref} data-slot="alert-dialog-portal" {...props} />
      </ModalContainedContext.Provider>
    );
  },
);

export interface AlertDialogOverlayProps extends ComponentPropsWithoutRef<typeof BaseAlertDialog.Backdrop> {}

export const AlertDialogOverlay = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAlertDialog.Backdrop>, AlertDialogOverlayProps>(
  function AlertDialogOverlay({ className, ...props }, ref) {
    const contained = useModalContained();
    return (
      <BaseAlertDialog.Backdrop
        ref={ref}
        data-slot="alert-dialog-overlay"
        data-contained={containedAttr(contained)}
        className={mergeClassName([modalOverlayClassName, contained && "absolute"], className)}
        {...props}
      />
    );
  },
);

export interface AlertDialogPopupProps extends ComponentPropsWithoutRef<typeof BaseAlertDialog.Popup> {}

/**
 * The styled alert dialog surface without portal and overlay — for composing your own
 * `<AlertDialogPortal><AlertDialogOverlay /><AlertDialogPopup>…</AlertDialogPopup></AlertDialogPortal>`.
 * Initial focus goes to the first tabbable element without scrolling the page or a parent frame.
 */
export const AlertDialogPopup = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAlertDialog.Popup>, AlertDialogPopupProps>(
  function AlertDialogPopup({ className, children, initialFocus, ...props }, ref) {
    const contained = useModalContained();
    const focus = useInitialFocusWithoutScroll(initialFocus, ref);
    return (
      <BaseAlertDialog.Popup
        ref={focus.ref}
        initialFocus={focus.initialFocus}
        data-slot="alert-dialog-popup"
        data-contained={containedAttr(contained)}
        className={mergeClassName([modalPopupClassName, "max-w-md", contained && modalPopupContainedClassName], className)}
        {...props}
      >
        <ModalSections header={[AlertDialogHeader]} footer={[AlertDialogFooter]}>
          {children}
        </ModalSections>
      </BaseAlertDialog.Popup>
    );
  },
);

export interface AlertDialogContentProps
  extends AlertDialogPopupProps,
    ModalContentOptions<AlertDialogOverlayProps["className"]> {}

/**
 * Portal + Overlay + Popup in one. Looks like Dialog but narrower (confirmations) and without a close X:
 * the user has to pick one of the footer actions. Header and footer stay in place; other children scroll in a
 * preUI `ScrollArea` once the dialog reaches its maximum height. `container` renders it into another element
 * and centres it there.
 */
export const AlertDialogContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAlertDialog.Popup>, AlertDialogContentProps>(
  function AlertDialogContent({ container, contained, overlay = true, overlayClassName, ...props }, ref) {
    return (
      <AlertDialogPortal container={container} contained={contained}>
        {overlay && <AlertDialogOverlay className={overlayClassName} />}
        <AlertDialogPopup ref={ref} data-slot="alert-dialog-content" {...props} />
      </AlertDialogPortal>
    );
  },
);

export interface AlertDialogHeaderProps extends ComponentPropsWithoutRef<"div"> {}

export const AlertDialogHeader = /* @__PURE__ */ forwardRef<HTMLDivElement, AlertDialogHeaderProps>(function AlertDialogHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="alert-dialog-header" className={cn("flex flex-col gap-1", className)} {...props} />;
});

export interface AlertDialogFooterProps extends ComponentPropsWithoutRef<"div"> {}

/** Right-aligned actions: `AlertDialogCancel` and the confirming `AlertDialogAction`. */
export const AlertDialogFooter = /* @__PURE__ */ forwardRef<HTMLDivElement, AlertDialogFooterProps>(function AlertDialogFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="alert-dialog-footer"
      className={cn("flex justify-end gap-2 pt-1", className)}
      {...props}
    />
  );
});

export interface AlertDialogTitleProps extends ComponentPropsWithoutRef<typeof BaseAlertDialog.Title> {}

export const AlertDialogTitle = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAlertDialog.Title>, AlertDialogTitleProps>(
  function AlertDialogTitle({ className, ...props }, ref) {
    return (
      <BaseAlertDialog.Title
        ref={ref}
        data-slot="alert-dialog-title"
        className={mergeClassName("text-base font-semibold text-pui-foreground", className)}
        {...props}
      />
    );
  },
);

export interface AlertDialogDescriptionProps extends ComponentPropsWithoutRef<typeof BaseAlertDialog.Description> {}

export const AlertDialogDescription = /* @__PURE__ */ forwardRef<
  ComponentRef<typeof BaseAlertDialog.Description>,
  AlertDialogDescriptionProps
>(function AlertDialogDescription({ className, ...props }, ref) {
  return (
    <BaseAlertDialog.Description
      ref={ref}
      data-slot="alert-dialog-description"
      className={mergeClassName("text-sm text-pui-muted-foreground", className)}
      {...props}
    />
  );
});

export interface AlertDialogActionProps extends ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> {
  /** Button look; defaults to `solid` (the one confirming action). Use `destructive` for irreversible actions. */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** The confirming action. Closes the dialog; run your logic in `onClick`. */
export const AlertDialogAction = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAlertDialog.Close>, AlertDialogActionProps>(
  function AlertDialogAction({ className, variant = "solid", size, ...props }, ref) {
    return (
      <BaseAlertDialog.Close
        ref={ref}
        data-slot="alert-dialog-action"
        data-variant={variant}
        data-size={size ?? "default"}
        className={mergeClassName(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

export interface AlertDialogCancelProps extends ComponentPropsWithoutRef<typeof BaseAlertDialog.Close> {
  /** Button look; defaults to `ghost` (handoff confirmation footer: ghost cancel + solid confirm). */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Dismisses the dialog without doing anything. */
export const AlertDialogCancel = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAlertDialog.Close>, AlertDialogCancelProps>(
  function AlertDialogCancel({ className, variant = "ghost", size, ...props }, ref) {
    return (
      <BaseAlertDialog.Close
        ref={ref}
        data-slot="alert-dialog-cancel"
        data-variant={variant}
        data-size={size ?? "default"}
        className={mergeClassName(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
