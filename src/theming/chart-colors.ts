// The categorical series palette (`--pui-chart-1` … `--pui-chart-8`). Pure strings, safe on the server and usable
// without recharts (`@pre_scripts/preui/chart` re-exports them).

/** How many categorical series colours the palette has (`--pui-chart-1` … `--pui-chart-8`). */
export const CHART_COLOR_COUNT = 8;

/**
 * The categorical series colours as CSS colour values, in order — ready for `fill`, `stroke` or a `ChartConfig`
 * colour. They follow the theme (the first one is the accent, the last one neutral) and carry no meaning, unlike
 * `--pui-chart-positive` / `-negative`. The Tailwind classes are `bg-pui-chart-1` … `text-pui-chart-8`.
 */
export const chartColors: readonly string[] = [
  "hsl(var(--pui-chart-1))",
  "hsl(var(--pui-chart-2))",
  "hsl(var(--pui-chart-3))",
  "hsl(var(--pui-chart-4))",
  "hsl(var(--pui-chart-5))",
  "hsl(var(--pui-chart-6))",
  "hsl(var(--pui-chart-7))",
  "hsl(var(--pui-chart-8))",
];

/**
 * The categorical series colour for a series index (0-based), wrapping around after eight — so a chart with more
 * categories than colours never gets an empty fill.
 *
 * ```tsx
 * <Pie data={rows} dataKey="value" nameKey="type">
 *   {rows.map((row, index) => <Cell key={row.type} fill={chartColor(index)} />)}
 * </Pie>
 * ```
 *
 * With an `alpha` (0–1) the colour comes back translucent, e.g. for an area under its line.
 */
export function chartColor(index: number, alpha?: number): string {
  const slot = ((Math.trunc(index) % CHART_COLOR_COUNT) + CHART_COLOR_COUNT) % CHART_COLOR_COUNT;
  const variable = `var(--pui-chart-${slot + 1})`;
  return alpha === undefined ? `hsl(${variable})` : `hsl(${variable} / ${alpha})`;
}
