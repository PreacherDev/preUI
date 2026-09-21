import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Legend as RechartsLegend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  type LegendPayload,
  type TooltipPayload,
  type TooltipProps,
} from "recharts";
import { cn } from "../../utils/cn";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/**
 * Theme name for per-theme series colours: `"default"` applies everywhere, any other name applies under
 * `[data-theme="<name>"]` (your own themes, defined with preUI tokens).
 */
export type ChartTheme = "default" | (string & {});

/** Ancestor selector that activates a theme's colours. */
const themeSelector = (theme: string) => (theme === "default" ? "" : `[data-theme="${theme}"]`);

/**
 * Per-series configuration, keyed by `dataKey` (or `nameKey` value).
 * Every key with a color becomes a CSS variable `--color-<key>` inside the container,
 * so series can use `fill="var(--color-einnahmen)"`.
 */
export type ChartConfig = Record<
  string,
  {
    label?: ReactNode;
    icon?: ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: { default: string } & Partial<Record<string, string>> }
  )
>;

interface ChartContextValue {
  config: ChartConfig;
}

const ChartContext = createContext<ChartContextValue | null>(null);

/** Reads the `config` of the surrounding `ChartContainer`. */
export function useChart(): ChartContextValue {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

// ---------------------------------------------------------------------------
// Container + style
// ---------------------------------------------------------------------------

/** Size used before ResizeObserver reports the real one (avoids recharts' "width(-1)" warning). */
const INITIAL_DIMENSION = { width: 320, height: 180 };

export interface ChartContainerProps extends ComponentPropsWithoutRef<"div"> {
  config: ChartConfig;
  /** A single recharts chart (`BarChart`, `LineChart` …). */
  children: ReactNode;
}

/** Wraps a recharts chart: responsive sizing, `--color-<key>` variables, token styling of recharts internals. */
export const ChartContainer = forwardRef<HTMLDivElement, ChartContainerProps>(function ChartContainer(
  { id, className, children, config, ...props },
  ref,
) {
  const uniqueId = useId();
  const chartId = `chart-${(id ?? uniqueId).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const contextValue = useMemo(() => ({ config }), [config]);

  return (
    <ChartContext.Provider value={contextValue}>
      <div
        ref={ref}
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          [
            "flex aspect-video justify-center text-xs text-pui-foreground",
            // Axes: 11px labels in the axis color, hairlines in the grid color. The `-tick-value` class sits on the
            // <text> itself (recharts 3 wraps cartesian labels in `…-tick-label` groups, not `…-tick`).
            "[&_.recharts-cartesian-axis-tick-value]:fill-pui-chart-axis [&_.recharts-cartesian-axis-tick-value]:text-[11px]",
            "[&_.recharts-polar-angle-axis-tick-value]:fill-pui-chart-axis [&_.recharts-polar-angle-axis-tick-value]:text-[11px]",
            "[&_.recharts-polar-radius-axis-tick-value]:fill-pui-chart-axis [&_.recharts-polar-radius-axis-tick-value]:text-[11px]",
            "[&_.recharts-cartesian-axis-line[stroke='#666']]:stroke-pui-chart-grid [&_.recharts-cartesian-axis-tick-line[stroke='#666']]:stroke-pui-chart-grid",
            "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-pui-chart-grid",
            "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-pui-chart-grid",
            "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-pui-border",
            "[&_.recharts-polar-radius-axis_[stroke='#ccc']]:stroke-pui-chart-grid",
            // Hover cursor + active points.
            "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-pui-border",
            "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-pui-accent/50",
            "[&_.recharts-sector.recharts-tooltip-cursor]:fill-pui-accent/50",
            "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
            "[&_.recharts-sector[stroke='#fff']]:stroke-pui-card",
            // Tracks.
            "[&_.recharts-radial-bar-background-sector]:fill-pui-muted",
            "[&_.recharts-bar-background-rectangle]:fill-pui-muted",
            // No focus outlines on SVG internals.
            "[&_.recharts-layer]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none",
          ],
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <ResponsiveContainer initialDimension={INITIAL_DIMENSION}>{children}</ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});

export interface ChartStyleProps {
  /** The container's `data-chart` value. */
  id: string;
  config: ChartConfig;
}

/** Emits `--color-<key>` variables per theme for one chart container. */
export function ChartStyle({ id, config }: ChartStyleProps) {
  const colorConfig = Object.entries(config).filter(([, item]) => item.theme || item.color);
  if (!colorConfig.length) return null;

  // "default" first, then every other theme name used in the config.
  const themes = [
    "default",
    ...new Set(colorConfig.flatMap(([, item]) => Object.keys(item.theme ?? {}).filter((name) => name !== "default"))),
  ];
  const css = themes
    .map((theme) => {
      const declarations = colorConfig
        .map(([key, item]) => {
          const color = item.theme?.[theme] ?? (theme === "default" ? item.color : undefined);
          return color ? `  --color-${key}: ${color};` : null;
        })
        .filter(Boolean);
      if (!declarations.length) return null;
      const selector = `${themeSelector(theme)} [data-chart="${id}"]`.trim();
      return `${selector} {\n${declarations.join("\n")}\n}`;
    })
    .filter(Boolean)
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

export const ChartTooltip = RechartsTooltip;

type TooltipFormatter = NonNullable<TooltipProps["formatter"]>;
type TooltipLabelFormatter = NonNullable<TooltipProps["labelFormatter"]>;

export interface ChartTooltipContentProps {
  /** Set by recharts. */
  active?: boolean;
  /** Set by recharts. */
  payload?: TooltipPayload;
  /** Set by recharts: the category of the hovered point. */
  label?: ReactNode;
  className?: string;
  labelClassName?: string;
  /** Formats the label. Receives the config label (or raw label) and the whole payload. */
  labelFormatter?: TooltipLabelFormatter;
  /**
   * Formats one row. Returning `[value, name]` (recharts style) keeps the standard row and only replaces
   * value/name (`name` may be `undefined` to keep the config label); any other return value replaces the
   * whole row content (shadcn style).
   */
  formatter?: TooltipFormatter;
  /** Overrides the indicator color of every row. */
  color?: string;
  indicator?: "dot" | "line" | "dashed";
  hideLabel?: boolean;
  hideIndicator?: boolean;
  /** Payload key whose value selects the config entry for a row (default: `name`/`dataKey`). */
  nameKey?: string;
  /** Config key (or payload key) for the tooltip label. */
  labelKey?: string;
}

function formatValue(value: unknown): ReactNode {
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value)) return value.map((part) => formatValue(part)).join(" – ");
  if (typeof value === "string") return value;
  return null;
}

/** Tooltip body in the handoff look (ChartTooltip): tooltip surface, colored indicators, tabular values. */
export const ChartTooltipContent = forwardRef<HTMLDivElement, ChartTooltipContentProps>(function ChartTooltipContent(
  {
    active,
    payload,
    label,
    className,
    labelClassName,
    labelFormatter,
    formatter,
    color,
    indicator = "dot",
    hideLabel = false,
    hideIndicator = false,
    nameKey,
    labelKey,
  },
  ref,
) {
  const { config } = useChart();

  const tooltipLabel = useMemo(() => {
    if (hideLabel || !payload?.length) return null;
    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value: ReactNode =
      !labelKey && (typeof label === "string" || typeof label === "number")
        ? (config[String(label)]?.label ?? label)
        : itemConfig?.label;
    // Handoff ChartTooltip: eyebrow title in the dimmed tooltip foreground.
    const labelClasses = cn(
      "text-pui-eyebrow font-semibold uppercase text-pui-tooltip-foreground/70",
      labelClassName,
    );

    if (labelFormatter) {
      return (
        <div data-slot="chart-tooltip-label" className={labelClasses}>
          {labelFormatter(value, payload)}
        </div>
      );
    }
    if (value === undefined || value === null || value === "") return null;
    return (
      <div data-slot="chart-tooltip-label" className={labelClasses}>
        {value}
      </div>
    );
  }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

  if (!active || !payload?.length) return null;

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      ref={ref}
      data-slot="chart-tooltip"
      className={cn(
        "grid min-w-40 items-start gap-1.5 rounded-pui-md bg-pui-tooltip px-3 py-2 text-xs font-medium text-pui-tooltip-foreground shadow-pui-tooltip",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor: string | undefined =
              color ?? (item.payload as { fill?: string } | undefined)?.fill ?? item.color ?? item.fill;

            let displayName: ReactNode = itemConfig?.label ?? item.name;
            let displayValue: ReactNode = formatValue(item.value);
            let custom: ReactNode = null;
            if (formatter && item.value !== undefined && item.name !== undefined) {
              const result = formatter(item.value, item.name, item, index, payload);
              if (Array.isArray(result)) {
                displayValue = result[0];
                if (result[1] !== undefined && result[1] !== null) displayName = result[1];
              } else {
                custom = result;
              }
            }

            return (
              <div
                key={`${String(item.dataKey ?? item.name ?? "")}-${index}`}
                data-slot="chart-tooltip-item"
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:size-2.5 [&>svg]:text-pui-tooltip-foreground/70",
                  indicator === "dot" && "items-center",
                )}
              >
                {custom !== null ? (
                  custom
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          data-slot="chart-indicator"
                          className={cn("shrink-0", {
                            "size-2 rounded-full": indicator === "dot",
                            "w-1 rounded-[2px]": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                          })}
                          style={
                            {
                              backgroundColor: indicator === "dashed" ? "transparent" : indicatorColor,
                              borderColor: indicatorColor,
                            } satisfies CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between gap-4 leading-none",
                        nestLabel ? "items-end" : "items-center",
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span data-slot="chart-tooltip-name" className="text-pui-tooltip-foreground/70">
                          {displayName}
                        </span>
                      </div>
                      {displayValue !== null && displayValue !== undefined && displayValue !== "" && (
                        <span data-slot="chart-tooltip-value" className="font-semibold tabular-nums text-pui-tooltip-foreground">
                          {displayValue}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

export const ChartLegend = RechartsLegend;

export interface ChartLegendContentProps extends ComponentPropsWithoutRef<"div"> {
  /** Set by recharts. */
  payload?: ReadonlyArray<LegendPayload>;
  /** Set by recharts; controls the spacing to the chart. */
  verticalAlign?: "top" | "bottom" | "middle";
  hideIcon?: boolean;
  /** Payload key whose value selects the config entry (e.g. the category key of a pie). */
  nameKey?: string;
}

/** Legend row with colored swatches and config labels, placed below multi-series charts. */
export const ChartLegendContent = forwardRef<ComponentRef<"div">, ChartLegendContentProps>(function ChartLegendContent(
  { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey, ...props },
  ref,
) {
  const { config } = useChart();
  if (!payload?.length) return null;

  // Recharts clones the element with its own legend props; only pass real DOM attributes on.
  const domProps = pickDomProps(props);

  return (
    <div
      ref={ref}
      data-slot="chart-legend"
      className={cn(
        "flex flex-wrap items-center justify-center gap-4 text-xs text-pui-muted-foreground",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
      {...domProps}
    >
      {sortByConfigOrder(
        config,
        payload.filter((item) => item.type !== "none"),
        (item) => getPayloadConfigKey(config, item, `${nameKey ?? item.dataKey ?? "value"}`),
      ).map((item, index) => {
        const key = `${nameKey ?? item.dataKey ?? "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);
        return (
          <div
            key={`${String(item.value ?? "")}-${index}`}
            data-slot="chart-legend-item"
            className="flex items-center gap-1.5 [&>svg]:size-3 [&>svg]:text-pui-muted-foreground"
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                data-slot="chart-legend-swatch"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            {itemConfig?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Keeps `id`, `style`, `data-*` and `aria-*`; drops recharts' legend props (iconSize, layout, align …). */
function pickDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) {
    if (name === "id" || name === "style" || name === "role" || name.startsWith("data-") || name.startsWith("aria-")) {
      result[name] = value;
    }
  }
  return result;
}

/**
 * Orders legend items like the config (recharts 3 sorts legend payloads alphabetically by default, which
 * breaks the series order). Items without a config entry keep their relative order at the end.
 */
function sortByConfigOrder<T>(config: ChartConfig, items: T[], getKey: (item: T) => string | undefined): T[] {
  const order = Object.keys(config);
  const rank = (item: T) => {
    const key = getKey(item);
    const index = key === undefined ? -1 : order.indexOf(key);
    return index === -1 ? order.length : index;
  };
  return items
    .map((item, index) => ({ item, index, rank: rank(item) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item);
}

/** The config key for a tooltip/legend item (see `getPayloadConfigFromPayload`), or `undefined`. */
function getPayloadConfigKey(config: ChartConfig, payload: unknown, key: string): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined;

  let configLabelKey = key;
  const direct = (payload as Record<string, unknown>)[key];
  if (typeof direct === "string") {
    configLabelKey = direct;
  } else if (payloadPayload && typeof payloadPayload[key] === "string") {
    configLabelKey = payloadPayload[key] as string;
  }

  if (configLabelKey in config) return configLabelKey;
  return key in config ? key : undefined;
}

/** Finds the config entry for a tooltip/legend item: via `item[key]`, `item.payload[key]` or `key` itself. */
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  const configKey = getPayloadConfigKey(config, payload, key);
  return configKey === undefined ? undefined : config[configKey];
}
