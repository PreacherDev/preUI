import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { IconProvider } from "../../icons";
import {
  Dialog,
  DialogOverlay,
  DialogPopup,
  DialogPortal,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";
import type { DialogContentProps } from "./Dialog";

function Example(props: DialogContentProps & { defaultOpen?: boolean }) {
  const { defaultOpen, ...contentProps } = props;
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent {...contentProps}>
        <DialogHeader>
          <DialogTitle>Lagerhalle kaufen</DialogTitle>
          <DialogDescription>Der Unterhalt wird je Intervall abgebucht.</DialogDescription>
        </DialogHeader>
        <DialogFooter data-testid="footer">
          <DialogClose>Abbrechen</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog", () => {
  it("is closed by default and opens via the trigger", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Lagerhalle kaufen");
    expect(dialog).toHaveAccessibleDescription("Der Unterhalt wird je Intervall abgebucht.");
  });

  it("styles the popup, title, description and footer", async () => {
    render(<Example defaultOpen />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("bg-pui-shell", "rounded-pui", "border-pui-border", "shadow-pui-window", "max-w-lg");
    expect(screen.getByText("Lagerhalle kaufen")).toHaveClass("text-base", "font-semibold");
    expect(screen.getByText("Der Unterhalt wird je Intervall abgebucht.")).toHaveClass("text-pui-muted-foreground");
    expect(screen.getByTestId("footer")).toHaveClass("flex", "justify-end", "gap-2");
  });

  it("keeps a 1rem margin to the screen edges on small screens", async () => {
    render(<Example defaultOpen />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("w-[calc(100%-2rem)]", "max-w-lg");
    expect(dialog).not.toHaveClass("w-full");
  });

  it("renders a close button with a configurable label that closes the dialog", async () => {
    const user = userEvent.setup();
    render(<Example defaultOpen closeLabel="Schließen" />);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("can hide the close button", async () => {
    render(<Example defaultOpen showCloseButton={false} />);
    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("uses the close icon from IconProvider", async () => {
    const CustomClose = () => <svg data-testid="custom-close" />;
    render(
      <IconProvider icons={{ close: CustomClose }}>
        <Example defaultOpen />
      </IconProvider>,
    );
    expect(await screen.findByTestId("custom-close")).toBeInTheDocument();
  });

  it("merges className, also in function form", async () => {
    const { unmount } = render(<Example defaultOpen className="max-w-md" />);
    let dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("max-w-md");
    expect(dialog).not.toHaveClass("max-w-lg");
    unmount();

    render(<Example defaultOpen className={(state) => (state.open ? "is-open" : "is-closed")} />);
    dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("is-open", "bg-pui-shell");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Example defaultOpen />);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("pins header and footer and scrolls the rest in a preUI ScrollArea", async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader data-testid="header">
            <DialogTitle>Kassenbuch</DialogTitle>
          </DialogHeader>
          <>
            <p data-testid="body-a">Eintrag A</p>
          </>
          <button type="button">Export</button>
          <DialogFooter data-testid="footer">
            <DialogClose>Schließen</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("flex", "flex-col", "max-h-[85vh]", "overflow-hidden");
    expect(dialog).not.toHaveClass("overflow-y-auto");
    const viewport = screen.getByTestId("body-a").closest("[data-slot=scroll-area-viewport]");
    expect(viewport).not.toBeNull();
    expect(viewport).toContainElement(screen.getByRole("button", { name: "Export" }));
    expect(viewport).not.toContainElement(screen.getByTestId("header"));
    expect(viewport).not.toContainElement(screen.getByTestId("footer"));
    // Header, body, footer in document order.
    const area = viewport!.closest("[data-slot=scroll-area]")!;
    expect(screen.getByTestId("header").compareDocumentPosition(area) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(area.compareDocumentPosition(screen.getByTestId("footer")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The body has a focusable control → the viewport is no extra Tab stop.
    await waitFor(() => expect(viewport).toHaveAttribute("tabindex", "-1"));
  });

  it("renders no scroll area when there is only header and footer", async () => {
    render(<Example defaultOpen />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelector("[data-slot=scroll-area]")).toBeNull();
  });

  it("marks every part with data-slot and uses the motion/ring tokens", async () => {
    render(<Example defaultOpen />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "dialog-content");
    expect(dialog).toHaveClass("duration-pui-base", "ease-pui");
    expect(screen.getByText("Open")).toHaveAttribute("data-slot", "dialog-trigger");
    expect(screen.getByText("Lagerhalle kaufen")).toHaveAttribute("data-slot", "dialog-title");
    expect(screen.getByText("Der Unterhalt wird je Intervall abgebucht.")).toHaveAttribute("data-slot", "dialog-description");
    expect(screen.getByText("Lagerhalle kaufen").parentElement).toHaveAttribute("data-slot", "dialog-header");
    expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "dialog-footer");
    expect(screen.getByRole("button", { name: "Abbrechen" })).toHaveAttribute("data-slot", "dialog-close");
    const x = screen.getByRole("button", { name: "Close" });
    expect(x).toHaveAttribute("data-slot", "dialog-close");
    expect(x).toHaveClass("focus-visible:ring-pui", "duration-pui-fast");
    expect(document.querySelector("[data-slot=dialog-overlay]")).toHaveClass("bg-pui-scrim/scrim", "duration-pui-base");
    expect(document.querySelector("[data-slot=dialog-portal]")).toContainElement(dialog);
  });
});

function Framed(props: DialogContentProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={frameRef} data-testid="frame" className="relative overflow-hidden" />
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent container={frameRef} {...props}>
          <DialogTitle>Akte</DialogTitle>
          <input aria-label="Name" />
        </DialogContent>
      </Dialog>
    </>
  );
}

describe("Dialog in a container", () => {
  it("portals into the container and positions overlay and popup inside it", async () => {
    const user = userEvent.setup();
    render(<Framed />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    const frame = screen.getByTestId("frame");
    const overlay = document.querySelector("[data-slot=dialog-overlay]");
    expect(frame).toContainElement(dialog);
    expect(frame).toContainElement(overlay as HTMLElement);
    expect(overlay).toHaveClass("absolute", "inset-0");
    expect(overlay).not.toHaveClass("fixed");
    expect(overlay).toHaveAttribute("data-contained");
    expect(dialog).toHaveClass("absolute", "left-1/2", "top-1/2", "max-h-[85%]");
    expect(dialog).not.toHaveClass("fixed", "max-h-[85vh]");
    expect(dialog).toHaveAttribute("data-contained");
  });

  it("keeps viewport positioning with contained={false}", async () => {
    const user = userEvent.setup();
    render(<Framed contained={false} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByTestId("frame")).toContainElement(dialog);
    expect(dialog).toHaveClass("fixed", "max-h-[85vh]");
    expect(dialog).not.toHaveAttribute("data-contained");
  });

  it("stays fixed to the viewport without a container", async () => {
    render(<Example defaultOpen />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass("fixed");
    expect(document.querySelector("[data-slot=dialog-overlay]")).toHaveClass("fixed", "inset-0");
  });
});

describe("Dialog overlay options", () => {
  it("merges overlayClassName into the scrim", async () => {
    render(<Example defaultOpen overlayClassName="bg-pui-scrim/40" />);
    await screen.findByRole("dialog");
    const overlay = document.querySelector("[data-slot=dialog-overlay]");
    expect(overlay).toHaveClass("bg-pui-scrim/40", "fixed", "inset-0");
    expect(overlay).not.toHaveClass("bg-pui-scrim/scrim");
  });

  it("renders no scrim with overlay={false}", async () => {
    render(<Example defaultOpen overlay={false} />);
    await screen.findByRole("dialog");
    expect(document.querySelector("[data-slot=dialog-overlay]")).toBeNull();
    expect(document.querySelector("[data-slot=dialog-portal]")).toBeInTheDocument();
  });
});

describe("Dialog initial focus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("focuses the first tabbable element without scrolling", async () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const cancel = await screen.findByRole("button", { name: "Abbrechen" });
    await waitFor(() => expect(cancel).toHaveFocus());
    const calls = focus.mock.contexts.map((element, index) => [element, focus.mock.calls[index]![0]] as const);
    const cancelCalls = calls.filter(([element]) => element === cancel);
    expect(cancelCalls.length).toBeGreaterThan(0);
    for (const [, options] of cancelCalls) expect(options).toEqual({ preventScroll: true });
  });

  it("focuses an initialFocus ref without scrolling", async () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    function WithRef() {
      const inputRef = useRef<HTMLInputElement>(null);
      return (
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent initialFocus={inputRef}>
            <DialogTitle>Suche</DialogTitle>
            <button type="button">Erster</button>
            <input ref={inputRef} aria-label="Suchbegriff" />
          </DialogContent>
        </Dialog>
      );
    }
    const user = userEvent.setup();
    render(<WithRef />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const input = await screen.findByRole("textbox", { name: "Suchbegriff" });
    await waitFor(() => expect(input).toHaveFocus());
    const inputCalls = focus.mock.contexts.flatMap((element, index) => (element === input ? [focus.mock.calls[index]![0]] : []));
    expect(inputCalls).toEqual([{ preventScroll: true }]);
  });

  it("moves no focus with initialFocus={false}", async () => {
    const user = userEvent.setup();
    render(<Example initialFocus={false} />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(trigger).toHaveFocus();
  });
});

describe("DialogPopup", () => {
  it("composes with DialogPortal and DialogOverlay", async () => {
    render(
      <Dialog defaultOpen>
        <DialogPortal>
          <DialogOverlay className="bg-pui-scrim/20" />
          <DialogPopup className="max-w-sm" showCloseButton={false}>
            <DialogTitle>Eigener Aufbau</DialogTitle>
          </DialogPopup>
        </DialogPortal>
      </Dialog>,
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "dialog-popup");
    expect(dialog).toHaveClass("bg-pui-shell", "max-w-sm");
    expect(dialog).not.toHaveClass("max-w-lg");
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(document.querySelector("[data-slot=dialog-overlay]")).toHaveClass("bg-pui-scrim/20");
  });
});
