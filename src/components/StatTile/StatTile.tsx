import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";

/** Colour of the icon chip, the trend arrow and the hint line. The tile itself stays neutral. */
export type StatTileTone = "neutral" | "primary" | "positive" | "negative" | "warning" | "info";

const chipClasses: Record<StatTileTone, string> = {
  neutral: "bg-pui-muted text-pui-muted-foreground",
  primary: "bg-pui-primary/tint text-pui-primary",
  positive: "bg-pui-positive/tint text-pui-positive",
  negative: "bg-pui-negative/tint text-pui-negative",
  warning: "bg-pui-warning/tint text-pui-warning",
  info: "bg-pui-info/tint text-pui-info",
};

const hintClasses: Record<StatTileTone, string> = {
  neutral: "text-pui-muted-foreground",
  primary: "text-pui-primary",
  positive: "text-pui-positive",
  negative: "text-pui-negative",
  warning: "text-pui-warning",
  info: "text-pui-info",
};

/** Direction of the change the `hint` describes. */
export type StatTileTrend = "up" | "down" | "flat";

export interface StatTileTrendLabels {
  up: string;
  down: string;
  flat: string;
}

/** English defaults for the screen-reader text of the trend arrow. */
export const defaultStatTileTrendLabels: StatTileTrendLabels = {
  up: "Up",
  down: "Down",
  flat: "Unchanged",
};

export interface StatTileProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** What the figure is, above the value. */
  label: ReactNode;
  /** The figure itself. */
  value: ReactNode;
  /** A small line under the value, e.g. "+12 % vs. the last 30 days". Its height is always reserved. */
  hint?: ReactNode;
  /** @default "neutral" */
  tone?: StatTileTone;
  /** Icon in the tinted chip left of the text. */
  icon?: ReactNode;
  /** Arrow before the hint. */
  trend?: StatTileTrend;
  /** Screen-reader text of the arrow. @default { up: "Up", down: "Down", flat: "Unchanged" } */
  trendLabels?: StatTileTrendLabels;
  /** Keep the hint line's height when there is no hint, so a grid of tiles never jumps. @default true */
  reserveHint?: boolean;
  /** Monospace value, for ids and account numbers. */
  mono?: boolean;
  /** Free slot at the end of the tile, e.g. a small chart (`@pre_scripts/preui/chart`). Give it its own size. */
  sparkline?: ReactNode;
  /** Free slot after the sparkline, e.g. an icon button that opens the details. */
  action?: ReactNode;
}

/**
 * One key figure as a tile: label, value and a hint line whose height is always reserved, so a grid of tiles never
 * jumps when one hint appears. Flat and bordered like every other panel; only the icon chip, the arrow and the hint
 * carry the `tone`.
 *
 * ```tsx
 * <StatTile label="Balance" value="$ 12,480" hint="+12 % vs. the last 30 days" trend="up" tone="positive" />
 * ```
 */
export const StatTile = /* @__PURE__ */ forwardRef<HTMLDivElement, StatTileProps>(function StatTile(
  {
    label,
    value,
    hint,
    tone = "neutral",
    icon,
    trend,
    trendLabels = defaultStatTileTrendLabels,
    reserveHint = true,
    mono = false,
    sparkline,
    action,
    className,
    ...props
  },
  ref,
) {
  const ArrowUp = useIcon("arrowUp");
  const ArrowDown = useIcon("arrowDown");
  const Minus = useIcon("minus");
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const showHint = hint != null || trend != null || reserveHint;

  return (
    <div
      ref={ref}
      data-slot="stat-tile"
      data-variant={tone}
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-pui border border-pui-border bg-pui-card p-4 text-pui-card-foreground",
        className,
      )}
      {...props}
    >
      {icon != null && (
        <span
          data-slot="stat-tile-icon"
          aria-hidden="true"
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-pui-md [&>svg]:size-4",
            chipClasses[tone],
          )}
        >
          {icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-slot="stat-tile-label" className="truncate text-xs font-medium text-pui-muted-foreground">
          {label}
        </span>
        <span
          data-slot="stat-tile-value"
          className={cn("truncate text-lg font-semibold tabular-nums text-pui-foreground", mono && "font-mono text-base")}
        >
          {value}
        </span>
        {showHint && (
          <span
            data-slot="stat-tile-hint"
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs",
              reserveHint && "min-h-5",
              hintClasses[tone],
            )}
          >
            {trend != null && (
              <>
                <TrendIcon aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="sr-only">{trendLabels[trend]}</span>
              </>
            )}
            {hint != null && <span className="min-w-0 break-words">{hint}</span>}
          </span>
        )}
      </div>
      {sparkline != null && (
        <span data-slot="stat-tile-sparkline" className="shrink-0 self-center">
          {sparkline}
        </span>
      )}
      {action != null && (
        <span data-slot="stat-tile-action" className="shrink-0">
          {action}
        </span>
      )}
    </div>
  );
});
