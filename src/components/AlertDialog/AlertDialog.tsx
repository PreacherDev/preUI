import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn, mergeClassName } from "../../utils/cn";
import { buttonVariants, type ButtonSize, type ButtonVariant } from "../Button/Button";
import { ModalSections, modalPopupClassName, overlayClassName } from "../Dialog/Dialog";

export const AlertDialog = BaseAlertDialog.Root;

export type AlertDialogProps = BaseAlertDialog.Root.Props;
export type AlertDialogTriggerProps = BaseAlertDialog.Trigger.Props;
export type AlertDialogPortalProps = BaseAlertDialog.Portal.Props;

/** Opens the alert dialog. Renders a `<button>` (`data-slot="alert-dialog-trigger"`). */
export const AlertDialogTrigger = forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
  function AlertDialogTrigger(props, ref) {
    return <BaseAlertDialog.Trigger ref={ref} data-slot="alert-dialog-trigger" {...props} />;
  },
) as unknown as typeof BaseAlertDialog.Trigger;

export const AlertDialogPortal = forwardRef<HTMLDivElement, AlertDialogPortalProps>(
  function AlertDialogPortal(props, ref) {
    return <BaseAlertDialog.Portal ref={ref} data-slot="alert-dialog-portal" {...props} />;
  },
);

export interface AlertDialogOverlayProps extends ComponentPropsWithoutRef<typeof BaseAlertDialog.Backdrop> {}

export const AlertDialogOverlay = forwardRef<ComponentRef<typeof BaseAlertDialog.Backdrop>, AlertDialogOverlayProps>(
  function AlertDialogOverlay({ className, ...props }, ref) {
    return <BaseAlertDialog.Backdrop ref={ref} data-slot="alert-dialog-overlay" className={mergeClassName(overlayClassName, className)} {...props} />;
  },
);

export interface AlertDialogContentProps extends ComponentPropsWithoutRef<typeof BaseAlertDialog.Popup> {}

/**
 * Portal + Overlay + Popup in one. Looks like Dialog but narrower (confirmations) and without a close X:
 * the user has to pick one of the footer actions. Header and footer stay in place; other children scroll in a
 * preUI `ScrollArea` once the dialog reaches its maximum height.
 */
export const AlertDialogContent = forwardRef<ComponentRef<typeof BaseAlertDialog.Popup>, AlertDialogContentProps>(
  function AlertDialogContent({ className, children, ...props }, ref) {
    return (
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <BaseAlertDialog.Popup
          ref={ref}
          data-slot="alert-dialog-content"
          className={mergeClassName([modalPopupClassName, "max-w-md"], className)}
          {...props}
        >
          <ModalSections header={[AlertDialogHeader]} footer={[AlertDialogFooter]}>
            {children}
          </ModalSections>
        </BaseAlertDialog.Popup>
      </AlertDialogPortal>
    );
  },
);

export interface AlertDialogHeaderProps extends ComponentPropsWithoutRef<"div"> {}

export const AlertDialogHeader = forwardRef<HTMLDivElement, AlertDialogHeaderProps>(function AlertDialogHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="alert-dialog-header" className={cn("flex flex-col gap-1", className)} {...props} />;
});

export interface AlertDialogFooterProps extends ComponentPropsWithoutRef<"div"> {}

/** Right-aligned actions: `AlertDialogCancel` and the confirming `AlertDialogAction`. */
export const AlertDialogFooter = forwardRef<HTMLDivElement, AlertDialogFooterProps>(function AlertDialogFooter(
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

export const AlertDialogTitle = forwardRef<ComponentRef<typeof BaseAlertDialog.Title>, AlertDialogTitleProps>(
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

export const AlertDialogDescription = forwardRef<
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
export const AlertDialogAction = forwardRef<ComponentRef<typeof BaseAlertDialog.Close>, AlertDialogActionProps>(
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
export const AlertDialogCancel = forwardRef<ComponentRef<typeof BaseAlertDialog.Close>, AlertDialogCancelProps>(
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
