import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconProvider } from "../../icons";
import {
  Dialog,
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
    expect(document.querySelector("[data-slot=dialog-overlay]")).toHaveClass("bg-pui-background/scrim", "duration-pui-base");
    expect(document.querySelector("[data-slot=dialog-portal]")).toContainElement(dialog);
  });
});
