import { useRef, type ReactElement, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  type AlertDialogContentProps,
  type AlertDialogProps,
} from "../AlertDialog/AlertDialog";

export interface ConfirmDialogProps extends Omit<AlertDialogProps, "children"> {
  title: ReactNode;
  description?: ReactNode;
  /** Extra content between the text and the buttons (scrolls when the dialog gets too tall). */
  children?: ReactNode;
  /** Text of the confirming button. @default "Confirm" */
  confirmLabel?: ReactNode;
  /** Text of the cancel button. @default "Cancel" */
  cancelLabel?: ReactNode;
  /** Red confirming button, for something that can't be taken back (delete, discard). @default false */
  destructive?: boolean;
  /** The confirming button was pressed. The dialog closes afterwards. */
  onConfirm?: () => void;
  /** The dialog closed without confirming (cancel button or Escape). */
  onCancel?: () => void;
  /** An element that opens the dialog, e.g. `<Button>Delete</Button>` (otherwise control it with `open`). */
  trigger?: ReactElement;
  /** Props of the dialog surface (`className`, `container`, …). */
  contentProps?: Omit<AlertDialogContentProps, "children">;
}

/**
 * A ready-made yes / no question on top of `AlertDialog`: title, text, a cancel and a confirming button. Use it for
 * "Delete this entry?" or "Discard unsaved changes?" — for anything else compose `AlertDialog` yourself.
 *
 * ```tsx
 * <ConfirmDialog open={open} onOpenChange={setOpen} title="Delete branch?" destructive confirmLabel="Delete" onConfirm={remove} />
 * ```
 */
export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  trigger,
  contentProps,
  onOpenChange,
  ...props
}: ConfirmDialogProps) {
  const confirmed = useRef(false);
  return (
    <AlertDialog
      {...props}
      onOpenChange={(open, details) => {
        if (!open) {
          if (!confirmed.current) onCancel?.();
          confirmed.current = false;
        }
        onOpenChange?.(open, details);
      }}
    >
      {trigger && <AlertDialogTrigger render={trigger} />}
      <AlertDialogContent {...contentProps}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description != null && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "solid"}
            onClick={() => {
              confirmed.current = true;
              onConfirm?.();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
