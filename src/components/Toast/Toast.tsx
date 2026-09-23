import { Toast as BaseToast } from "@base-ui/react/toast";
import {
  forwardRef,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useIcon } from "../../icons";
import type { IconName } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";

/** Toast types with a built-in icon and color (`toast.success()`, `toast.error()` …). */
export type ToastType = "success" | "error" | "info" | "warning" | "loading";

type ToastObject = BaseToast.Root.ToastObject;
type BaseAddOptions = Parameters<ToastManager["add"]>[0];
type BaseUpdateOptions = Exclude<Parameters<ToastManager["update"]>[1], (...args: never[]) => unknown>;
type ToastManager = ReturnType<typeof BaseToast.createToastManager>;

export interface ToastOptions extends Omit<BaseAddOptions, "type" | "title"> {
  title?: ReactNode;
  /** Built-in type (icon + color) or any custom string for your own styling. */
  type?: ToastType | (string & {});
  /** Sonner-style action button, e.g. `{ label: "Undo", onClick: () => … }`. The toast closes after the click. */
  action?: { label: ReactNode; onClick: (event: MouseEvent<HTMLButtonElement>) => void };
}

type ToastMessage = string | ToastOptions;
type PromiseMessage<Arg> = ReactNode | ToastOptions | ((value: Arg) => ReactNode | ToastOptions);

export interface ToastPromiseOptions<Value> {
  loading: ReactNode | ToastOptions;
  success: PromiseMessage<Value>;
  error: PromiseMessage<unknown>;
}

/** Module-level manager shared by `toast()` and `<Toaster />`. */
const toastManager = BaseToast.createToastManager();

function isOptions(value: unknown): value is ToastOptions {
  return typeof value === "object" && value !== null && !isValidElement(value);
}

function toBaseOptions({ action, actionProps, ...options }: ToastOptions): BaseAddOptions {
  if (!action) return { ...options, actionProps };
  return {
    ...options,
    actionProps: {
      ...actionProps,
      children: action.label,
      onClick: (event) => {
        action.onClick(event);
        if (!event.defaultPrevented && options.id) toastManager.close(options.id);
      },
    },
  };
}

function create(message: ToastMessage, options?: ToastOptions, type?: ToastType): string {
  const merged: ToastOptions = isOptions(message) ? { ...message, ...options } : { ...options, title: message };
  // A fixed id lets the action button close its own toast.
  const id = merged.id ?? `pui-toast-${Math.random().toString(36).slice(2)}`;
  return toastManager.add(toBaseOptions({ ...merged, id, type: type ?? merged.type }));
}

function resolveMessage(message: ReactNode | ToastOptions): BaseUpdateOptions {
  return isOptions(message) ? (toBaseOptions(message) as BaseUpdateOptions) : { title: message };
}

function resolvePromiseMessage<Arg>(message: PromiseMessage<Arg>) {
  return typeof message === "function"
    ? (value: Arg) => resolveMessage((message as (value: Arg) => ReactNode | ToastOptions)(value))
    : resolveMessage(message);
}

/**
 * Shows a toast (needs one `<Toaster />` mounted somewhere). Mirrors Sonner's API:
 * `toast("Saved")`, `toast({ title, description })`, `toast.success("…")`, `toast.promise(…)`, `toast.dismiss(id)`.
 * Returns the toast id.
 */
export const toast = Object.assign((message: ToastMessage, options?: ToastOptions) => create(message, options), {
  success: (title: ReactNode, options?: ToastOptions) => create({ ...options, title }, undefined, "success"),
  error: (title: ReactNode, options?: ToastOptions) => create({ ...options, title }, undefined, "error"),
  info: (title: ReactNode, options?: ToastOptions) => create({ ...options, title }, undefined, "info"),
  warning: (title: ReactNode, options?: ToastOptions) => create({ ...options, title }, undefined, "warning"),
  /** Spinner toast that stays until you update or dismiss it. */
  loading: (title: ReactNode, options?: ToastOptions) => create({ ...options, title }, undefined, "loading"),
  /**
   * Shows a loading toast that turns into a success or error toast when the promise settles.
   * Returns the original promise's result.
   */
  promise: <Value,>(promise: Promise<Value>, messages: ToastPromiseOptions<Value>) =>
    toastManager.promise(promise, {
      loading: resolveMessage(messages.loading),
      success: resolvePromiseMessage(messages.success),
      error: resolvePromiseMessage(messages.error),
    }),
  /** Closes one toast, or all toasts when called without an id. */
  dismiss: (id?: string) => toastManager.close(id),
});

const typeStyles: Record<ToastType, { icon: IconName; className: string }> = {
  success: { icon: "success", className: "text-pui-positive" },
  error: { icon: "error", className: "text-pui-negative" },
  info: { icon: "info", className: "text-pui-info" },
  warning: { icon: "warning", className: "text-pui-warning" },
  loading: { icon: "spinner", className: "animate-spin text-pui-muted-foreground" },
};

function isToastType(type: string | undefined): type is ToastType {
  return type !== undefined && type in typeStyles;
}

function ToastIcon({ type }: { type: ToastType }) {
  const { icon, className } = typeStyles[type];
  const Icon = useIcon(icon);
  return <Icon data-slot="toast-icon" className={cn("mt-0.5 size-4 shrink-0", className)} aria-hidden="true" />;
}

const toastClassName = [
  "pointer-events-auto relative flex w-full select-none items-start gap-2.5 rounded-pui border border-pui-border bg-pui-popover px-3.5 py-3 text-sm text-pui-popover-foreground shadow-pui-floating outline-none",
  "focus-visible:ring-pui focus-visible:ring-pui-ring",
  "[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--toast-swipe-movement-y))]",
  "transition-[opacity,transform] duration-pui-base ease-pui",
  "data-[starting-style]:opacity-0 data-[starting-style]:[transform:translateY(0.5rem)]",
  "data-[ending-style]:opacity-0 data-[ending-style]:[transform:translateY(0.5rem)]",
  "data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)_+_100%))]",
  "data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)_+_100%))]",
  "data-[limited]:hidden",
];

/** Where the `Toaster` stacks its toasts. */
export type ToasterPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

type SwipeDirection = "up" | "down" | "left" | "right";

const positionConfig: Record<ToasterPosition, { viewport: string; swipe: SwipeDirection[] }> = {
  "bottom-right": { viewport: "bottom-6 right-6", swipe: ["down", "right"] },
  "bottom-left": { viewport: "bottom-6 left-6", swipe: ["down", "left"] },
  "bottom-center": { viewport: "bottom-6 left-1/2 -translate-x-1/2", swipe: ["down"] },
  "top-right": { viewport: "top-6 right-6", swipe: ["up", "right"] },
  "top-left": { viewport: "top-6 left-6", swipe: ["up", "left"] },
  "top-center": { viewport: "top-6 left-1/2 -translate-x-1/2", swipe: ["up"] },
};

/** Extra classes for top positions: enter/leave slide down from 8px above instead of up; swipe up/left. */
const topToastClassName = [
  "data-[starting-style]:[transform:translateY(-0.5rem)]",
  "data-[ending-style]:[transform:translateY(-0.5rem)]",
];
const swipeUpClassName =
  "data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)_-_100%))]";
const swipeLeftClassName =
  "data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)_-_100%))]";

function isTopPosition(position: ToasterPosition) {
  return position.startsWith("top");
}

/** `bottom-right` keeps the original class list; other positions append overrides (later classes win in `cn`). */
function getToastClassName(position: ToasterPosition) {
  if (position === "bottom-right") return toastClassName;
  return [
    ...toastClassName,
    isTopPosition(position) && topToastClassName,
    position.endsWith("left") && swipeLeftClassName,
    isTopPosition(position) && swipeUpClassName,
  ];
}

interface ToastItemProps {
  toast: ToastObject;
  closeLabel: string;
  toastClassName: ToasterProps["toastClassName"];
  position: ToasterPosition;
}

function ToastItem({ toast, closeLabel, toastClassName: className, position }: ToastItemProps) {
  const CloseIcon = useIcon("close");
  return (
    <BaseToast.Root
      toast={toast}
      data-slot="toast"
      swipeDirection={positionConfig[position].swipe}
      className={mergeClassName(getToastClassName(position), className)}
    >
      {isToastType(toast.type) && <ToastIcon type={toast.type} />}
      <div data-slot="toast-content" className="flex min-w-0 flex-1 flex-col gap-0.5">
        <BaseToast.Title data-slot="toast-title" className="font-medium text-pui-popover-foreground" />
        <BaseToast.Description
          data-slot="toast-description"
          className={cn(toast.title ? "text-pui-muted-foreground" : "text-pui-popover-foreground")}
        />
      </div>
      <BaseToast.Action
        data-slot="toast-action"
        className={cn(
          // -my-1: centred on the title line without making the toast taller than the others.
          "-my-1 inline-flex h-7 shrink-0 items-center rounded-pui-md border border-pui-border bg-pui-secondary px-2.5 text-xs font-medium text-pui-secondary-foreground",
          "transition-colors duration-pui-fast ease-pui hover:bg-pui-accent",
          "focus-visible:outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
        )}
      />
      <BaseToast.Close
        data-slot="toast-close"
        aria-label={closeLabel}
        className={cn(
          "mt-0.5 inline-flex shrink-0 items-center justify-center rounded-pui-sm text-pui-muted-foreground",
          "transition-colors duration-pui-fast ease-pui hover:text-pui-foreground",
          "focus-visible:outline-none focus-visible:ring-pui focus-visible:ring-pui-ring",
        )}
      >
        <CloseIcon className="size-4" aria-hidden="true" />
      </BaseToast.Close>
    </BaseToast.Root>
  );
}

function ToastList({ closeLabel, toastClassName, position }: Omit<ToastItemProps, "toast">) {
  const { toasts } = BaseToast.useToastManager();
  return (
    <>
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          closeLabel={closeLabel}
          toastClassName={toastClassName}
          position={position}
        />
      ))}
    </>
  );
}

export interface ToasterProps extends ComponentPropsWithoutRef<typeof BaseToast.Viewport> {
  /** Default auto-dismiss time in ms (3.2s per design handoff). `0` keeps toasts open. */
  timeout?: number;
  /** Maximum number of toasts shown at once. */
  limit?: number;
  /** Accessible label of each toast's close button. */
  closeLabel?: string;
  /** Extra classes for every toast (string or function of the toast state). */
  toastClassName?: BaseToast.Root.Props["className"];
  /** Portal container; defaults to `document.body`. */
  container?: BaseToast.Portal.Props["container"];
  /**
   * Corner or edge the toasts stack at (24px inset). Default `"bottom-right"`; can change at runtime.
   * At the top, the newest toast is on top and toasts slide in downwards.
   */
  position?: ToasterPosition;
}

/**
 * Mount once (e.g. next to your app root), then call `toast()` from anywhere. Renders the toasts
 * bottom-right by default (see `position`), 320px wide, newest closest to the screen edge. Types `success`, `error`, `info`, `warning` and
 * `loading` get an icon and color.
 */
export const Toaster = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseToast.Viewport>, ToasterProps>(function Toaster(
  {
    className,
    timeout = 3200,
    limit,
    closeLabel = "Close",
    toastClassName,
    container,
    position = "bottom-right",
    ...props
  },
  ref,
) {
  return (
    <BaseToast.Provider toastManager={toastManager} timeout={timeout} limit={limit}>
      <BaseToast.Portal data-slot="toaster-portal" container={container}>
        <BaseToast.Viewport
          ref={ref}
          data-slot="toaster"
          data-position={position}
          className={mergeClassName(
            [
              "pointer-events-none fixed",
              positionConfig[position].viewport,
              "z-[100] flex w-80 max-w-[calc(100vw-3rem)]",
              // Newest toast closest to the screen edge.
              isTopPosition(position) ? "flex-col" : "flex-col-reverse",
              "gap-2 outline-none",
            ],
            className,
          )}
          {...props}
        >
          <ToastList closeLabel={closeLabel} toastClassName={toastClassName} position={position} />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
});
