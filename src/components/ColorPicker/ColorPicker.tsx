import type { Popover as BasePopover } from "@base-ui/react/popover";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { buttonVariants } from "../Button/Button";
import { Input, type InputProps } from "../Input/Input";
import { Popover, PopoverContent, PopoverTrigger, type PopoverContentProps } from "../Popover/Popover";
import { Slider, type SliderProps } from "../Slider/Slider";
import { cn, mergeClassName } from "../../utils/cn";
import { hexToHsv, hsvToHex, normalizeHex, parseColor, type Hsva } from "./color";

/* ------------------------------------------------------------------------------------------------
 * Context
 * ----------------------------------------------------------------------------------------------*/

/** Accessible names (not visible text). English defaults, override per app language. */
export interface ColorPickerLabels {
  /** Trigger button. Default `"Choose color"`. */
  trigger: string;
  /** Saturation × brightness area. Default `"Saturation and brightness"`. */
  area: string;
  /** Hue slider thumb. Default `"Hue"`. */
  hue: string;
  /** Alpha slider thumb. Default `"Alpha"`. */
  alpha: string;
  /** Hex text field. Default `"Hex"`. */
  input: string;
  /** Eye dropper button. Default `"Pick a color from the screen"`. */
  eyeDropper: string;
  /** Swatch group. Default `"Swatches"`. */
  swatches: string;
}

const defaultLabels: ColorPickerLabels = {
  trigger: "Choose color",
  area: "Saturation and brightness",
  hue: "Hue",
  alpha: "Alpha",
  input: "Hex",
  eyeDropper: "Pick a color from the screen",
  swatches: "Swatches",
};

const defaultAreaValueText = (saturation: number, brightness: number) =>
  `Saturation ${saturation}%, brightness ${brightness}%`;

/** A preset colour: a hex string, or an object with an accessible label. */
export type ColorPickerSwatchValue = string | { value: string; label?: string };

export interface ColorPickerContextValue {
  /** Current colour as `#rrggbb` (or `#rrggbbaa` with `alpha`). */
  value: string;
  /** Current colour in HSV (`h` 0–360, `s`/`v` 0–100, `a` 0–1). Keeps its hue for greys and black. */
  hsva: Hsva;
  alpha: boolean;
  disabled: boolean;
  labels: ColorPickerLabels;
  swatches: ColorPickerSwatchValue[] | undefined;
  getAreaValueText: (saturation: number, brightness: number) => string;
  /** Sets the colour from HSV. `commit` also calls `onValueCommit`. */
  setHsva: (next: Hsva, commit?: boolean) => void;
  /**
   * Sets the colour from any string `parseColor` understands. Keeps the hue (and saturation) when the new
   * colour is grey / black. Returns `false` (and changes nothing) when the string is not a colour.
   */
  setColor: (color: string, commit?: boolean) => boolean;
  /** Calls `onValueCommit` with the current value (end of a drag). */
  commit: () => void;
}

const ColorPickerContext = /* @__PURE__ */ createContext<ColorPickerContextValue | null>(null);

/** State and setters of the surrounding `ColorPicker` — for own parts (e.g. HSL fields, a reset button). */
export function useColorPicker(): ColorPickerContextValue {
  const context = useContext(ColorPickerContext);
  if (!context) throw new Error("ColorPicker parts must be placed inside <ColorPicker>.");
  return context;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const FALLBACK: Hsva = { h: 0, s: 0, v: 0, a: 1 };
/** Canonical form for comparisons (`#rrggbbaa`, lower case). */
const canonical = (color: string) => normalizeHex(color, true);

/** `input` as HSV, keeping `previous`' hue (and saturation) where the new colour has none. */
function syncHsva(previous: Hsva, input: string): Hsva {
  const next = hexToHsv(input);
  if (!next) return previous;
  if (next.s === 0 || next.v === 0) next.h = previous.h;
  if (next.v === 0) next.s = previous.s;
  return next;
}

/* ------------------------------------------------------------------------------------------------
 * Checkerboard (alpha backdrop) — token colours only
 * ----------------------------------------------------------------------------------------------*/

const CHECKER =
  "conic-gradient(hsl(var(--pui-muted-foreground) / 0.3) 25%, transparent 0 50%, hsl(var(--pui-muted-foreground) / 0.3) 0 75%, transparent 0) 0 0 / 8px 8px, hsl(var(--pui-background))";

/** Background layers: the colour (possibly translucent) over a checkerboard. */
const swatchBackground = (color: string, withChecker: boolean) =>
  withChecker ? `linear-gradient(${color}, ${color}), ${CHECKER}` : color;

/* ------------------------------------------------------------------------------------------------
 * Root
 * ----------------------------------------------------------------------------------------------*/

export interface ColorPickerProps
  extends Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange" | "children" | "dir"> {
  /** Controlled colour (`#rrggbb`, `#rrggbbaa` with `alpha`; any `parseColor` input is accepted). */
  value?: string;
  /** Initial colour when uncontrolled. Default `"#000000"`. */
  defaultValue?: string;
  /**
   * Every change (drag, keys, input, swatch). The value is `#rrggbb`, or `#rrggbbaa` with `alpha`; the second
   * argument is the exact HSV state (unrounded, with the kept hue) for apps that store HSL/HSV themselves.
   */
  onValueChange?: (value: string, hsva: Hsva) => void;
  /** Final value of an interaction: end of a drag, a key press, Enter/blur in the input, a swatch click. */
  onValueCommit?: (value: string, hsva: Hsva) => void;
  /** Adds an alpha slider (`ColorPickerAlpha` in the default layout) and switches the value to `#rrggbbaa`. */
  alpha?: boolean;
  disabled?: boolean;
  /** Renders a hidden input with this name (for native forms). */
  name?: string;
  /** Preset colours for `ColorPickerSwatches` (and the default layout). */
  swatches?: ColorPickerSwatchValue[];
  /** Renders the picker in place (no trigger, no popover). */
  inline?: boolean;
  /** Controlled popover state (popover mode). */
  open?: BasePopover.Root.Props["open"];
  defaultOpen?: BasePopover.Root.Props["defaultOpen"];
  onOpenChange?: BasePopover.Root.Props["onOpenChange"];
  /** Accessible names of the parts. */
  labels?: Partial<ColorPickerLabels>;
  /** `aria-valuetext` of the area. Default `"Saturation 50%, brightness 80%"`. */
  getAreaValueText?: (saturation: number, brightness: number) => string;
  /**
   * Own composition. Popover mode: `ColorPickerTrigger` + `ColorPickerContent`; inline: the parts directly.
   * Without children a default layout is rendered (trigger + area, hue, [alpha], input, [swatches]).
   */
  children?: ReactNode;
}

/**
 * Colour picker drawn in the DOM (works in FiveM/CEF, where native `<input type="color">` popups never show).
 * Popover mode by default; `inline` renders the parts in place. Holds the colour in HSV so the hue stays put
 * when the colour becomes grey or black.
 */
export const ColorPicker = /* @__PURE__ */ forwardRef<HTMLDivElement, ColorPickerProps>(function ColorPicker(
  {
    value: valueProp,
    defaultValue = "#000000",
    onValueChange,
    onValueCommit,
    alpha = false,
    disabled = false,
    name,
    swatches,
    inline = false,
    open,
    defaultOpen,
    onOpenChange,
    labels: labelsProp,
    getAreaValueText = defaultAreaValueText,
    className,
    children,
    ...props
  },
  ref,
) {
  const controlled = valueProp !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const incoming = controlled ? valueProp : uncontrolled;

  // HSV is the source of truth while interacting; `source` is the value it corresponds to. A new outside
  // value (not our own echo) re-derives HSV — adjusted during render, so there is no flash of the old colour.
  const [state, setState] = useState(() => ({ hsva: syncHsva(FALLBACK, incoming), source: incoming }));
  let hsva = state.hsva;
  if (incoming !== state.source) {
    const incomingCanonical = canonical(incoming);
    if (incomingCanonical !== null && incomingCanonical !== canonical(hsvToHex(state.hsva, true))) {
      hsva = syncHsva(state.hsva, incoming);
    }
    setState({ hsva, source: incoming });
  }

  const value = hsvToHex(hsva, alpha);
  const latest = useRef(value);
  latest.current = value;

  const hsvaRef = useRef(hsva);
  hsvaRef.current = hsva;

  const callbacks = useRef({ onValueChange, onValueCommit, controlled, alpha });
  callbacks.current = { onValueChange, onValueCommit, controlled, alpha };

  const setHsva = useCallback((next: Hsva, commit = false) => {
    const { onValueChange, onValueCommit, controlled, alpha } = callbacks.current;
    const normalized: Hsva = {
      h: clamp(next.h, 0, 360),
      s: clamp(next.s, 0, 100),
      v: clamp(next.v, 0, 100),
      a: alpha ? clamp(next.a, 0, 1) : 1,
    };
    const hex = hsvToHex(normalized, alpha);
    const changed = hex !== latest.current;
    latest.current = hex;
    setState({ hsva: normalized, source: hex });
    if (!controlled) setUncontrolled(hex);
    hsvaRef.current = normalized;
    if (changed) onValueChange?.(hex, normalized);
    if (commit) onValueCommit?.(hex, normalized);
  }, []);

  const setColor = useCallback(
    (color: string, commit = false) => {
      if (!parseColor(color)) return false;
      setHsva(syncHsva(hsvaRef.current, color), commit);
      return true;
    },
    [setHsva],
  );

  const commit = useCallback(() => callbacks.current.onValueCommit?.(latest.current, hsvaRef.current), []);

  const labels = useMemo(() => ({ ...defaultLabels, ...labelsProp }), [labelsProp]);

  const context = useMemo<ColorPickerContextValue>(
    () => ({ value, hsva, alpha, disabled, labels, swatches, getAreaValueText, setHsva, setColor, commit }),
    [value, hsva, alpha, disabled, labels, swatches, getAreaValueText, setHsva, setColor, commit],
  );

  const hidden = name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null;

  if (inline) {
    return (
      <ColorPickerContext.Provider value={context}>
        <div
          ref={ref}
          data-slot="color-picker"
          data-disabled={disabled ? "" : undefined}
          className={cn("flex w-64 flex-col gap-3", className)}
          {...props}
        >
          {children ?? <DefaultLayout />}
          {hidden}
        </div>
      </ColorPickerContext.Provider>
    );
  }

  return (
    <ColorPickerContext.Provider value={context}>
      <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <div
          ref={ref}
          data-slot="color-picker"
          data-disabled={disabled ? "" : undefined}
          className={cn("inline-flex", className)}
          {...props}
        >
          {children ?? (
            <>
              <ColorPickerTrigger />
              <ColorPickerContent />
            </>
          )}
          {hidden}
        </div>
      </Popover>
    </ColorPickerContext.Provider>
  );
});

function DefaultLayout() {
  const { alpha, swatches } = useColorPicker();
  return (
    <>
      <ColorPickerArea />
      <div className="flex flex-col gap-1">
        <ColorPickerHue />
        {alpha && <ColorPickerAlpha />}
      </div>
      <div className="flex items-center gap-1.5">
        <ColorPickerInput className="flex-1" />
        <ColorPickerEyeDropper />
      </div>
      {swatches && swatches.length > 0 && <ColorPickerSwatches />}
    </>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Trigger + Content (popover mode)
 * ----------------------------------------------------------------------------------------------*/

export interface ColorPickerTriggerProps extends BasePopover.Trigger.Props {}

/**
 * Swatch button that opens the picker (`data-slot="color-picker-trigger"`). Shows the current colour over a
 * checkerboard when `alpha` is on. `children` render on top of the swatch.
 */
export const ColorPickerTrigger = /* @__PURE__ */ forwardRef<HTMLButtonElement, ColorPickerTriggerProps>(function ColorPickerTrigger(
  { className, children, ...props },
  ref,
) {
  const { value, alpha, disabled, labels } = useColorPicker();
  return (
    <PopoverTrigger
      ref={ref}
      data-slot="color-picker-trigger"
      aria-label={labels.trigger}
      disabled={disabled}
      className={mergeClassName(
        [
          "relative inline-flex size-pui-control-sm shrink-0 cursor-pointer items-center justify-center overflow-hidden",
          "rounded-pui-md border border-pui-input outline-none",
          "transition-shadow duration-pui-fast ease-pui focus-visible:ring-pui focus-visible:ring-pui-ring",
          "data-[popup-open]:ring-pui data-[popup-open]:ring-pui-ring",
          "disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        ],
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="color-picker-trigger-swatch"
        className="pointer-events-none absolute inset-0"
        style={{ background: swatchBackground(value, alpha) }}
      />
      {children}
    </PopoverTrigger>
  );
});

export interface ColorPickerContentProps extends PopoverContentProps {}

/**
 * The popup (preUI `PopoverContent`: portalled, positioned, flips at the viewport edge). Without children it
 * renders the default layout.
 */
export const ColorPickerContent = /* @__PURE__ */ forwardRef<HTMLDivElement, ColorPickerContentProps>(function ColorPickerContent(
  { className, children, side = "bottom", align = "start", ...props },
  ref,
) {
  return (
    <PopoverContent
      ref={ref}
      data-slot="color-picker-content"
      side={side}
      align={align}
      className={mergeClassName("flex w-64 flex-col gap-3 p-3", className)}
      {...props}
    >
      {children ?? <DefaultLayout />}
    </PopoverContent>
  );
});

/* ------------------------------------------------------------------------------------------------
 * Area (saturation × brightness)
 * ----------------------------------------------------------------------------------------------*/

export interface ColorPickerAreaProps extends ComponentPropsWithoutRef<"div"> {
  /** Overrides the root's `getAreaValueText`. */
  getAriaValueText?: (saturation: number, brightness: number) => string;
  /** Class of the thumb (`data-slot="color-picker-area-thumb"`). */
  thumbClassName?: string;
}

const AREA_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);

/**
 * 2D area: saturation left → right, brightness bottom → top. `role="slider"` with `aria-valuetext`.
 * Keys: arrows ±1 (Shift ±10), Home/End saturation 0/100, PageUp/PageDown brightness ±10.
 * Pointer: press + drag with pointer capture (`touch-action: none`), no native drag.
 */
export const ColorPickerArea = /* @__PURE__ */ forwardRef<HTMLDivElement, ColorPickerAreaProps>(function ColorPickerArea(
  {
    className,
    thumbClassName,
    style,
    getAriaValueText,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeyDown,
    ...props
  },
  ref,
) {
  const { hsva, disabled, labels, getAreaValueText, setHsva, commit } = useColorPicker();
  const dragging = useRef(false);
  const hsvaRef = useRef(hsva);
  hsvaRef.current = hsva;

  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setHsva({
      ...hsvaRef.current,
      s: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      v: clamp((1 - (event.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    commit();
  };

  const saturation = Math.round(hsva.s);
  const brightness = Math.round(hsva.v);

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={labels.area}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={saturation}
      aria-valuetext={(getAriaValueText ?? getAreaValueText)(saturation, brightness)}
      aria-disabled={disabled || undefined}
      data-slot="color-picker-area"
      data-disabled={disabled ? "" : undefined}
      className={cn(
        [
          "relative h-36 w-full shrink-0 cursor-crosshair touch-none select-none rounded-pui-md outline-none",
          "shadow-[inset_0_0_0_1px_hsl(var(--pui-border))]",
          "focus-visible:ring-pui focus-visible:ring-pui-ring",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        ],
        className,
      )}
      style={{
        background: `linear-gradient(to top, hsl(0 0% 0%), hsl(0 0% 0% / 0)), linear-gradient(to right, hsl(0 0% 100%), hsl(${hsva.h} 100% 50%))`,
        ...style,
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.defaultPrevented || disabled || event.button !== 0) return;
        // No native drag / text selection; focus manually (preventDefault suppresses the focus change).
        event.preventDefault();
        event.currentTarget.focus();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Synthetic events (tests) have no active pointer.
        }
        dragging.current = true;
        fromPointer(event);
      }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (dragging.current) fromPointer(event);
      }}
      onPointerUp={(event) => {
        onPointerUp?.(event);
        endDrag();
      }}
      onPointerCancel={(event) => {
        onPointerCancel?.(event);
        endDrag();
      }}
      onLostPointerCapture={endDrag}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || disabled || !AREA_KEYS.has(event.key)) return;
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        let s = Math.round(hsva.s);
        let v = Math.round(hsva.v);
        if (event.key === "ArrowLeft") s -= step;
        if (event.key === "ArrowRight") s += step;
        if (event.key === "ArrowUp") v += step;
        if (event.key === "ArrowDown") v -= step;
        if (event.key === "Home") s = 0;
        if (event.key === "End") s = 100;
        if (event.key === "PageUp") v += 10;
        if (event.key === "PageDown") v -= 10;
        setHsva({ ...hsva, s: clamp(s, 0, 100), v: clamp(v, 0, 100) }, true);
      }}
      {...props}
    >
      <span
        aria-hidden="true"
        data-slot="color-picker-area-thumb"
        className={cn(
          "pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pui-thumb shadow-pui-thumb",
          thumbClassName,
        )}
        style={{ left: `${hsva.s}%`, top: `${100 - hsva.v}%`, background: hsvToHex({ ...hsva, a: 1 }) }}
      />
    </div>
  );
});

/* ------------------------------------------------------------------------------------------------
 * Hue / Alpha sliders (preUI Slider with a colour track)
 * ----------------------------------------------------------------------------------------------*/

type ChannelSliderProps = Omit<
  SliderProps<number>,
  "value" | "defaultValue" | "onValueChange" | "onValueCommitted" | "min" | "max" | "step" | "children"
>;

const HUE_TRACK =
  "linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))";

const channelTrackClass = "h-2.5 shadow-[inset_0_0_0_1px_hsl(var(--pui-border))] [background:var(--color-picker-track)]";

export interface ColorPickerHueProps extends ChannelSliderProps {}

/** Hue slider (0–360) built on preUI `Slider` (`data-slot="color-picker-hue"`). */
export const ColorPickerHue = /* @__PURE__ */ forwardRef<HTMLDivElement, ColorPickerHueProps>(function ColorPickerHue(
  { style, thumbLabels, trackClassName, indicatorClassName, controlClassName, ...props },
  ref,
) {
  const { hsva, disabled, labels, setHsva, commit } = useColorPicker();
  return (
    <Slider
      ref={ref}
      data-slot="color-picker-hue"
      value={Math.round(hsva.h)}
      min={0}
      max={360}
      step={1}
      disabled={disabled}
      thumbLabels={thumbLabels ?? [labels.hue]}
      onValueChange={(next) => setHsva({ ...hsva, h: next })}
      onValueCommitted={() => commit()}
      controlClassName={mergeClassName("py-1.5", controlClassName)}
      trackClassName={mergeClassName(channelTrackClass, trackClassName)}
      indicatorClassName={mergeClassName("bg-transparent", indicatorClassName)}
      style={{ "--color-picker-track": HUE_TRACK, ...(style as CSSProperties) } as CSSProperties}
      {...props}
    />
  );
});

export interface ColorPickerAlphaProps extends ChannelSliderProps {}

/** Alpha slider (0–100 %) over a checkerboard (`data-slot="color-picker-alpha"`). Needs `alpha` on the root. */
export const ColorPickerAlpha = /* @__PURE__ */ forwardRef<HTMLDivElement, ColorPickerAlphaProps>(function ColorPickerAlpha(
  { style, thumbLabels, trackClassName, indicatorClassName, controlClassName, ...props },
  ref,
) {
  const { hsva, disabled, labels, setHsva, commit } = useColorPicker();
  const opaque = hsvToHex({ ...hsva, a: 1 });
  return (
    <Slider
      ref={ref}
      data-slot="color-picker-alpha"
      value={Math.round(hsva.a * 100)}
      min={0}
      max={100}
      step={1}
      disabled={disabled}
      thumbLabels={thumbLabels ?? [labels.alpha]}
      onValueChange={(next) => setHsva({ ...hsva, a: next / 100 })}
      onValueCommitted={() => commit()}
      controlClassName={mergeClassName("py-1.5", controlClassName)}
      trackClassName={mergeClassName(channelTrackClass, trackClassName)}
      indicatorClassName={mergeClassName("bg-transparent", indicatorClassName)}
      style={
        {
          "--color-picker-track": `linear-gradient(to right, transparent, ${opaque}), ${CHECKER}`,
          ...(style as CSSProperties),
        } as CSSProperties
      }
      {...props}
    />
  );
});

/* ------------------------------------------------------------------------------------------------
 * Hex input
 * ----------------------------------------------------------------------------------------------*/

export interface ColorPickerInputProps extends Omit<InputProps, "value" | "defaultValue"> {}

/**
 * Hex field (`#rrggbb`, `#rgb`, with `alpha` also `#rrggbbaa`; `rgb()`/`hsl()` are accepted too). Invalid text
 * sets `aria-invalid`; valid text is applied on Enter or blur, Escape restores the current value.
 */
export const ColorPickerInput = /* @__PURE__ */ forwardRef<HTMLInputElement, ColorPickerInputProps>(function ColorPickerInput(
  { className, onChange, onBlur, onKeyDown, size = "sm", ...props },
  ref,
) {
  const { value, disabled, labels, setColor } = useColorPicker();
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && parseColor(draft) === null;

  const apply = () => {
    if (draft === null) return;
    if (!invalid) setColor(draft, true);
    setDraft(null);
  };

  return (
    <Input
      ref={ref}
      data-slot="color-picker-input"
      size={size}
      spellCheck={false}
      autoComplete="off"
      aria-label={labels.input}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      value={draft ?? value}
      className={mergeClassName("font-mono tabular-nums", className)}
      onChange={(event) => {
        onChange?.(event);
        setDraft(event.target.value);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        apply();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "Enter") {
          event.preventDefault();
          apply();
        } else if (event.key === "Escape" && draft !== null) {
          setDraft(null);
        }
      }}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------------------------------------
 * Swatches
 * ----------------------------------------------------------------------------------------------*/

export interface ColorPickerSwatchProps extends Omit<ComponentPropsWithoutRef<"button">, "value"> {
  /** The colour this swatch applies. */
  value: string;
}

/** One preset colour button (`data-slot="color-picker-swatch"`, `aria-pressed` when it is the current colour). */
export const ColorPickerSwatch = /* @__PURE__ */ forwardRef<HTMLButtonElement, ColorPickerSwatchProps>(function ColorPickerSwatch(
  { value: swatch, className, onClick, disabled: disabledProp, "aria-label": ariaLabel, ...props },
  ref,
) {
  const { value, alpha, disabled, setColor } = useColorPicker();
  const disabledState = disabled || disabledProp;
  const swatchCanonical = canonical(swatch);
  const selected = swatchCanonical !== null && swatchCanonical === canonical(value);
  const translucent = parseColor(swatch)?.a !== 1;
  return (
    <button
      ref={ref}
      type="button"
      data-slot="color-picker-swatch"
      data-selected={selected ? "" : undefined}
      aria-label={ariaLabel ?? swatch}
      aria-pressed={selected}
      disabled={disabledState}
      className={cn(
        [
          "size-6 shrink-0 cursor-pointer rounded-pui-sm outline-none",
          "shadow-[inset_0_0_0_1px_hsl(var(--pui-border))]",
          "transition-shadow duration-pui-fast ease-pui focus-visible:ring-pui focus-visible:ring-pui-ring",
          "data-[selected]:ring-pui data-[selected]:ring-pui-foreground data-[selected]:ring-offset-pui data-[selected]:ring-offset-pui-popover",
          "disabled:pointer-events-none disabled:opacity-50",
        ],
        className,
      )}
      style={{ background: swatchBackground(swatch, alpha && translucent) }}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setColor(swatch, true);
      }}
      {...props}
    />
  );
});

export interface ColorPickerSwatchesProps extends ComponentPropsWithoutRef<"div"> {
  /** Preset colours; defaults to the root's `swatches`. Ignored when `children` are given. */
  swatches?: ColorPickerSwatchValue[];
}

/** Group of preset colours (`data-slot="color-picker-swatches"`). */
export const ColorPickerSwatches = /* @__PURE__ */ forwardRef<HTMLDivElement, ColorPickerSwatchesProps>(function ColorPickerSwatches(
  { swatches: swatchesProp, className, children, ...props },
  ref,
) {
  const { swatches: rootSwatches, labels } = useColorPicker();
  const list = swatchesProp ?? rootSwatches ?? [];
  return (
    <div
      ref={ref}
      role="group"
      aria-label={labels.swatches}
      data-slot="color-picker-swatches"
      className={cn("flex flex-wrap gap-1", className)}
      {...props}
    >
      {children ??
        list.map((swatch) => {
          const item = typeof swatch === "string" ? { value: swatch } : swatch;
          return <ColorPickerSwatch key={item.value} value={item.value} aria-label={item.label} />;
        })}
    </div>
  );
});

/* ------------------------------------------------------------------------------------------------
 * Eye dropper (only where the browser has window.EyeDropper, Chromium 95+)
 * ----------------------------------------------------------------------------------------------*/

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>;
}
type EyeDropperWindow = Window & { EyeDropper?: new () => EyeDropperLike };

export interface ColorPickerEyeDropperProps extends ComponentPropsWithoutRef<"button"> {}

/**
 * Picks a colour from the screen via the EyeDropper API. Renders nothing until an effect confirmed
 * `window.EyeDropper` exists (so SSR and browsers without it show no button).
 */
export const ColorPickerEyeDropper = /* @__PURE__ */ forwardRef<HTMLButtonElement, ColorPickerEyeDropperProps>(
  function ColorPickerEyeDropper({ className, children, onClick, disabled: disabledProp, ...props }, ref) {
    const { disabled, labels, setColor } = useColorPicker();
    const [supported, setSupported] = useState(false);
    useEffect(() => {
      setSupported(typeof (window as EyeDropperWindow).EyeDropper === "function");
    }, []);
    if (!supported) return null;
    return (
      <button
        ref={ref}
        type="button"
        data-slot="color-picker-eye-dropper"
        aria-label={labels.eyeDropper}
        disabled={disabled || disabledProp}
        className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), className)}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          const EyeDropper = (window as EyeDropperWindow).EyeDropper;
          if (!EyeDropper) return;
          new EyeDropper()
            .open()
            .then((result) => setColor(result.sRGBHex, true))
            .catch(() => undefined);
        }}
        {...props}
      >
        {children ?? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m2 22 1-1h3l9-9" />
            <path d="M3 21v-3l9-9" />
            <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
          </svg>
        )}
      </button>
    );
  },
);
