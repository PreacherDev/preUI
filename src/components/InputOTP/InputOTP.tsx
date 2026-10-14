import { OTPField as BaseOtpField } from "@base-ui/react/otp-field";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ForwardedRef,
  type HTMLAttributes,
  type MutableRefObject,
} from "react";
import { cn, mergeClassName, type StateClassName } from "../../utils/cn";

export interface InputOTPProps extends ComponentPropsWithoutRef<typeof BaseOtpField.Root> {
  /**
   * Accessible label for slot 2..n when the slots are rendered automatically (slot 1 uses the field label).
   * Defaults to `Character 2 of 6` etc.
   */
  getSlotLabel?: (index: number, length: number) => string;
  /** Classes for the automatically rendered slots. */
  slotClassName?: StateClassName<BaseOtpField.Input.State>;
}

const defaultSlotLabel = (index: number, length: number) => `Character ${index + 1} of ${length}`;

/**
 * `autoFocus` on the root is an attribute on a `<div>`, which no browser acts on: focus the first slot ourselves.
 * A second try on the next frame covers a window (dialog, drawer, editor) that moves the focus to its own first
 * element right after the field mounted.
 */
function useAutoFocusFirstSlot<T extends HTMLElement>(autoFocus: boolean | undefined, forwardedRef: ForwardedRef<T>) {
  const rootRef = useRef<T | null>(null);
  const ref = useCallback(
    (node: T | null) => {
      rootRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as MutableRefObject<T | null>).current = node;
    },
    [forwardedRef],
  );

  useEffect(() => {
    if (!autoFocus) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    const win = root.ownerDocument.defaultView;
    const focusFirst = () => {
      const current = rootRef.current;
      if (!current?.isConnected) return;
      // Someone is already typing in a slot: leave the focus alone.
      if (current.contains(current.ownerDocument.activeElement)) return;
      const input = current.querySelector<HTMLInputElement>("input:not([disabled])");
      input?.focus({ preventScroll: true });
    };
    focusFirst();
    const frame = win?.requestAnimationFrame(focusFirst);
    return () => {
      if (frame !== undefined) win?.cancelAnimationFrame(frame);
    };
  }, [autoFocus]);

  return ref;
}

/**
 * One-time-code entry. Without `children` it renders `length` slots; pass `InputOTPGroup`,
 * `InputOTPSlot` and `InputOTPSeparator` as children for grouped layouts.
 * `autoFocus` puts the caret in the first slot, also when the field mounts later than the window around it.
 */
export const InputOTP = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseOtpField.Root>, InputOTPProps>(function InputOTP(
  { className, children, length, getSlotLabel = defaultSlotLabel, slotClassName, autoFocus, ...props },
  ref,
) {
  const rootRef = useAutoFocusFirstSlot(autoFocus, ref);
  return (
    <BaseOtpField.Root
      ref={rootRef}
      length={length}
      data-slot="input-otp"
      className={mergeClassName("flex items-center gap-2", className)}
      {...props}
    >
      {children ??
        Array.from({ length }, (_, index) => (
          <InputOTPSlot
            key={index}
            aria-label={index === 0 ? undefined : getSlotLabel(index, length)}
            className={slotClassName}
          />
        ))}
    </BaseOtpField.Root>
  );
});

export type InputOTPGroupProps = HTMLAttributes<HTMLDivElement>;

/** Layout wrapper for a run of slots (e.g. 3 + 3 around a separator). */
export const InputOTPGroup = /* @__PURE__ */ forwardRef<HTMLDivElement, InputOTPGroupProps>(function InputOTPGroup(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="input-otp-group" className={cn("flex items-center gap-2", className)} {...props} />;
});

export type InputOTPSlotProps = ComponentPropsWithoutRef<typeof BaseOtpField.Input>;

/** One character slot, styled like an input. */
export const InputOTPSlot = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseOtpField.Input>, InputOTPSlotProps>(function InputOTPSlot(
  { className, ...props },
  ref,
) {
  return (
    <BaseOtpField.Input
      ref={ref}
      data-slot="input-otp-slot"
      className={mergeClassName(
        [
          "m-0 size-pui-control shrink-0 rounded-pui-md border border-pui-input bg-pui-background p-0 text-center text-sm font-medium tabular-nums text-pui-foreground",
          "placeholder:text-pui-muted-foreground",
          "outline-none transition-colors duration-pui-fast ease-pui focus-visible:border-pui-ring",
          "data-[invalid]:border-pui-negative",
          // Focused + invalid: the negative border stays, a ring in the same colour shows the focus.
          "data-[invalid]:focus-visible:ring-pui data-[invalid]:focus-visible:ring-pui-negative",
          "disabled:cursor-not-allowed disabled:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        ],
        className,
      )}
      {...props}
    />
  );
});

export type InputOTPSeparatorProps = ComponentPropsWithoutRef<typeof BaseOtpField.Separator>;

/** Visual divider between slot groups. */
export const InputOTPSeparator = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseOtpField.Separator>, InputOTPSeparatorProps>(
  function InputOTPSeparator({ className, ...props }, ref) {
    return (
      <BaseOtpField.Separator
        ref={ref}
        data-slot="input-otp-separator"
        className={mergeClassName("h-px w-3 shrink-0 bg-pui-border", className)}
        {...props}
      />
    );
  },
);
