import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Bar, BarChart, XAxis } from "recharts";
import type { TooltipPayload } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent,
  useChart,
  type ChartConfig,
} from "./Chart";

// --- jsdom has no layout: give ResponsiveContainer a size to measure. ---------------------------------------
const WIDTH = 640;
const HEIGHT = 360;

class ResizeObserverMock {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const entry = { target, contentRect: { width: WIDTH, height: HEIGHT } } as unknown as ResizeObserverEntry;
    this.callback([entry], this as unknown as ResizeObserver);
  }
  unobserve() {}
  disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver;
const sizeProps = ["clientWidth", "clientHeight", "offsetWidth", "offsetHeight"] as const;
const originalDescriptors = sizeProps.map((prop) => Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop));
const originalRect = HTMLElement.prototype.getBoundingClientRect;

beforeAll(() => {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  for (const prop of sizeProps) {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get: () => (prop.endsWith("Width") ? WIDTH : HEIGHT),
    });
  }
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, left: 0, right: WIDTH, bottom: HEIGHT, width: WIDTH, height: HEIGHT, toJSON() {} }) as DOMRect;
});

afterAll(() => {
  globalThis.ResizeObserver = originalResizeObserver;
  sizeProps.forEach((prop, index) => {
    const descriptor = originalDescriptors[index];
    if (descriptor) Object.defineProperty(HTMLElement.prototype, prop, descriptor);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
  });
  HTMLElement.prototype.getBoundingClientRect = originalRect;
});

// --- Fixtures -----------------------------------------------------------------------------------------------
const config = {
  einnahmen: { label: "Einnahmen", color: "hsl(var(--pui-chart-positive))" },
  ausgaben: { label: "Ausgaben", color: "hsl(var(--pui-chart-negative))" },
} satisfies ChartConfig;

const data = [
  { tag: "Mo", einnahmen: 3100, ausgaben: 1200 },
  { tag: "Di", einnahmen: 2400, ausgaben: 1800 },
];

function entry(overrides: Partial<TooltipPayload[number]>): TooltipPayload[number] {
  return { graphicalItemId: "item", ...overrides };
}

const payload: TooltipPayload = [
  entry({ dataKey: "einnahmen", name: "einnahmen", value: 3100, color: "hsl(var(--color-einnahmen))", payload: data[0] }),
  entry({ dataKey: "ausgaben", name: "ausgaben", value: 1200, color: "rgb(255, 0, 0)", payload: data[0] }),
];

function WithConfig({ children, chartConfig = config }: { children: ReactNode; chartConfig?: ChartConfig }) {
  return (
    <ChartContainer config={chartConfig} data-testid="chart">
      {children}
    </ChartContainer>
  );
}

function styleText(container: HTMLElement) {
  return container.querySelector("style")?.innerHTML ?? "";
}

// --- ChartContainer ------------------------------------------------------------------------------------------
describe("ChartContainer", () => {
  it("renders a responsive recharts chart with a data-chart id and merged classes", async () => {
    const { container } = render(
      <ChartContainer config={config} className="h-64 aspect-auto" data-testid="chart">
        <BarChart data={data}>
          <XAxis dataKey="tag" interval={0} />
          <Bar dataKey="einnahmen" fill="var(--color-einnahmen)" isAnimationActive={false} />
        </BarChart>
      </ChartContainer>,
    );
    const chart = screen.getByTestId("chart");
    expect(chart).toHaveAttribute("data-slot", "chart");
    expect(chart.getAttribute("data-chart")).toMatch(/^chart-[a-zA-Z0-9_-]+$/);
    expect(chart).toHaveClass("flex", "h-64", "aspect-auto", "text-xs");
    expect(chart).not.toHaveClass("aspect-video");
    await waitFor(() => expect(container.querySelector(".recharts-surface")).toBeInTheDocument());
    const ticks = Array.from(container.querySelectorAll(".recharts-cartesian-axis-tick-value"), (tick) => tick.textContent);
    expect(ticks).toEqual(["Mo", "Di"]);
  });

  it("targets the axis label selectors recharts 3 actually renders (11px, axis color)", async () => {
    const { container } = render(
      <ChartContainer config={config} data-testid="chart">
        <BarChart data={data}>
          <XAxis dataKey="tag" interval={0} />
          <Bar dataKey="einnahmen" fill="var(--color-einnahmen)" isAnimationActive={false} />
        </BarChart>
      </ChartContainer>,
    );
    await waitFor(() => expect(container.querySelector(".recharts-cartesian-axis-tick-value")).toBeInTheDocument());
    const classes = screen.getByTestId("chart").className.split(/\s+/);
    // Every tick-label text-size variant (the arbitrary 11px selectors) must hit the rendered tick labels.
    const selectors = classes
      .filter((name) => name.endsWith(":text-[11px]"))
      .map((name) => name.slice(3, name.indexOf("]:")).replace(/_/g, " "));
    const cartesian = selectors.find((selector) => selector.includes("cartesian"));
    expect(cartesian).toBeDefined();
    const labels = container.querySelectorAll(cartesian!);
    expect(labels).toHaveLength(2);
    expect(labels[0]!.tagName.toLowerCase()).toBe("text");
    expect(classes).toContain(`[&_${cartesian!.replace(/ /g, "_")}]:fill-pui-chart-axis`);
  });

  it("uses aspect-video by default", () => {
    render(<WithConfig>{null}</WithConfig>);
    expect(screen.getByTestId("chart")).toHaveClass("aspect-video");
  });

  it("injects a --color-<key> variable per configured series, scoped to the chart", () => {
    const { container } = render(
      <ChartContainer config={config} id="kasse" data-testid="chart">
        {null}
      </ChartContainer>,
    );
    expect(screen.getByTestId("chart")).toHaveAttribute("data-chart", "chart-kasse");
    const css = styleText(container);
    expect(css).toContain('[data-chart="chart-kasse"] {');
    expect(css).toContain("--color-einnahmen: hsl(var(--pui-chart-positive));");
    expect(css).toContain("--color-ausgaben: hsl(var(--pui-chart-negative));");
    // Plain colors apply to every theme via the unprefixed rule only.
    expect(css).not.toContain("data-theme");
  });

  it("emits per-theme colors for theme configs", () => {
    const themed = {
      umsatz: {
        label: "Umsatz",
        theme: { default: "hsl(217 91% 60%)", brand: "hsl(292 84% 66%)", mono: "hsl(0 0% 88%)" },
      },
      kosten: { label: "Kosten", theme: { default: "hsl(0 78% 62%)" } },
    } satisfies ChartConfig;
    const { container } = render(
      <ChartContainer config={themed} id="t">
        {null}
      </ChartContainer>,
    );
    const css = styleText(container);
    expect(css).toMatch(/^\[data-chart="chart-t"\] \{[^}]*--color-umsatz: hsl\(217 91% 60%\);[^}]*--color-kosten: hsl\(0 78% 62%\);/);
    expect(css).toMatch(/\[data-theme="brand"\] \[data-chart="chart-t"\] \{\s*--color-umsatz: hsl\(292 84% 66%\);\s*\}/);
    expect(css).toMatch(/\[data-theme="mono"\] \[data-chart="chart-t"\] \{\s*--color-umsatz: hsl\(0 0% 88%\);\s*\}/);
  });

  it("renders no style tag when no series has a color", () => {
    const { container } = render(<WithConfig chartConfig={{ besucher: { label: "Besucher" } }}>{null}</WithConfig>);
    expect(container.querySelector("style")).toBeNull();
  });

  it("renders a legend with config labels inside a real chart", async () => {
    render(
      <ChartContainer config={config}>
        <BarChart data={data}>
          <Bar dataKey="einnahmen" fill="var(--color-einnahmen)" isAnimationActive={false} />
          <Bar dataKey="ausgaben" fill="var(--color-ausgaben)" isAnimationActive={false} />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>,
    );
    expect(await screen.findByText("Einnahmen")).toBeInTheDocument();
    expect(screen.getByText("Ausgaben")).toBeInTheDocument();
  });
});

// --- ChartTooltipContent -------------------------------------------------------------------------------------
describe("ChartTooltipContent", () => {
  it("renders nothing when inactive or without payload", () => {
    const { container } = render(
      <WithConfig>
        <div data-testid="slot">
          <ChartTooltipContent active={false} payload={payload} label="Mo" />
          <ChartTooltipContent active payload={[]} label="Mo" />
        </div>
      </WithConfig>,
    );
    expect(container.querySelector("[data-testid=slot]")).toBeEmptyDOMElement();
  });

  it("shows the label, config names and formatted values on the tooltip surface (handoff ChartTooltip)", () => {
    render(
      <WithConfig>
        <ChartTooltipContent active payload={payload} label="Mo" className="w-48" />
      </WithConfig>,
    );
    expect(screen.getByText("Mo")).toBeInTheDocument();
    expect(screen.getByText("Einnahmen")).toBeInTheDocument();
    expect(screen.getByText("Ausgaben")).toBeInTheDocument();
    expect(screen.getByText((3100).toLocaleString("en-US"))).toHaveClass("tabular-nums", "font-semibold");
    const surface = screen.getByText("Mo").parentElement!;
    expect(surface).toHaveClass(
      "bg-pui-tooltip",
      "text-pui-tooltip-foreground",
      "rounded-pui-md",
      "shadow-pui-tooltip",
      "text-xs",
      "w-48",
    );
    expect(surface).not.toHaveClass("bg-pui-popover", "border");
    // Eyebrow title and dimmed names, like the handoff tooltip.
    expect(screen.getByText("Mo")).toHaveClass("text-pui-eyebrow", "uppercase", "text-pui-tooltip-foreground/70");
    expect(screen.getByText("Einnahmen")).toHaveClass("text-pui-tooltip-foreground/70");
  });

  it("colors dot indicators from the payload, or from the color prop", () => {
    const { container, rerender } = render(
      <WithConfig>
        <ChartTooltipContent active payload={payload} label="Mo" />
      </WithConfig>,
    );
    const dots = container.querySelectorAll<HTMLElement>("[data-slot=chart-indicator]");
    expect(dots).toHaveLength(2);
    expect(dots[0]).toHaveClass("rounded-full", "size-2");
    expect(dots[1].style.backgroundColor).toBe("rgb(255, 0, 0)");

    rerender(
      <WithConfig>
        <ChartTooltipContent active payload={payload} label="Mo" color="rgb(0, 0, 255)" />
      </WithConfig>,
    );
    const recolored = container.querySelectorAll<HTMLElement>("[data-slot=chart-indicator]");
    expect(recolored[1].style.backgroundColor).toBe("rgb(0, 0, 255)");
  });

  it("supports line and dashed indicators and hides them on request", () => {
    const { container, rerender } = render(
      <WithConfig>
        <ChartTooltipContent active payload={payload} label="Mo" indicator="line" />
      </WithConfig>,
    );
    expect(container.querySelector("[data-slot=chart-indicator]")).toHaveClass("w-1");

    rerender(
      <WithConfig>
        <ChartTooltipContent active payload={payload} label="Mo" indicator="dashed" />
      </WithConfig>,
    );
    expect(container.querySelector("[data-slot=chart-indicator]")).toHaveClass("border-dashed");

    rerender(
      <WithConfig>
        <ChartTooltipContent active payload={payload} label="Mo" hideIndicator />
      </WithConfig>,
    );
    expect(container.querySelector("[data-slot=chart-indicator]")).toBeNull();
  });

  it("hides or formats the label", () => {
    const { rerender } = render(
      <WithConfig>
        <ChartTooltipContent active payload={payload} label="Mo" hideLabel />
      </WithConfig>,
    );
    expect(screen.queryByText("Mo")).not.toBeInTheDocument();

    rerender(
      <WithConfig>
        <ChartTooltipContent
          active
          payload={payload}
          label="Mo"
          labelFormatter={(value, items) => `${String(value)}, ${items.length} Werte`}
        />
      </WithConfig>,
    );
    expect(screen.getByText("Mo, 2 Werte")).toBeInTheDocument();
  });

  it("resolves the label through the config via labelKey", () => {
    render(
      <WithConfig chartConfig={{ ...config, besucher: { label: "Besucher gesamt" } }}>
        <ChartTooltipContent active payload={payload} label="Mo" labelKey="besucher" />
      </WithConfig>,
    );
    expect(screen.getByText("Besucher gesamt")).toBeInTheDocument();
    expect(screen.queryByText("Mo")).not.toBeInTheDocument();
  });

  it("formats values with a recharts-style [value, name] formatter", () => {
    const money = (value: number) => `$${value.toLocaleString("de-DE")}`;
    render(
      <WithConfig>
        <ChartTooltipContent
          active
          payload={payload}
          label="Mo"
          formatter={(value, name) => [money(Number(value)), name === "ausgaben" ? "Kosten" : undefined]}
        />
      </WithConfig>,
    );
    expect(screen.getByText("$3.100")).toBeInTheDocument();
    expect(screen.getByText("$1.200")).toBeInTheDocument();
    expect(screen.getByText("Einnahmen")).toBeInTheDocument();
    expect(screen.getByText("Kosten")).toBeInTheDocument();
  });

  it("replaces the whole row with a shadcn-style formatter", () => {
    const { container } = render(
      <WithConfig>
        <ChartTooltipContent
          active
          payload={payload}
          label="Mo"
          formatter={(value, name, item, index, all) => (
            <span data-testid={`row-${index}`}>{`${String(name)}=${String(value)} (${item.dataKey}, ${all.length})`}</span>
          )}
        />
      </WithConfig>,
    );
    expect(screen.getByTestId("row-0")).toHaveTextContent("einnahmen=3100 (einnahmen, 2)");
    expect(container.querySelector("[data-slot=chart-indicator]")).toBeNull();
  });

  it("picks the config entry by nameKey from the data row", () => {
    const pieConfig = {
      lager: { label: "Lager", color: "hsl(var(--pui-info))" },
    } satisfies ChartConfig;
    const piePayload: TooltipPayload = [
      entry({ name: "Lager", dataKey: "anteil", value: 40, payload: { kategorie: "lager", anteil: 40, fill: "rgb(1, 2, 3)" } }),
    ];
    const { container } = render(
      <WithConfig chartConfig={pieConfig}>
        <ChartTooltipContent active payload={piePayload} nameKey="kategorie" hideLabel />
      </WithConfig>,
    );
    expect(screen.getByText("Lager")).toBeInTheDocument();
    expect(container.querySelector<HTMLElement>("[data-slot=chart-indicator]")!.style.backgroundColor).toBe(
      "rgb(1, 2, 3)",
    );
  });
});

// --- ChartLegendContent --------------------------------------------------------------------------------------
describe("ChartLegendContent", () => {
  const legendPayload = [
    { value: "einnahmen", dataKey: "einnahmen", color: "rgb(0, 128, 0)", type: "rect" as const },
    { value: "ausgaben", dataKey: "ausgaben", color: "rgb(255, 0, 0)", type: "rect" as const },
  ];

  it("renders config labels with colored swatches", () => {
    const { container } = render(
      <WithConfig>
        <ChartLegendContent payload={legendPayload} className="justify-start" />
      </WithConfig>,
    );
    expect(screen.getByText("Einnahmen")).toBeInTheDocument();
    expect(screen.getByText("Ausgaben")).toBeInTheDocument();
    const swatches = container.querySelectorAll<HTMLElement>("[data-slot=chart-legend-swatch]");
    expect(swatches).toHaveLength(2);
    expect(swatches[1].style.backgroundColor).toBe("rgb(255, 0, 0)");
    const root = screen.getByText("Einnahmen").parentElement!;
    expect(root).toHaveClass("pt-3", "justify-start", "text-pui-muted-foreground");
    expect(root).not.toHaveClass("justify-center");
  });

  it("keeps the config order even when recharts hands over an alphabetically sorted payload", () => {
    render(
      <WithConfig>
        <ChartLegendContent payload={[...legendPayload].reverse()} />
      </WithConfig>,
    );
    const root = screen.getByText("Einnahmen").parentElement!;
    expect(Array.from(root.children, (item) => item.textContent)).toEqual(["Einnahmen", "Ausgaben"]);
  });

  it("orders pie legends by the nameKey config order, unknown items last", () => {
    const pieConfig = {
      lebensmittel: { label: "Lebensmittel", color: "red" },
      baustoffe: { label: "Baustoffe", color: "blue" },
    } satisfies ChartConfig;
    const piePayload = [
      { value: "sonstiges", color: "gray", type: "rect" as const, payload: { kategorie: "sonstiges" } },
      { value: "baustoffe", color: "blue", type: "rect" as const, payload: { kategorie: "baustoffe" } },
      { value: "lebensmittel", color: "red", type: "rect" as const, payload: { kategorie: "lebensmittel" } },
    ];
    render(
      <WithConfig chartConfig={pieConfig}>
        <ChartLegendContent payload={piePayload} nameKey="kategorie" />
      </WithConfig>,
    );
    const root = screen.getByText("Lebensmittel").parentElement!;
    expect(Array.from(root.children, (item) => item.textContent)).toEqual(["Lebensmittel", "Baustoffe", "sonstiges"]);
  });

  it("spaces itself below the chart when verticalAlign is top", () => {
    render(
      <WithConfig>
        <ChartLegendContent payload={legendPayload} verticalAlign="top" />
      </WithConfig>,
    );
    expect(screen.getByText("Einnahmen").parentElement).toHaveClass("pb-3");
  });

  it("shows config icons unless hideIcon is set", () => {
    const Icon = () => <svg data-testid="icon" />;
    const withIcon = { ...config, einnahmen: { ...config.einnahmen, icon: Icon } } satisfies ChartConfig;
    const { rerender } = render(
      <WithConfig chartConfig={withIcon}>
        <ChartLegendContent payload={legendPayload} />
      </WithConfig>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    rerender(
      <WithConfig chartConfig={withIcon}>
        <ChartLegendContent payload={legendPayload} hideIcon />
      </WithConfig>,
    );
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });

  it("resolves labels via nameKey from the item payload", () => {
    render(
      <WithConfig chartConfig={{ lager: { label: "Lager", color: "red" } }}>
        <ChartLegendContent
          nameKey="kategorie"
          payload={[{ value: "lager", color: "red", payload: { kategorie: "lager", anteil: 40 } }]}
        />
      </WithConfig>,
    );
    expect(screen.getByText("Lager")).toBeInTheDocument();
  });

  it("renders nothing without payload", () => {
    const { container } = render(
      <WithConfig>
        <div data-testid="slot">
          <ChartLegendContent payload={[]} />
        </div>
      </WithConfig>,
    );
    expect(container.querySelector("[data-testid=slot]")).toBeEmptyDOMElement();
  });
});

// --- useChart ------------------------------------------------------------------------------------------------
describe("useChart", () => {
  it("throws outside a ChartContainer", () => {
    function Probe() {
      useChart();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ChartContainer/);
    spy.mockRestore();
  });
});

describe("Chart slots", () => {
  it("marks tooltip and legend parts", () => {
    const { container } = render(
      <WithConfig>
        <ChartTooltipContent active payload={payload} label="Mo" />
        <ChartLegendContent payload={[{ value: "einnahmen", dataKey: "einnahmen", color: "red", type: "rect" }]} />
      </WithConfig>,
    );
    for (const slot of [
      "chart-tooltip",
      "chart-tooltip-label",
      "chart-tooltip-item",
      "chart-tooltip-name",
      "chart-tooltip-value",
      "chart-indicator",
      "chart-legend",
      "chart-legend-item",
      "chart-legend-swatch",
    ]) {
      expect(container.querySelector(`[data-slot="${slot}"]`), slot).toBeInTheDocument();
    }
  });
});
