import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { ScrollArea, ScrollBar } from "./ScrollArea";

describe("ScrollArea", () => {
  it("renders root, viewport and content with the reserved track", () => {
    render(
      <ScrollArea data-testid="root" viewportClassName="max-h-72">
        <p>Eintrag 1</p>
      </ScrollArea>,
    );
    const root = screen.getByTestId("root");
    expect(root).toHaveClass("relative", "overflow-clip");
    const content = screen.getByText("Eintrag 1").parentElement!;
    expect(content).toHaveClass("pr-2.5");
    expect(content).not.toHaveClass("pb-2.5");
    const viewport = content.parentElement!;
    expect(viewport).toHaveClass("max-h-72", "size-full");
  });

  it("reserves both tracks for orientation both", () => {
    render(
      <ScrollArea orientation="both">
        <p>Tabelle</p>
      </ScrollArea>,
    );
    expect(screen.getByText("Tabelle").parentElement).toHaveClass("pr-2.5", "pb-2.5");
  });

  it("reserves only the bottom track for horizontal", () => {
    render(
      <ScrollArea orientation="horizontal">
        <p>Zeile</p>
      </ScrollArea>,
    );
    const content = screen.getByText("Zeile").parentElement!;
    expect(content).toHaveClass("pb-2.5");
    expect(content).not.toHaveClass("pr-2.5");
  });

  it("merges className, including the function form", () => {
    const { rerender } = render(
      <ScrollArea data-testid="root" className="h-40 overflow-visible">
        <p>Inhalt</p>
      </ScrollArea>,
    );
    expect(screen.getByTestId("root")).toHaveClass("h-40", "overflow-visible");
    expect(screen.getByTestId("root")).not.toHaveClass("overflow-clip");
    rerender(
      <ScrollArea data-testid="root" className={(state) => (state.scrolling ? "is-scrolling" : "is-idle")}>
        <p>Inhalt</p>
      </ScrollArea>,
    );
    expect(screen.getByTestId("root")).toHaveClass("is-idle", "relative");
  });

  it("styles a standalone scrollbar with a 10px track", () => {
    render(
      <BaseScrollArea.Root>
        <BaseScrollArea.Viewport>
          <p>Inhalt</p>
        </BaseScrollArea.Viewport>
        <ScrollBar data-testid="bar" keepMounted className="opacity-80" />
        <ScrollBar data-testid="bar-x" orientation="horizontal" keepMounted />
      </BaseScrollArea.Root>,
    );
    const bar = screen.getByTestId("bar");
    expect(bar).toHaveAttribute("data-orientation", "vertical");
    expect(bar).toHaveClass("data-[orientation=vertical]:w-2.5", "p-[3px]", "opacity-80");
    expect(bar.firstElementChild).toHaveClass("rounded-full", "hover:!bg-pui-muted-foreground/60");
    expect(screen.getByTestId("bar-x")).toHaveAttribute("data-orientation", "horizontal");
  });

  it("exposes the viewport and can float the thumb over the content", () => {
    const viewportRef = createRef<HTMLDivElement>();
    render(
      <ScrollArea viewportRef={viewportRef} viewportProps={{ tabIndex: -1 }} reserveTrack={false} contentClassName="p-1">
        <p>Inhalt</p>
      </ScrollArea>,
    );
    const viewport = viewportRef.current!;
    expect(viewport).toBeInstanceOf(HTMLDivElement);
    expect(viewport).toHaveAttribute("tabindex", "-1");
    const content = screen.getByText("Inhalt").parentElement!;
    expect(content).toHaveClass("p-1");
    expect(content).not.toHaveClass("pr-2.5");
  });

  it("marks root, viewport and content with data-slot", () => {
    render(
      <ScrollArea data-testid="root">
        <p>Eintrag</p>
      </ScrollArea>,
    );
    expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "scroll-area");
    const content = screen.getByText("Eintrag").parentElement!;
    expect(content).toHaveAttribute("data-slot", "scroll-area-content");
    expect(content.parentElement).toHaveAttribute("data-slot", "scroll-area-viewport");
  });

  it("fades the horizontal edges while content is hidden there, unless edgeFade is off", () => {
    const { rerender } = render(
      <ScrollArea data-testid="root" orientation="horizontal">
        <p>Inhalt</p>
      </ScrollArea>,
    );
    const root = screen.getByTestId("root");
    expect(root).toHaveClass("[--pui-fade-end:0px]", "data-[overflow-x-end]:[--pui-fade-end:2.5rem]");
    const viewport = root.querySelector('[data-slot="scroll-area-viewport"]')!;
    expect(viewport.className).toContain("[mask-image:");

    rerender(
      <ScrollArea data-testid="root" orientation="horizontal" edgeFade={false}>
        <p>Inhalt</p>
      </ScrollArea>,
    );
    expect(screen.getByTestId("root").className).not.toContain("--pui-fade");
    expect(screen.getByTestId("root").querySelector('[data-slot="scroll-area-viewport"]')!.className).not.toContain("mask-image");
  });

  it("does not fade vertical-only areas", () => {
    render(
      <ScrollArea data-testid="root">
        <p>Inhalt</p>
      </ScrollArea>,
    );
    expect(screen.getByTestId("root").className).not.toContain("--pui-fade");
  });
});

describe("ScrollArea content width", () => {
  const content = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="scroll-area-content"]')!;

  it("vertical-only: the content follows the viewport width (!min-w-0 beats Base UI's inline fit-content)", () => {
    const { container } = render(<ScrollArea className="h-20"><pre>{"x".repeat(200)}</pre></ScrollArea>);
    expect(content(container).style.minWidth).toBe("fit-content");
    expect(content(container)).toHaveClass("!min-w-0");
    expect(content(container)).not.toHaveClass("min-w-full");
  });

  it("horizontal / both: the content may grow wider than the viewport", () => {
    for (const orientation of ["horizontal", "both"] as const) {
      const { container, unmount } = render(<ScrollArea orientation={orientation}>wide</ScrollArea>);
      expect(content(container)).toHaveClass("min-w-full");
      expect(content(container)).not.toHaveClass("!min-w-0");
      unmount();
    }
  });

  it("edge fade sets the prefixed -webkit-mask-image too (Chromium < 120)", () => {
    const { container } = render(<ScrollArea orientation="horizontal">wide</ScrollArea>);
    const viewport = container.querySelector('[data-slot="scroll-area-viewport"]')!;
    expect(viewport.className).toContain("[-webkit-mask-image:");
    expect(viewport.className).toContain("[mask-image:");
  });

  it("contains the scroll per axis, so an area that only overflows sideways lets the wheel through", () => {
    render(
      <ScrollArea data-testid="root" orientation="both">
        <p>Inhalt</p>
      </ScrollArea>,
    );
    const viewport = screen.getByTestId("root").querySelector('[data-slot="scroll-area-viewport"]')!;
    expect(viewport).toHaveClass(
      "data-[has-overflow-x]:overscroll-x-contain",
      "data-[has-overflow-y]:overscroll-y-contain",
    );
    expect(viewport.className).not.toContain(" overscroll-contain");
  });
});
