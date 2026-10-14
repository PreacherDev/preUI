import { useMemo, useRef, useState, type MouseEvent, type ReactElement, type ReactNode } from "react";
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
import { Button } from "../Button/Button";

/** Why the dialog closed without confirming. Anything else (e.g. closed from code) reports `"other"`. */
export type ConfirmDialogCancelReason = "button" | "escape" | "outside" | "other";

/** What `onConfirm` may return: nothing, or `false` / a promise of `false` to keep the dialog open. */
export type ConfirmDialogConfirmResult = void | boolean | Promise<void | boolean>;

type DialogActions = NonNullable<NonNullable<AlertDialogProps["actionsRef"]>["current"]>;

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
  /**
   * The confirming button was pressed. The dialog closes afterwards — unless the handler returns `false`, or a
   * promise: then the confirming button spins and the dialog stays open until the promise settles and closes only
   * if it did not resolve `false`. A rejected promise keeps the dialog open too (handle the error yourself).
   */
  onConfirm?: () => ConfirmDialogConfirmResult;
  /**
   * The dialog closed without confirming. `reason` tells the cancel button (`"button"`) apart from Escape
   * (`"escape"`) and a press outside (`"outside"`).
   */
  onCancel?: (reason: ConfirmDialogCancelReason) => void;
  /** Spinner on the confirming button, which is disabled while it shows (e.g. while the server answers). */
  confirmLoading?: boolean;
  /** Disables the confirming button, e.g. until the extra content is filled in. */
  confirmDisabled?: boolean;
  /** Icon before `confirmLabel`. While the button spins, the spinner takes its place, so the width never changes. */
  confirmIcon?: ReactNode;
  /** An element that opens the dialog, e.g. `<Button>Delete</Button>` (otherwise control it with `open`). */
  trigger?: ReactElement;
  /** Props of the dialog surface (`className`, `container`, …). */
  contentProps?: Omit<AlertDialogContentProps, "children">;
}

const cancelReasons: Record<string, ConfirmDialogCancelReason> = {
  "close-press": "button",
  "escape-key": "escape",
  "outside-press": "outside",
};

function isPromise(value: unknown): value is Promise<void | boolean> {
  return typeof (value as Promise<unknown> | undefined)?.then === "function";
}

/**
 * A ready-made yes / no question on top of `AlertDialog`: title, text, a cancel and a confirming button. Use it for
 * "Delete this entry?" or "Discard unsaved changes?" — for anything else compose `AlertDialog` yourself.
 *
 * ```tsx
 * <ConfirmDialog open={open} onOpenChange={setOpen} title="Delete branch?" destructive confirmLabel="Delete" onConfirm={remove} />
 * ```
 *
 * A server action keeps the dialog open until it is through:
 *
 * ```tsx
 * <ConfirmDialog title="Delete character?" onConfirm={() => deleteCharacter(id)} onCancel={(reason) => …} />
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
  confirmLoading = false,
  confirmDisabled = false,
  confirmIcon,
  trigger,
  contentProps,
  onOpenChange,
  actionsRef,
  ...props
}: ConfirmDialogProps) {
  const confirmed = useRef(false);
  const [pending, setPendingState] = useState(false);
  // Read synchronously in `onOpenChange`: while the promise runs, a dismissal is still a cancel.
  const pendingRef = useRef(false);
  const setPending = (value: boolean) => {
    pendingRef.current = value;
    setPendingState(value);
  };
  const ownActions = useRef<DialogActions | null>(null);
  // Closing after an awaited `onConfirm` goes through Base UI's imperative action, so it also works uncontrolled.
  // A caller's own `actionsRef` keeps working: it gets the same object.
  const actions = useMemo(
    () => ({
      get current() {
        return ownActions.current;
      },
      set current(value: DialogActions | null) {
        ownActions.current = value;
        if (actionsRef) actionsRef.current = value;
      },
    }),
    [actionsRef],
  );

  function handleConfirm(event: MouseEvent<HTMLElement>) {
    confirmed.current = true;
    const result = onConfirm?.();
    if (isPromise(result)) {
      // Base UI's Close would close the dialog on this click; keep it open until the promise is through.
      (event as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
      setPending(true);
      return result.then(
        (value) => {
          setPending(false);
          if (value === false) confirmed.current = false;
          else ownActions.current?.close();
        },
        (error) => {
          setPending(false);
          confirmed.current = false;
          throw error;
        },
      );
    }
    if (result === false) {
      (event as { preventBaseUIHandler?: () => void }).preventBaseUIHandler?.();
      confirmed.current = false;
    }
    return undefined;
  }

  const busy = confirmLoading || pending;
  const confirmVariant = destructive ? "destructive" : "solid";

  return (
    <AlertDialog
      {...props}
      actionsRef={actions}
      onOpenChange={(open, details) => {
        if (!open) {
          if (!confirmed.current || pendingRef.current) {
            onCancel?.(cancelReasons[details?.reason as string] ?? "other");
          }
          confirmed.current = false;
          setPending(false);
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
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={confirmVariant}
            disabled={confirmDisabled || busy}
            onClick={handleConfirm}
            // Button renders the spinner without changing the button's width.
            render={<Button variant={confirmVariant} loading={busy} leftIcon={confirmIcon} />}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
