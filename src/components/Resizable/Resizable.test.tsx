import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./Resizable";

// jsdom has no layout: give elements a size and stub ResizeObserver.
beforeAll(() => {
  class MockResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      const rect = target.getBoundingClientRect();
      const size = [{ inlineSize: rect.width, blockSize: rect.height }];
      this.callback(
        [{ target, contentRect: rect, borderBoxSize: size, contentBoxSize: size } as unknown as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      );
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 1000,
    bottom: 600,
    width: 1000,
    height: 600,
    toJSON: () => ({}),
  } as DOMRect);
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Resizable", () => {
  it("renders a horizontal group with panels and a separator", () => {
    const { container } = render(
      <ResizablePanelGroup className="custom-group">
        <ResizablePanel defaultSize="40%" className="custom-panel">
          Liste
        </ResizablePanel>
        <ResizableHandle className="custom-handle" />
        <ResizablePanel>Details</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const group = container.querySelector("[data-group]") as HTMLElement;
    expect(group).toHaveAttribute("data-orientation", "horizontal");
    expect(group).toHaveClass("custom-group", "h-full", "w-full");
    expect(group.style.flexDirection).toBe("row");
    expect(container.querySelectorAll("[data-panel]")).toHaveLength(2);
    expect(screen.getByText("Liste")).toHaveClass("custom-panel");

    const separator = screen.getByRole("separator");
    // A horizontal group is split by a vertical separator.
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveAttribute("tabindex", "0");
    expect(separator).toHaveClass("custom-handle", "w-px", "bg-pui-border", "focus-visible:ring-pui-ring");
    expect(separator.querySelector("[data-slot=resizable-grip]")).toBeNull();
  });

  it("renders a vertical group with a horizontal separator", () => {
    const { container } = render(
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel>Oben</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Unten</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const group = container.querySelector("[data-group]") as HTMLElement;
    expect(group).toHaveAttribute("data-orientation", "vertical");
    expect(group.style.flexDirection).toBe("column");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-orientation", "horizontal");
  });

  it("shows a grip with withHandle", () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>A</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const grip = screen.getByRole("separator").querySelector("[data-slot=resizable-grip]");
    expect(grip).not.toBeNull();
    expect(grip).toHaveAttribute("aria-hidden", "true");
    expect(grip).toHaveClass("rounded-pui-sm", "border-pui-border", "bg-pui-border");
  });

  it("exposes value attributes and can be focused and resized with the keyboard", async () => {
    const user = userEvent.setup();
    const onLayoutChange = vi.fn();
    render(
      <ResizablePanelGroup onLayoutChange={onLayoutChange}>
        <ResizablePanel id="links" defaultSize="50%">
          Links
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel id="rechts">Rechts</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const separator = screen.getByRole("separator");
    await user.tab();
    expect(separator).toHaveFocus();
    expect(separator).toHaveAttribute("data-separator", "focus");
    expect(separator).toHaveAttribute("aria-valuenow", "50");

    onLayoutChange.mockClear();
    await user.keyboard("{ArrowRight}");
    expect(onLayoutChange).toHaveBeenCalled();
    expect(Number(separator.getAttribute("aria-valuenow"))).toBeGreaterThan(50);
  });

  it("marks disabled separators", () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>A</ResizablePanel>
        <ResizableHandle disabled />
        <ResizablePanel>B</ResizablePanel>
      </ResizablePanelGroup>,
    );
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-disabled", "true");
    expect(separator).toHaveAttribute("data-separator", "disabled");
    expect(separator).not.toHaveAttribute("tabindex");
  });
});

describe("Resizable slots", () => {
  it("marks group, panels and handle", () => {
    const { container } = render(
      <ResizablePanelGroup>
        <ResizablePanel>Links</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>Rechts</ResizablePanel>
      </ResizablePanelGroup>,
    );
    expect(container.querySelector('[data-slot="resizable-panel-group"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="resizable-panel"]')).toHaveLength(2);
    const handle = container.querySelector('[data-slot="resizable-handle"]')!;
    expect(handle).toHaveClass("focus-visible:ring-pui", "duration-pui-fast", "ease-pui");
    expect(handle.querySelector('[data-slot="resizable-grip"]')).toBeInTheDocument();
  });
});
