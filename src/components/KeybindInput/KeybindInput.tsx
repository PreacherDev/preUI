import {
  forwardRef,
  Fragment,
  useCallback,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { inputVariants, type InputSize } from "../Input/Input";
import { Kbd } from "../Kbd/Kbd";
import { fieldIconButtonClass } from "../Select/select-styles";

// ---------------------------------------------------------------------------------------------------------------------
// Value + helpers
// ---------------------------------------------------------------------------------------------------------------------

/** A captured keybind. `key` is `KeyboardEvent.key` (single letters lower-case), `code` the physical key. */
export interface Keybind {
  key: string;
  code: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/** Custom key names, e.g. German: `(key) => ({ " ": "Leertaste", Control: "Strg" })[key]`. `undefined` = default. */
export type KeybindKeyFormatter = (key: string, code: string) => string | undefined;

export interface FormatKeybindOptions {
  formatKey?: KeybindKeyFormatter;
}

const modifierKeys = ["Control", "Alt", "Shift", "Meta"] as const;
type ModifierKey = (typeof modifierKeys)[number];

function isModifierKey(key: string): key is ModifierKey {
  return (modifierKeys as readonly string[]).includes(key);
}

const defaultKeyNames: Record<string, string> = {
  " ": "Space",
  Control: "Ctrl",
  Escape: "Esc",
  Delete: "Del",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  PageUp: "PgUp",
  PageDown: "PgDn",
  Insert: "Ins",
};

/** Default English name of a key (layout-independent for letters, digits and numpad keys). */
function defaultKeyName(key: string, code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return `Num ${code.slice(6)}`;
  if (defaultKeyNames[key]) return defaultKeyNames[key];
  if (key.length === 1) return key.toUpperCase();
  return key;
}

/**
 * Display parts of a keybind, modifiers first: `{ key: "f", code: "KeyF", shift: true }` → `["Shift", "F"]`.
 * Returns `[]` for `null`. Modifiers are passed to `formatKey` as `"Control"`, `"Alt"`, `"Shift"`, `"Meta"` with an
 * empty `code`.
 */
export function formatKeybind(value: Keybind | null | undefined, options: FormatKeybindOptions = {}): string[] {
  if (!value) return [];
  const name = (key: string, code: string) => options.formatKey?.(key, code) ?? defaultKeyName(key, code);
  const parts: string[] = [];
  if (value.ctrl && value.key !== "Control") parts.push(name("Control", ""));
  if (value.alt && value.key !== "Alt") parts.push(name("Alt", ""));
  if (value.shift && value.key !== "Shift") parts.push(name("Shift", ""));
  if (value.meta && value.key !== "Meta") parts.push(name("Meta", ""));
  parts.push(name(value.key, value.code));
  return parts;
}

type KeyEventLike = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">;

/**
 * A `Keybind` from a keyboard event (DOM or React). Single-character keys are stored lower-case, so Shift + F is
 * `{ key: "f", shift: true }`. With `allowModifiers: false` the modifier flags are dropped.
 */
export function keybindFromEvent(event: KeyEventLike, options: { allowModifiers?: boolean } = {}): Keybind {
  const allowModifiers = options.allowModifiers ?? true;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const bind: Keybind = { key, code: event.code };
  if (allowModifiers) {
    if (event.ctrlKey && key !== "Control") bind.ctrl = true;
    if (event.altKey && key !== "Alt") bind.alt = true;
    if (event.shiftKey && key !== "Shift") bind.shift = true;
    if (event.metaKey && key !== "Meta") bind.meta = true;
  }
  return bind;
}

/** `true` when a keyboard event matches a keybind (by `code`, falling back to `key`; modifiers must match exactly). */
export function matchesKeybind(event: KeyEventLike, value: Keybind | null | undefined): boolean {
  if (!value) return false;
  const sameKey = value.code ? event.code === value.code : event.key.toLowerCase() === value.key.toLowerCase();
  if (!sameKey) return false;
  if (isModifierKey(value.key)) return true;
  return (
    !!value.ctrl === event.ctrlKey && !!value.alt === event.altKey && !!value.shift === event.shiftKey && !!value.meta === event.metaKey
  );
}

// ---------------------------------------------------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------------------------------------------------

export interface KeybindInputLabels {
  /** Shown when no key is bound. */
  placeholder: string;
  /** Shown while waiting for a key. */
  listening: string;
  /** Accessible name of the clear button. */
  clear: string;
  /** Screen-reader announcement when listening starts. */
  listeningAnnouncement: string;
  /** Accessible description of the current binding (`null` = not set), used in the button's `aria-label`. */
  binding: (binding: string | null) => string;
}

export const defaultKeybindInputLabels: KeybindInputLabels = {
  placeholder: "Not set",
  listening: "Press a key…",
  clear: "Clear keybind",
  listeningAnnouncement: "Listening. Press a key or combination, Escape to cancel.",
  binding: (binding) => (binding ? `Keybind: ${binding}` : "Keybind: not set"),
};

export interface KeybindInputProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "onChange" | "type"> {
  value?: Keybind | null;
  defaultValue?: Keybind | null;
  onValueChange?: (value: Keybind | null) => void;
  /** Record Ctrl / Alt / Shift / Meta with the key; a lone modifier (press + release) binds that modifier. Default `true`. */
  allowModifiers?: boolean;
  /**
   * Keys (`KeyboardEvent.key` or `.code`) that can't be bound; pressing them while listening is ignored.
   * Default `["Escape"]`. Escape always cancels, Tab always moves focus (and cancels).
   */
  disallowedKeys?: string[];
  /** Backspace / Delete while listening clears the binding, plus a clear button when set. Default `true`. */
  clearable?: boolean;
  /** Marks the field invalid (negative border, `aria-invalid`). */
  invalid?: boolean;
  size?: InputSize;
  /** Custom key names (also used for modifiers `"Control"`, `"Alt"`, `"Shift"`, `"Meta"`). */
  formatKey?: KeybindKeyFormatter;
  /** Shown between keys. Default `"+"`. */
  separator?: string;
  labels?: Partial<KeybindInputLabels>;
  /** Name of a hidden input carrying the value as JSON (for native forms). */
  name?: string;
  /** Called when listening starts / stops. */
  onListeningChange?: (listening: boolean) => void;
  /** Classes for the inner button (`className` goes on the field wrapper). */
  buttonClassName?: string;
  style?: CSSProperties;
}

/**
 * "Press a key" field for settings menus: shows the binding as key caps, click / Enter / Space starts listening,
 * the next key (with Ctrl / Alt / Shift / Meta) becomes the value. Escape cancels, Backspace / Delete clears.
 * The ref points to the button; `className` / `style` style the field wrapper.
 */
export const KeybindInput = /* @__PURE__ */ forwardRef<HTMLButtonElement, KeybindInputProps>(function KeybindInput(
  {
    value: valueProp,
    defaultValue = null,
    onValueChange,
    allowModifiers = true,
    disallowedKeys = defaultDisallowed,
    clearable = true,
    invalid = false,
    disabled = false,
    size = "default",
    formatKey,
    separator = "+",
    labels: labelsProp,
    name,
    onListeningChange,
    className,
    buttonClassName,
    style,
    onClick,
    onKeyDown,
    onKeyUp,
    onBlur,
    "aria-label": ariaLabel,
    ...props
  },
  ref,
) {
  const labels = { ...defaultKeybindInputLabels, ...labelsProp };
  const Close = useIcon("close");
  const [uncontrolled, setUncontrolled] = useState<Keybind | null>(defaultValue);
  const controlled = valueProp !== undefined;
  const value = controlled ? valueProp : uncontrolled;
  const [listening, setListeningState] = useState(false);
  // A modifier pressed alone while listening; bound on its keyup if no other key came in between.
  const pendingModifier = useRef<Keybind | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const setListening = (next: boolean) => {
    pendingModifier.current = null;
    if (next === listening) return;
    setListeningState(next);
    onListeningChange?.(next);
  };

  const commit = (next: Keybind | null) => {
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
  };

  const isDisallowed = (event: ReactKeyboardEvent) =>
    disallowedKeys.some((key) => key === event.key || key === event.code);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || !listening) return;
    if (event.key === "Tab") {
      setListening(false);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.repeat) return;
    if (event.key === "Escape") {
      setListening(false);
      return;
    }
    if (clearable && (event.key === "Backspace" || event.key === "Delete") && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
      commit(null);
      setListening(false);
      return;
    }
    if (isModifierKey(event.key)) {
      pendingModifier.current = allowModifiers && !isDisallowed(event) ? { key: event.key, code: event.code } : null;
      return;
    }
    if (event.key === "Unidentified" || event.key === "Dead" || event.key === "Process" || isDisallowed(event)) {
      pendingModifier.current = null;
      return;
    }
    commit(keybindFromEvent(event, { allowModifiers }));
    setListening(false);
  };

  const handleKeyUp = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    onKeyUp?.(event);
    if (!listening) return;
    event.preventDefault();
    const pending = pendingModifier.current;
    if (pending && pending.key === event.key) {
      commit(pending);
      setListening(false);
    }
  };

  const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled) return;
    setListening(!listening);
  };

  const handleBlur = (event: ReactFocusEvent<HTMLButtonElement>) => {
    onBlur?.(event);
    setListening(false);
  };

  const parts = formatKeybind(value, { formatKey });
  const bindingText = parts.length ? parts.join(` ${separator} `) : null;
  const description = listening
    ? labels.listening
    : ariaLabel
      ? `${ariaLabel}, ${labels.binding(bindingText)}`
      : labels.binding(bindingText);
  const showClear = clearable && value != null && !listening && !disabled;

  return (
    <div
      data-slot="keybind-input"
      data-size={size}
      data-listening={listening ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      className={cn(
        inputVariants({ size }),
        "relative items-center gap-1 p-0 focus-within:border-pui-ring data-[listening]:border-pui-ring",
        className,
      )}
      style={style}
    >
      <button
        ref={setRefs}
        type="button"
        data-slot="keybind-input-trigger"
        data-listening={listening ? "" : undefined}
        disabled={disabled}
        aria-label={listening && ariaLabel ? `${ariaLabel}, ${labels.listening}` : description}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-full min-w-0 flex-1 items-center gap-1 rounded-[inherit] text-left outline-none",
          size === "sm" ? "px-2.5" : size === "lg" ? "px-3.5" : "px-3",
          showClear && "pr-1",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
          buttonClassName,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
        {...props}
      >
        {listening ? (
          <span data-slot="keybind-input-listening" className="truncate text-pui-muted-foreground">
            {labels.listening}
          </span>
        ) : parts.length ? (
          <span data-slot="keybind-input-keys" className="inline-flex min-w-0 items-center gap-1">
            {parts.map((part, index) => (
              <Fragment key={index}>
                {index > 0 && separator !== "" && (
                  <span data-slot="keybind-input-separator" className="text-xs text-pui-muted-foreground">
                    {separator}
                  </span>
                )}
                <Kbd data-slot="keybind-input-key">{part}</Kbd>
              </Fragment>
            ))}
          </span>
        ) : (
          <span data-slot="keybind-input-placeholder" className="truncate text-pui-muted-foreground">
            {labels.placeholder}
          </span>
        )}
      </button>
      {showClear && (
        <button
          type="button"
          data-slot="keybind-input-clear"
          aria-label={labels.clear}
          className={cn(fieldIconButtonClass, "mr-1.5")}
          onClick={() => {
            commit(null);
            buttonRef.current?.focus();
          }}
        >
          <Close aria-hidden="true" />
        </button>
      )}
      <span data-slot="keybind-input-status" className="sr-only" role="status" aria-live="polite">
        {listening ? labels.listeningAnnouncement : ""}
      </span>
      {name !== undefined && <input type="hidden" name={name} value={value ? JSON.stringify(value) : ""} disabled={disabled} />}
    </div>
  );
});

const defaultDisallowed = ["Escape"];
