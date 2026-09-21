import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./AlertDialog";
import type { AlertDialogContentProps } from "./AlertDialog";

function Example({ onConfirm, ...props }: AlertDialogContentProps & { onConfirm?: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Löschen</AlertDialogTrigger>
      <AlertDialogContent {...props}>
        <AlertDialogHeader>
          <AlertDialogTitle>Fahrzeug verkaufen?</AlertDialogTitle>
          <AlertDialogDescription>Das kannst du nicht rückgängig machen.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter data-testid="footer">
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Verkaufen</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe("AlertDialog", () => {
  it("opens as an alertdialog with name and description", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Fahrzeug verkaufen?");
    expect(dialog).toHaveAccessibleDescription("Das kannst du nicht rückgängig machen.");
    expect(dialog).toHaveClass("bg-pui-shell", "rounded-pui", "shadow-pui-window", "max-w-md");
    expect(dialog).not.toHaveClass("max-w-lg");
    // Small screens: 1rem margin on both sides instead of edge-to-edge.
    expect(dialog).toHaveClass("w-[calc(100%-2rem)]");
    expect(screen.getByTestId("footer")).toHaveClass("flex", "justify-end");
  });

  it("has no close X, only the footer actions", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.querySelectorAll("button")).toHaveLength(2);
  });

  it("styles cancel and action as buttons, with overridable variant", async () => {
    const user = userEvent.setup();
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Löschen?</AlertDialogTitle>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction>Speichern</AlertDialogAction>
          <AlertDialogAction variant="destructive" size="sm" className="ml-1">
            Löschen
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );
    await screen.findByRole("alertdialog");
    // Handoff confirmation footer: ghost cancel next to the solid confirm.
    const cancel = screen.getByRole("button", { name: "Abbrechen" });
    expect(cancel).toHaveClass("text-pui-muted-foreground", "h-pui-control");
    expect(cancel).toHaveAttribute("data-slot", "alert-dialog-cancel");
    expect(cancel).toHaveAttribute("data-variant", "ghost");
    expect(cancel).not.toHaveClass("border-pui-border");
    expect(screen.getByRole("button", { name: "Speichern" })).toHaveClass(
      "bg-pui-primary",
      "text-pui-primary-foreground",
    );
    const destructive = screen.getByRole("button", { name: "Löschen" });
    expect(destructive).toHaveClass("text-pui-negative", "h-pui-control-sm", "ml-1");
    expect(destructive).toHaveAttribute("data-slot", "alert-dialog-action");
    expect(destructive).toHaveAttribute("data-variant", "destructive");
    expect(destructive).toHaveAttribute("data-size", "sm");
    expect(destructive).not.toHaveClass("bg-pui-primary");
    await user.click(screen.getByRole("button", { name: "Abbrechen" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("runs the confirming action and closes", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    await screen.findByRole("alertdialog");
    await user.click(screen.getByRole("button", { name: "Verkaufen" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("merges className, also in function form", async () => {
    const user = userEvent.setup();
    render(<Example className={(state) => (state.open ? "is-open max-w-sm" : undefined)} />);
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveClass("is-open", "max-w-sm", "bg-pui-shell");
    expect(dialog).not.toHaveClass("max-w-md");
  });
  it("scrolls long content in a preUI ScrollArea between header and footer", async () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader data-testid="header">
            <AlertDialogTitle>Bedingungen</AlertDialogTitle>
          </AlertDialogHeader>
          <p data-testid="body">Sehr langer Text …</p>
          <AlertDialogFooter data-testid="footer">
            <AlertDialogAction>Akzeptieren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveClass("overflow-hidden", "max-w-md");
    const viewport = screen.getByTestId("body").closest("[data-slot=scroll-area-viewport]");
    expect(viewport).not.toBeNull();
    expect(viewport).not.toContainElement(screen.getByTestId("header"));
    expect(viewport).not.toContainElement(screen.getByTestId("footer"));
  });
});
