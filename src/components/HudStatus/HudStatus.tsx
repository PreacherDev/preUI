import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, memo, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { progressIndicatorVariants, type ProgressTone } from "../Progress/Progress";
import { ProgressCircle, progressCircleIndicatorVariants } from "../ProgressCircle/ProgressCircle";

/* ------------------------------------------------------------------------------------------------
 * Shared helpers
 * ----------------------------------------------------------------------------------------------*/

/** Same tones as `Progress` / `ProgressCircle`. */
export type HudStatusTone = ProgressTone;
export type HudStatusVariant = "ring" | "bar" | "pill";
export type HudStatusSize = "sm" | "default" | "lg";
/** `"normal"` or the threshold level that is currently reached. */
export type HudStatusLevel = "normal" | "warning" | "critical";

export interface HudStatusThresholds {
  /** Switches to `warning` when the value is **below** this (in the same unit as `value`), e.g. hunger `20`. */
  warnBelow?: number;
  /** Switches to `critical` (tone `negative`) when the value is below this. */
  criticalBelow?: number;
  /** Switches to `warning` when the value is **above** this, for stats where high is bad (stress). */
  warnAbove?: number;
  /** Switches to `critical` when the value is above this. */
  criticalAbove?: number;
}

/** Resolves the threshold level of a value. Critical wins over warning; comparisons are strict (`<` / `>`). */
export function getHudStatusLevel(value: number, thresholds: HudStatusThresholds): HudStatusLevel {
  const { warnBelow, criticalBelow, warnAbove, criticalAbove } = thresholds;
  if ((criticalBelow != null && value < criticalBelow) || (criticalAbove != null && value > criticalAbove)) {
    return "critical";
  }
  if ((warnBelow != null && value < warnBelow) || (warnAbove != null && value > warnAbove)) return "warning";
  return "normal";
}

function clampValue(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, max), Math.max(0, value));
}

// Intl.NumberFormat is expensive to construct and HUD values change many times per second: cache per locale+options.
const formatterCache = new Map<string, Intl.NumberFormat>();
const defaultFormat: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };

function getFormatter(locale: Intl.LocalesArgument, format: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${String(locale)}|${JSON.stringify(format)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale as string | string[] | undefined, format);
    if (formatterCache.size > 50) formatterCache.clear();
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/* ------------------------------------------------------------------------------------------------
 * useHudStatus (headless)
 * ----------------------------------------------------------------------------------------------*/

export interface UseHudStatusOptions extends HudStatusThresholds {
  /** Current value, `0 … max`. Out-of-range values (and `NaN`) are clamped. */
  value: number;
  /** Default `100`. The minimum is always `0`. */
  max?: number;
  /** Tone while no threshold is reached. Default `"primary"`. */
  tone?: HudStatusTone;
  /** Locale for `valueText` (`Intl.NumberFormat`). Default `"en-US"`. */
  locale?: Intl.LocalesArgument;
  /** Number format for `valueText`. Default `{ maximumFractionDigits: 0 }`. */
  format?: Intl.NumberFormatOptions;
  /** Accessible name, used as `aria-label` in `meterProps`. */
  label?: string;
}

export interface HudStatusMeterProps {
  role: "meter";
  "aria-label"?: string;
  "aria-valuenow": number;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-valuetext": string;
}

export interface HudStatusState {
  /** The clamped value (`0 … max`). */
  value: number;
  /** The effective max (`0` when `max` is not a positive number). */
  max: number;
  /** `value / max`, `0 … 1`. */
  fraction: number;
  /** `fraction × 100`, `0 … 100`. */
  percent: number;
  /** Threshold level that is reached. */
  level: HudStatusLevel;
  /** Resolved tone: `negative` when critical, `warning` when warning, otherwise the given tone. */
  tone: HudStatusTone;
  /** The value formatted with `locale` / `format`. */
  valueText: string;
}

export interface UseHudStatusReturn extends HudStatusState {
  /** Spread onto your element: `role="meter"`, `aria-label`, `aria-valuenow/min/max/text`. */
  meterProps: HudStatusMeterProps;
}

/**
 * Headless HUD stat: clamping, threshold level, resolved tone, formatted value and meter ARIA props — the logic
 * `HudStatus` uses — for completely custom HUD visuals (segment bars, icons that fill up …).
 */
export function useHudStatus({
  value,
  max = 100,
  warnBelow,
  criticalBelow,
  warnAbove,
  criticalAbove,
  tone = "primary",
  locale = "en-US",
  format = defaultFormat,
  label,
}: UseHudStatusOptions): UseHudStatusReturn {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const clamped = clampValue(value, safeMax);
  const fraction = safeMax > 0 ? clamped / safeMax : 0;
  const level = getHudStatusLevel(clamped, { warnBelow, criticalBelow, warnAbove, criticalAbove });
  const resolvedTone: HudStatusTone = level === "critical" ? "negative" : level === "warning" ? "warning" : tone;
  const valueText = getFormatter(locale, format).format(clamped);
  return {
    value: clamped,
    max: safeMax,
    fraction,
    percent: fraction * 100,
    level,
    tone: resolvedTone,
    valueText,
    meterProps: {
      role: "meter",
      "aria-label": label,
      "aria-valuenow": clamped,
      "aria-valuemin": 0,
      "aria-valuemax": safeMax,
      "aria-valuetext": valueText,
    },
  };
}

const iconToneClasses: Record<HudStatusTone, string> = {
  primary: "text-pui-primary",
  positive: "text-pui-positive",
  warning: "text-pui-warning",
  negative: "text-pui-negative",
  muted: "text-pui-muted-foreground",
};

// Only the geometry animates (never layout-affecting properties besides the bar width) — values update often.
const barIndicatorMotion = "transition-[width] duration-pui-base ease-pui motion-reduce:transition-none";
const ringIndicatorMotion = "transition-[stroke-dashoffset] duration-pui-base ease-pui motion-reduce:transition-none";

/* ------------------------------------------------------------------------------------------------
 * HudStatus
 * ----------------------------------------------------------------------------------------------*/

// Icon sizes per variant, applied to the icon wrapper only (never to the ring's own svg).
const iconSizeClasses: Record<HudStatusVariant, Record<HudStatusSize, string>> = {
  ring: { sm: "[&_svg]:size-3.5", default: "[&_svg]:size-5", lg: "[&_svg]:size-6" },
  bar: { sm: "[&_svg]:size-3.5", default: "[&_svg]:size-4", lg: "[&_svg]:size-5" },
  pill: { sm: "[&_svg]:size-3", default: "[&_svg]:size-3.5", lg: "[&_svg]:size-4" },
};

const barSizeClasses: Record<HudStatusSize, { track: string; text: string }> = {
  sm: { track: "h-1 w-20", text: "text-pui-2xs" },
  default: { track: "h-1.5 w-28", text: "text-xs" },
  lg: { track: "h-2 w-36", text: "text-sm" },
};

const pillSizeClasses: Record<HudStatusSize, string> = {
  sm: "h-6 gap-1 px-2 text-pui-2xs",
  default: "h-7 gap-1.5 px-2.5 text-xs",
  lg: "h-8 gap-2 px-3 text-sm",
};

const pillToneClasses: Record<HudStatusLevel, string> = {
  normal: "border-pui-border bg-pui-card/80 text-pui-card-foreground",
  warning: "border-pui-warning/tint-border bg-pui-warning/tint text-pui-foreground",
  critical: "border-pui-negative/tint-border bg-pui-negative/tint text-pui-foreground",
};

export type HudStatusPart = "root" | "icon" | "track" | "indicator" | "value" | "label";

export interface HudStatusProps extends Omit<HTMLAttributes<HTMLDivElement>, "children">, HudStatusThresholds {
  /** Current value, `0 … max`. Out-of-range values (and `NaN`) are clamped. */
  value: number;
  /** Default `100`. The minimum is always `0`. */
  max?: number;
  /** Icon, e.g. `<Heart />` from lucide-react. Hoist it to a constant so the memoised component can skip renders. */
  icon?: ReactNode;
  /** Accessible name (always) and the visible label with `showLabel`, e.g. "Health". */
  label: string;
  /** Shows `label` as text (under the ring, above the bar, next to the pill's icon). */
  showLabel?: boolean;
  /** `"ring"` (default): ring with the icon inside · `"bar"`: icon + horizontal bar · `"pill"`: compact icon + value. */
  variant?: HudStatusVariant;
  /** Tone while no threshold is reached. Default `"primary"`. Thresholds override it with `warning` / `negative`. */
  tone?: HudStatusTone;
  /** Fades the stat in and out (`motion-safe:animate-pulse`) while the level is `critical`. */
  pulseWhenCritical?: boolean;
  /** Shows the formatted value. Default `true` for `"pill"` or when `renderValue` is given, otherwise `false`. */
  showValue?: boolean;
  /**
   * `"sm"` · `"default"` · `"lg"`, or (ring only) the ring diameter in px. Bars and pills use the `"default"` sizing
   * for a number.
   */
  size?: HudStatusSize | number;
  /** Stroke width of the ring in px, or the bar height in px. Default: the size's own thickness. */
  thickness?: number;
  /**
   * Locale for the value text (`Intl.NumberFormat`). Default `"en-US"` — not the runtime locale, so server and
   * client render the same text.
   */
  locale?: Intl.LocalesArgument;
  /** Number format for the value text and `aria-valuetext`. Default `{ maximumFractionDigits: 0 }`. */
  format?: Intl.NumberFormatOptions;
  /**
   * Custom content of the value text, e.g. `({ valueText }) => valueText + " %"`. `aria-valuetext` stays the
   * formatted value.
   */
  renderValue?: (state: HudStatusState) => ReactNode;
  /** Extra classes per part, merged after the defaults (and after `iconClassName` / `trackClassName` / `indicatorClassName`). */
  classNames?: Partial<Record<HudStatusPart, string>>;
  /** Classes for the icon wrapper. */
  iconClassName?: string;
  /** Classes for the track (bar: the bar track, ring: the track circle). */
  trackClassName?: string;
  /** Classes for the indicator (bar fill or ring arc). */
  indicatorClassName?: string;
}

const HudStatusImpl = /* @__PURE__ */ forwardRef<HTMLDivElement, HudStatusProps>(function HudStatus(
  {
    className,
    value,
    max = 100,
    icon,
    label,
    showLabel = false,
    variant = "ring",
    tone = "primary",
    warnBelow,
    criticalBelow,
    warnAbove,
    criticalAbove,
    pulseWhenCritical = false,
    showValue,
    size = "default",
    thickness,
    locale = "en-US",
    format = defaultFormat,
    renderValue,
    classNames,
    iconClassName,
    trackClassName,
    indicatorClassName,
    style,
    ...props
  },
  ref,
) {
  const { meterProps, ...state } = useHudStatus({
    value,
    max,
    warnBelow,
    criticalBelow,
    warnAbove,
    criticalAbove,
    tone,
    locale,
    format,
    label,
  });
  const { value: clamped, max: safeMax, fraction, level, tone: resolvedTone, valueText } = state;
  const withValue = showValue ?? (variant === "pill" || renderValue != null);
  const valueContent = renderValue ? renderValue(state) : valueText;
  // Numeric sizes only change the ring; bars and pills fall back to the default sizing.
  const customSize = typeof size === "number";
  const namedSize: HudStatusSize = customSize ? "default" : size;

  const rootData = {
    "data-slot": "hud-status",
    "data-variant": variant,
    "data-size": customSize ? "custom" : size,
    "data-tone": resolvedTone,
    "data-level": level === "normal" ? undefined : level,
  };
  const rootClasses = [
    "[&[hidden]]:hidden",
    pulseWhenCritical && level === "critical" && "motion-safe:animate-pulse",
  ];

  const ringIconPx = variant === "ring" && customSize ? Math.max(8, Math.round(size * 0.4)) : undefined;
  const iconNode =
    icon != null && icon !== false ? (
      <span
        data-slot="hud-status-icon"
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center",
          ringIconPx === undefined ? iconSizeClasses[variant][namedSize] : "[&_svg]:size-[var(--hud-status-icon-size)]",
          iconToneClasses[resolvedTone],
          iconClassName,
          classNames?.icon,
        )}
        style={ringIconPx === undefined ? undefined : ({ "--hud-status-icon-size": `${ringIconPx}px` } as CSSProperties)}
      >
        {icon}
      </span>
    ) : null;

  if (variant === "ring") {
    return (
      <div
        ref={ref}
        {...rootData}
        className={cn("inline-flex flex-col items-center gap-1", rootClasses, className, classNames?.root)}
        style={style}
        {...props}
      >
        <ProgressCircle
          value={clamped}
          max={safeMax}
          size={size}
          thickness={thickness}
          tone={resolvedTone}
          locale={locale}
          format={format}
          aria-label={label}
          getAriaValueText={() => valueText}
          trackClassName={cn(trackClassName, classNames?.track)}
          indicatorClassName={cn(ringIndicatorMotion, indicatorClassName, classNames?.indicator)}
        >
          {iconNode}
        </ProgressCircle>
        {(showLabel || withValue) && (
          <span className="flex items-baseline gap-1 text-pui-2xs leading-none" aria-hidden="true">
            {showLabel && (
              <span data-slot="hud-status-label" className={cn("font-medium text-pui-muted-foreground", classNames?.label)}>
                {label}
              </span>
            )}
            {withValue && (
              <span
                data-slot="hud-status-value"
                className={cn("font-medium tabular-nums text-pui-foreground", classNames?.value)}
              >
                {valueContent}
              </span>
            )}
          </span>
        )}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <div
        ref={ref}
        {...meterProps}
        {...rootData}
        className={cn(
          "inline-flex shrink-0 items-center rounded-full border font-medium",
          pillSizeClasses[namedSize],
          pillToneClasses[level],
          rootClasses,
          className,
          classNames?.root,
        )}
        style={style}
        {...props}
      >
        {iconNode}
        {showLabel && (
          <span data-slot="hud-status-label" aria-hidden="true" className={cn("text-pui-muted-foreground", classNames?.label)}>
            {label}
          </span>
        )}
        {withValue && (
          <span data-slot="hud-status-value" aria-hidden="true" className={cn("tabular-nums", classNames?.value)}>
            {valueContent}
          </span>
        )}
      </div>
    );
  }

  // bar
  const sizes = barSizeClasses[namedSize];
  const track = (
    <div
      data-slot="hud-status-track"
      className={cn("relative overflow-hidden rounded-full bg-pui-muted", sizes.track, trackClassName, classNames?.track)}
      style={thickness === undefined ? undefined : { height: Math.max(1, thickness) }}
    >
      <div
        data-slot="hud-status-indicator"
        className={cn(
          progressIndicatorVariants({ tone: resolvedTone }),
          barIndicatorMotion,
          indicatorClassName,
          classNames?.indicator,
        )}
        style={{ width: `${fraction * 100}%` }}
      />
    </div>
  );
  const valueNode = withValue ? (
    <span
      data-slot="hud-status-value"
      aria-hidden="true"
      className={cn("font-medium tabular-nums text-pui-foreground", classNames?.value)}
    >
      {valueContent}
    </span>
  ) : null;

  return (
    <div
      ref={ref}
      {...meterProps}
      {...rootData}
      className={cn("inline-flex items-center gap-2", sizes.text, rootClasses, className, classNames?.root)}
      style={style}
      {...props}
    >
      {iconNode}
      {showLabel ? (
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 leading-none" aria-hidden="true">
            <span data-slot="hud-status-label" className={cn("font-medium text-pui-muted-foreground", classNames?.label)}>
              {label}
            </span>
            {valueNode}
          </div>
          {track}
        </div>
      ) : (
        <>
          {track}
          {valueNode}
        </>
      )}
    </div>
  );
});

/**
 * One player stat for a game HUD (health, armour, hunger, thirst, stamina, stress, oxygen …) as a ring, bar or
 * pill. `warnBelow` / `criticalBelow` (or `…Above`) switch the tone to `warning` / `negative` and set
 * `data-level`. Memoised: re-renders only when its props change (hoist `icon` elements to keep that cheap).
 */
export const HudStatus = /* @__PURE__ */ memo(HudStatusImpl);

/* ------------------------------------------------------------------------------------------------
 * HudStatusGroup
 * ----------------------------------------------------------------------------------------------*/

export const hudStatusGroupVariants = /* @__PURE__ */ cva("flex w-fit", {
  variants: {
    orientation: {
      horizontal: "flex-row flex-wrap items-center gap-3",
      vertical: "flex-col items-start gap-2",
    },
    variant: {
      default: "",
      surface: "rounded-pui border border-pui-border bg-pui-card/80 px-3 py-2 text-pui-card-foreground",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    variant: "default",
  },
});

export type HudStatusGroupOrientation = NonNullable<VariantProps<typeof hudStatusGroupVariants>["orientation"]>;
export type HudStatusGroupVariant = NonNullable<VariantProps<typeof hudStatusGroupVariants>["variant"]>;

export interface HudStatusGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Default `"horizontal"`. */
  orientation?: HudStatusGroupOrientation;
  /** `"default"` is plain, `"surface"` a flat card-coloured panel. */
  variant?: HudStatusGroupVariant;
  /** Space between the stats in px (overrides the default gap). */
  gap?: number;
}

/** Row or column of `HudStatus` items (`role="group"`; give it an `aria-label`). */
export const HudStatusGroup = /* @__PURE__ */ forwardRef<HTMLDivElement, HudStatusGroupProps>(function HudStatusGroup(
  { className, orientation = "horizontal", variant = "default", gap, style, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="group"
      data-slot="hud-status-group"
      data-orientation={orientation}
      data-variant={variant}
      className={cn(hudStatusGroupVariants({ orientation, variant }), className)}
      style={gap === undefined ? style : { gap, ...style }}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------------------------------------
 * HudSpeedometer
 * ----------------------------------------------------------------------------------------------*/

export type HudSpeedometerSize = "sm" | "default" | "lg";

const speedometerSizes: Record<HudSpeedometerSize, { dial: string; speed: string; unit: string; gear: string }> = {
  sm: { dial: "size-24", speed: "text-2xl", unit: "text-pui-2xs", gear: "min-w-5 h-5 text-xs" },
  default: { dial: "size-32", speed: "text-4xl", unit: "text-pui-eyebrow", gear: "min-w-6 h-6 text-sm" },
  lg: { dial: "size-40", speed: "text-5xl", unit: "text-xs", gear: "min-w-7 h-7 text-base" },
};

// Arc geometry in a 100×100 viewBox: a 270° arc open at the bottom, drawn with a dash on a full circle.
const ARC_RADIUS = 44;
const ARC_STROKE = 6;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS;
const ARC_LENGTH = ARC_CIRCUMFERENCE * 0.75;

// Tick marks: short flat lines just inside the arc (kept short so they don't reach the readout).
const TICK_OUTER = ARC_RADIUS - ARC_STROKE / 2 - 1.5;
const TICK_LENGTH = 3.5;

export type HudSpeedometerPart =
  | "root"
  | "dial"
  | "arc"
  | "track"
  | "redline"
  | "indicator"
  | "tick"
  | "readout"
  | "speed"
  | "unit"
  | "gear"
  | "fuel";

/** What `renderSpeed` receives. */
export interface HudSpeedometerState {
  /** The shown speed (negative values and `NaN` become `0`). */
  speed: number;
  maxSpeed: number;
  /** `speed / maxSpeed`, clamped to `0 … 1`. */
  fraction: number;
  /** The speed formatted with `locale` / `format`. */
  speedText: string;
  /** `true` while the speed is at or above `redlineFrom`. */
  redline: boolean;
}

export interface HudSpeedometerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Current speed in the unit you display. Negative values and `NaN` are shown as `0`. */
  speed: number;
  /** Top of the arc scale. Default `240`. Speeds above it fill the arc completely. */
  maxSpeed?: number;
  /** Unit label under the number. Default `"km/h"`. */
  unit?: ReactNode;
  /** Current gear, shown as a small key cap. Pass what you want displayed (`3`, `"R"`, `"N"`). */
  gear?: ReactNode;
  /** Screen-reader prefix for the gear. Default `"Gear"`. */
  gearLabel?: string;
  /** Fuel level `0 … 100`; renders a small `HudStatus` bar under the dial. */
  fuel?: number;
  /** Icon for the fuel bar, e.g. `<Fuel />`. */
  fuelIcon?: ReactNode;
  /** Accessible name of the fuel bar. Default `"Fuel"`. */
  fuelLabel?: string;
  /** Fuel warning threshold. Default `25`. */
  fuelWarnBelow?: number;
  /** Fuel critical threshold. Default `10`. */
  fuelCriticalBelow?: number;
  /** Shows the 270° arc for `speed / maxSpeed`. Default `true`. */
  showArc?: boolean;
  /** Number of flat tick marks spread evenly along the arc, both ends included (e.g. `9` for every 30 km/h up to 240). */
  ticks?: number;
  /**
   * Marks the arc from this speed to `maxSpeed` in the negative tone (tinted), and switches the indicator to
   * `negative` (plus `data-redline` on the root) while the speed is at or above it.
   */
  redlineFrom?: number;
  /** Arc colour. Default `"primary"`. */
  tone?: HudStatusTone;
  /** Accessible name of the whole speedometer. Default `"Speedometer"`. */
  label?: string;
  /** Default `"default"`. */
  size?: HudSpeedometerSize;
  /** Locale for the speed (`Intl.NumberFormat`). Default `"en-US"`. */
  locale?: Intl.LocalesArgument;
  /** Number format for the speed. Default `{ maximumFractionDigits: 0 }`. */
  format?: Intl.NumberFormatOptions;
  /** Custom content of the speed number. */
  renderSpeed?: (state: HudSpeedometerState) => ReactNode;
  /** Extra classes per part, merged after the defaults. `tick` applies to every tick mark. */
  classNames?: Partial<Record<HudSpeedometerPart, string>>;
}

/** Point on the speedometer arc (100×100 viewBox) for `fraction` 0 … 1 at `radius`. */
function arcPoint(fraction: number, radius: number): [number, number] {
  // 0 = 7:30 (135° in SVG angles, clockwise from 3 o'clock), 1 = 4:30.
  const radians = ((135 + 270 * fraction) * Math.PI) / 180;
  return [50 + radius * Math.cos(radians), 50 + radius * Math.sin(radians)];
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

const HudSpeedometerImpl = /* @__PURE__ */ forwardRef<HTMLDivElement, HudSpeedometerProps>(function HudSpeedometer(
  {
    className,
    speed,
    maxSpeed = 240,
    unit = "km/h",
    gear,
    gearLabel = "Gear",
    fuel,
    fuelIcon,
    fuelLabel = "Fuel",
    fuelWarnBelow = 25,
    fuelCriticalBelow = 10,
    showArc = true,
    ticks,
    redlineFrom,
    tone = "primary",
    label = "Speedometer",
    size = "default",
    locale = "en-US",
    format = defaultFormat,
    renderSpeed,
    classNames,
    ...props
  },
  ref,
) {
  const shown = Number.isFinite(speed) ? Math.max(0, speed) : 0;
  const fraction = maxSpeed > 0 ? Math.min(1, shown / maxSpeed) : 0;
  const speedText = getFormatter(locale, format).format(shown);
  const sizes = speedometerSizes[size];
  const hasGear = gear != null && gear !== false && gear !== "";
  const hasRedline = redlineFrom != null && Number.isFinite(redlineFrom) && maxSpeed > 0 && redlineFrom < maxSpeed;
  const redlineFraction = hasRedline ? Math.max(0, redlineFrom / maxSpeed) : 1;
  const inRedline = hasRedline && shown >= redlineFrom;
  const tickCount = ticks != null && Number.isFinite(ticks) ? Math.min(200, Math.floor(ticks)) : 0;

  const readout = (
    <>
      <span
        data-slot="hud-speedometer-speed"
        className={cn("font-semibold leading-none tabular-nums text-pui-foreground", sizes.speed, classNames?.speed)}
      >
        {renderSpeed ? renderSpeed({ speed: shown, maxSpeed, fraction, speedText, redline: inRedline }) : speedText}
      </span>
      <span
        data-slot="hud-speedometer-unit"
        className={cn(
          "font-semibold uppercase leading-none tracking-wider text-pui-muted-foreground",
          sizes.unit,
          classNames?.unit,
        )}
      >
        {unit}
      </span>
      {hasGear && (
        <span
          data-slot="hud-speedometer-gear"
          className={cn(
            "inline-flex items-center justify-center rounded-pui-sm border border-pui-border bg-pui-background px-1 font-mono font-semibold leading-none text-pui-foreground",
            sizes.gear,
            classNames?.gear,
          )}
        >
          <span className="sr-only">{gearLabel} </span>
          {gear}
        </span>
      )}
    </>
  );

  const tickMarks: ReactNode[] = [];
  for (let i = 0; tickCount >= 2 && i < tickCount; i += 1) {
    const at = i / (tickCount - 1);
    const [x1, y1] = arcPoint(at, TICK_OUTER);
    const [x2, y2] = arcPoint(at, TICK_OUTER - TICK_LENGTH);
    const red = hasRedline && at >= redlineFraction - 1e-9;
    tickMarks.push(
      <line
        key={i}
        data-slot="hud-speedometer-tick"
        data-redline={red ? "" : undefined}
        x1={round3(x1)}
        y1={round3(y1)}
        x2={round3(x2)}
        y2={round3(y2)}
        strokeWidth={1.5}
        className={cn(red ? "stroke-pui-negative" : "stroke-pui-muted-foreground", classNames?.tick)}
      />,
    );
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      data-slot="hud-speedometer"
      data-size={size}
      data-arc={showArc ? "" : undefined}
      data-redline={inRedline ? "" : undefined}
      className={cn("inline-flex flex-col items-center gap-2 [&[hidden]]:hidden", className, classNames?.root)}
      {...props}
    >
      {showArc ? (
        <div
          data-slot="hud-speedometer-dial"
          className={cn("relative flex items-center justify-center", sizes.dial, classNames?.dial)}
        >
          <svg
            data-slot="hud-speedometer-arc"
            viewBox="0 0 100 100"
            aria-hidden="true"
            focusable="false"
            className={cn("absolute inset-0 size-full", classNames?.arc)}
          >
            {/* 270° arc from 7:30 clockwise to 4:30: start at 135° (SVG angles run clockwise from 3 o'clock). */}
            <circle
              data-slot="hud-speedometer-track"
              cx={50}
              cy={50}
              r={ARC_RADIUS}
              strokeWidth={ARC_STROKE}
              strokeLinecap="round"
              transform="rotate(135 50 50)"
              strokeDasharray={`${ARC_LENGTH} ${ARC_CIRCUMFERENCE}`}
              className={cn("fill-none stroke-pui-muted", classNames?.track)}
            />
            {hasRedline && (
              <circle
                data-slot="hud-speedometer-redline"
                cx={50}
                cy={50}
                r={ARC_RADIUS}
                strokeWidth={ARC_STROKE}
                strokeLinecap="round"
                transform={`rotate(${round3(135 + 270 * redlineFraction)} 50 50)`}
                strokeDasharray={`${round3(ARC_LENGTH * (1 - redlineFraction))} ${ARC_CIRCUMFERENCE}`}
                className={cn("fill-none stroke-pui-negative/tint-border", classNames?.redline)}
              />
            )}
            <circle
              data-slot="hud-speedometer-indicator"
              cx={50}
              cy={50}
              r={ARC_RADIUS}
              strokeWidth={ARC_STROKE}
              strokeLinecap="round"
              transform="rotate(135 50 50)"
              strokeDasharray={`${ARC_LENGTH} ${ARC_CIRCUMFERENCE}`}
              style={{ strokeDashoffset: ARC_LENGTH * (1 - fraction), opacity: fraction > 0 ? 1 : 0 }}
              className={cn(
                progressCircleIndicatorVariants({ tone: inRedline ? "negative" : tone }),
                ringIndicatorMotion,
                classNames?.indicator,
              )}
            />
            {tickMarks}
          </svg>
          <div className={cn("relative flex flex-col items-center gap-1", classNames?.readout)}>{readout}</div>
        </div>
      ) : (
        <div data-slot="hud-speedometer-readout" className={cn("flex items-end gap-1.5", classNames?.readout)}>
          {readout}
        </div>
      )}
      {fuel !== undefined && (
        <HudStatus
          data-slot="hud-speedometer-fuel"
          variant="bar"
          size="sm"
          value={fuel}
          icon={fuelIcon}
          label={fuelLabel}
          warnBelow={fuelWarnBelow}
          criticalBelow={fuelCriticalBelow}
          locale={locale}
          className={classNames?.fuel}
        />
      )}
    </div>
  );
});

/**
 * Vehicle speedometer for a game HUD: large tabular speed, unit, optional gear, optional flat 270° arc for
 * `speed / maxSpeed` with tick marks and a redline, and an optional fuel bar. Memoised.
 */
export const HudSpeedometer = /* @__PURE__ */ memo(HudSpeedometerImpl);
