import { beforeAll, describe, expect, it } from "vitest";
import { DatePicker, DateRangePicker } from "./components/Calendar";
import { CodeEditor } from "./components/Code";
import { MarkdownEditor, RichTextEditor } from "./components/Editor";
import { Meter, MeterValue } from "./components/Meter";
import { NumberField } from "./components/NumberField";
import { Progress, ProgressValue } from "./components/Progress";
import { ScrollArea } from "./components/ScrollArea";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarTrigger,
} from "./components/Sidebar";
import { Slider, SliderValue } from "./components/Slider";
import { renderToStringAndHydrate } from "./test-utils/ssr";

// ProseMirror / CodeMirror measure layout that jsdom doesn't implement.
beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
  const rectList = Object.assign([], { item: () => null }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  Range.prototype.getClientRects = () => rectList;
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
});

function SidebarExample() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarMenu>
            {[0, 1, 2].map((index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
      </SidebarInset>
    </SidebarProvider>
  );
}

describe("SSR + hydration", () => {
  it("Sidebar: no matchMedia on the server, no hydration mismatch on a phone, sheet mode after hydrating", async () => {
    const result = await renderToStringAndHydrate(<SidebarExample />, { clientMatchMedia: true });
    // The server renders the desktop markup (hidden below md by CSS) …
    expect(result.html).toContain('data-slot="sidebar-container"');
    expect(result.errors).toEqual([]);
    // … and the client switches to the (closed) mobile sheet right after hydration.
    expect(result.container.querySelector('[data-slot="sidebar-container"]')).toBeNull();
    result.unmount();
  });

  it("Sidebar: stays in desktop mode on wide screens", async () => {
    const result = await renderToStringAndHydrate(<SidebarExample />, { clientMatchMedia: false });
    expect(result.errors).toEqual([]);
    expect(result.container.querySelector('[data-slot="sidebar-container"]')).not.toBeNull();
    result.unmount();
  });

  it("SidebarMenuSkeleton: deterministic widths between 50 and 90 %", async () => {
    const result = await renderToStringAndHydrate(<SidebarExample />);
    expect(result.errors).toEqual([]);
    const widths = [...result.html.matchAll(/--skeleton-width:(\d+)%/g)].map((match) => Number(match[1]));
    expect(widths).toHaveLength(3);
    for (const width of widths) {
      expect(width).toBeGreaterThanOrEqual(50);
      expect(width).toBeLessThan(90);
    }
    const clientWidths = [...result.container.querySelectorAll<HTMLElement>('[data-sidebar="menu-skeleton-text"]')].map(
      (element) => element.style.getPropertyValue("--skeleton-width"),
    );
    expect(clientWidths).toEqual(widths.map((width) => `${width}%`));
    result.unmount();
  });

  it("DatePicker / DateRangePicker: English default format, no mismatch", async () => {
    const result = await renderToStringAndHydrate(
      <div>
        <DatePicker defaultValue={new Date(2025, 0, 5)} />
        <DateRangePicker defaultValue={{ from: new Date(2025, 0, 5), to: new Date(2025, 0, 9) }} />
      </div>,
    );
    expect(result.errors).toEqual([]);
    expect(result.html).toContain("Jan 5, 2025");
    expect(result.container.textContent).toContain("Jan 5, 2025 – Jan 9, 2025");
    result.unmount();
  });

  it("Progress / Meter / Slider / NumberField format with en-US by default", async () => {
    const decimal = { style: "decimal", maximumFractionDigits: 1 } as const;
    const result = await renderToStringAndHydrate(
      <div>
        <Progress value={1234.5} max={2000} format={decimal} aria-label="Progress">
          <ProgressValue data-testid="progress-value" />
        </Progress>
        <Meter value={1234.5} max={2000} format={decimal} aria-label="Meter">
          <MeterValue />
        </Meter>
        <Slider defaultValue={1234.5} max={2000} step={0.5} format={decimal} thumbLabels={["Slider"]}>
          <SliderValue />
        </Slider>
        <NumberField defaultValue={1234.5} inputProps={{ "aria-label": "Number" }} />
      </div>,
    );
    expect(result.errors).toEqual([]);
    const text = result.container.textContent ?? "";
    expect(text.match(/1,234\.5/g)?.length).toBeGreaterThanOrEqual(3);
    expect(result.container.querySelector("input[aria-label=Number]")).toHaveValue("1,234.5");
    result.unmount();
  });

  it("the locale stays overridable", async () => {
    const decimal = { style: "decimal", maximumFractionDigits: 1 } as const;
    const result = await renderToStringAndHydrate(
      <Progress value={1234.5} max={2000} format={decimal} locale="de-DE" aria-label="Progress">
        <ProgressValue />
      </Progress>,
    );
    expect(result.errors).toEqual([]);
    expect(result.container.textContent).toContain("1.234,5");
    result.unmount();
  });

  it("RichTextEditor renders the frame on the server and creates the editor after hydrating", async () => {
    const result = await renderToStringAndHydrate(<RichTextEditor defaultValue="**Hello**" aria-label="Notes" />);
    expect(result.errors).toEqual([]);
    expect(result.html).toContain('data-slot="rich-text-editor"');
    expect(result.html).not.toContain("contenteditable");
    expect(result.container.querySelector(".ProseMirror")).not.toBeNull();
    expect(result.container.querySelector('[role="toolbar"]')).not.toBeNull();
    result.unmount();
  });

  it("MarkdownEditor / CodeEditor mount CodeMirror only on the client", async () => {
    const result = await renderToStringAndHydrate(
      <div>
        <MarkdownEditor defaultValue="# Title" layout="split" />
        <CodeEditor defaultValue="const a = 1;" language="javascript" aria-label="Code" />
      </div>,
    );
    expect(result.errors).toEqual([]);
    expect(result.html).not.toContain("cm-editor");
    expect(result.container.querySelectorAll(".cm-editor")).toHaveLength(2);
    result.unmount();
  });

  it("ScrollArea hydrates without mismatch", async () => {
    const result = await renderToStringAndHydrate(
      <ScrollArea className="h-20">
        <pre>{"x".repeat(300)}</pre>
      </ScrollArea>,
    );
    expect(result.errors).toEqual([]);
    result.unmount();
  });
});
