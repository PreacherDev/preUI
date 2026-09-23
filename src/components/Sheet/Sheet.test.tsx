import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPopup,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "./Sheet";
import type { SheetContentProps } from "./Sheet";

function Example(props: SheetContentProps) {
  return (
    <Sheet>
      <SheetTrigger>Filter</SheetTrigger>
      <SheetContent {...props}>
        <SheetHeader>
          <SheetTitle>Filter</SheetTitle>
          <SheetDescription>Grenze die Liste ein.</SheetDescription>
        </SheetHeader>
        <SheetFooter data-testid="footer">
          <SheetClose>Übernehmen</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens via the trigger as a labelled dialog on the shell surface", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const sheet = await screen.findByRole("dialog");
    expect(sheet).toHaveAccessibleName("Filter");
    expect(sheet).toHaveAccessibleDescription("Grenze die Liste ein.");
    expect(sheet).toHaveClass("bg-pui-shell", "border-pui-border", "shadow-pui-window", "duration-pui-base", "ease-pui");
    expect(sheet).toHaveAttribute("data-slot", "sheet-content");
    expect(screen.getByTestId("footer")).toHaveClass("flex", "justify-end", "mt-auto");
    expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "sheet-footer");
    expect(screen.getByText("Grenze die Liste ein.")).toHaveAttribute("data-slot", "sheet-description");
    expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute("data-slot", "sheet-close");
    expect(screen.getByRole("button", { name: "Übernehmen" })).toHaveAttribute("data-slot", "sheet-close");
    expect(screen.getByRole("button", { name: "Filter", hidden: true })).toHaveAttribute("data-slot", "sheet-trigger");
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeInTheDocument();
  });

  it("sits on the right by default and supports the other sides", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const right = await screen.findByRole("dialog");
    expect(right).toHaveAttribute("data-side", "right");
    expect(right).toHaveClass("right-0", "border-l", "w-3/4", "sm:max-w-sm", "data-[starting-style]:translate-x-full");
    unmount();

    render(<Example side="bottom" />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const bottom = await screen.findByRole("dialog");
    expect(bottom).toHaveAttribute("data-side", "bottom");
    expect(bottom).toHaveClass("bottom-0", "border-t", "data-[starting-style]:translate-y-full");
    expect(bottom).not.toHaveClass("w-3/4");
  });

  it("closes via the close button with a configurable label", async () => {
    const user = userEvent.setup();
    render(<Example closeLabel="Schließen" />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("can hide the close button", async () => {
    const user = userEvent.setup();
    render(<Example showCloseButton={false} />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("merges className, also in function form", async () => {
    const user = userEvent.setup();
    render(<Example className={(state) => (state.open ? "p-8 is-open" : undefined)} />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const sheet = await screen.findByRole("dialog");
    expect(sheet).toHaveClass("p-8", "is-open", "bg-pui-shell");
    expect(sheet).not.toHaveClass("p-5");
  });
  it("scrolls the body in a preUI ScrollArea, header and footer stay outside", async () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader data-testid="header">
            <SheetTitle>Aktivität</SheetTitle>
          </SheetHeader>
          <ul data-testid="body">
            <li>Eintrag</li>
          </ul>
          <SheetFooter data-testid="footer">
            <SheetClose>Fertig</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );
    const sheet = await screen.findByRole("dialog");
    expect(sheet).toHaveClass("overflow-hidden");
    expect(sheet).not.toHaveClass("overflow-y-auto");
    const viewport = screen.getByTestId("body").closest("[data-slot=scroll-area-viewport]");
    expect(viewport).not.toBeNull();
    expect(viewport).not.toContainElement(screen.getByTestId("header"));
    expect(viewport).not.toContainElement(screen.getByTestId("footer"));
  });
});

/** Options of every `focus()` call on `element`. */
const focusOptionsOf = (spy: { mock: { contexts: unknown[]; calls: unknown[][] } }, element: HTMLElement) =>
  spy.mock.contexts.flatMap((context, index) => (context === element ? [spy.mock.calls[index]![0]] : []));

function FramedSheet(props: SheetContentProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={frameRef} data-testid="frame" className="relative overflow-hidden" />
      <Sheet>
        <SheetTrigger>Filter</SheetTrigger>
        <SheetContent container={frameRef} {...props}>
          <SheetTitle>Filter</SheetTitle>
          <input aria-label="Kennzeichen" />
        </SheetContent>
      </Sheet>
    </>
  );
}

describe("Sheet in a container", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("docks to the container edge and dims only the container", async () => {
    const user = userEvent.setup();
    render(<FramedSheet side="right" />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const sheet = await screen.findByRole("dialog");
    const frame = screen.getByTestId("frame");
    const overlay = document.querySelector("[data-slot=sheet-overlay]");
    expect(frame).toContainElement(sheet);
    expect(frame).toContainElement(overlay as HTMLElement);
    expect(sheet).toHaveClass("absolute", "inset-y-0", "right-0", "h-full");
    expect(sheet).not.toHaveClass("fixed");
    expect(sheet).toHaveAttribute("data-contained");
    expect(overlay).toHaveClass("absolute", "inset-0");
    expect(overlay).not.toHaveClass("fixed");
  });

  it("limits top and bottom sheets to 80% of the container", async () => {
    const user = userEvent.setup();
    render(<FramedSheet side="bottom" />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const sheet = await screen.findByRole("dialog");
    expect(sheet).toHaveClass("absolute", "bottom-0", "max-h-[80%]");
    expect(sheet).not.toHaveClass("max-h-[80vh]");
  });

  it("supports overlayClassName and overlay={false}", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<FramedSheet overlayClassName="bg-pui-scrim/30" />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await screen.findByRole("dialog");
    expect(document.querySelector("[data-slot=sheet-overlay]")).toHaveClass("bg-pui-scrim/30");
    unmount();
    render(<FramedSheet overlay={false} />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await screen.findByRole("dialog");
    expect(document.querySelector("[data-slot=sheet-overlay]")).toBeNull();
  });

  it("focuses the first field without scrolling", async () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const user = userEvent.setup();
    render(<FramedSheet />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const input = await screen.findByRole("textbox", { name: "Kennzeichen" });
    await waitFor(() => expect(input).toHaveFocus());
    expect(focusOptionsOf(focus, input)).toEqual([{ preventScroll: true }]);
  });

  it("exports SheetPopup for custom compositions", async () => {
    render(
      <Sheet defaultOpen>
        <SheetPortal>
          <SheetOverlay />
          <SheetPopup side="left" showCloseButton={false}>
            <SheetTitle>Navigation</SheetTitle>
          </SheetPopup>
        </SheetPortal>
      </Sheet>,
    );
    const sheet = await screen.findByRole("dialog");
    expect(sheet).toHaveAttribute("data-slot", "sheet-popup");
    expect(sheet).toHaveAttribute("data-side", "left");
    expect(sheet).toHaveClass("fixed", "left-0");
  });
});
