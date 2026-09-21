import { OTPField as BaseOtpField } from "@base-ui/react/otp-field";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef, type HTMLAttributes } from "react";
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
 * One-time-code entry. Without `children` it renders `length` slots; pass `InputOTPGroup`,
 * `InputOTPSlot` and `InputOTPSeparator` as children for grouped layouts.
 */
export const InputOTP = forwardRef<ComponentRef<typeof BaseOtpField.Root>, InputOTPProps>(function InputOTP(
  { className, children, length, getSlotLabel = defaultSlotLabel, slotClassName, ...props },
  ref,
) {
  return (
    <BaseOtpField.Root
      ref={ref}
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
export const InputOTPGroup = forwardRef<HTMLDivElement, InputOTPGroupProps>(function InputOTPGroup(
  { className, ...props },
  ref,
) {
  return <div ref={ref} data-slot="input-otp-group" className={cn("flex items-center gap-2", className)} {...props} />;
});

export type InputOTPSlotProps = ComponentPropsWithoutRef<typeof BaseOtpField.Input>;

/** One character slot, styled like an input. */
export const InputOTPSlot = forwardRef<ComponentRef<typeof BaseOtpField.Input>, InputOTPSlotProps>(function InputOTPSlot(
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
export const InputOTPSeparator = forwardRef<ComponentRef<typeof BaseOtpField.Separator>, InputOTPSeparatorProps>(
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
