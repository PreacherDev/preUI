import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("opens from a trigger with title, description and English default buttons", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog trigger={<button type="button">Löschen</button>} title="Filiale löschen?" description="Das kannst du nicht rückgängig machen." />);
    await user.click(screen.getByRole("button", { name: "Löschen" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Filiale löschen?");
    expect(dialog).toHaveAccessibleDescription("Das kannst du nicht rückgängig machen.");
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("data-slot", "alert-dialog-cancel");
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(confirm).toHaveAttribute("data-slot", "alert-dialog-action");
    expect(confirm).toHaveAttribute("data-variant", "solid");
  });

  it("confirms, closes and doesn't report a cancel", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    function Example() {
      const [open, setOpen] = useState(true);
      return (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Verwerfen?"
          confirmLabel="Verwerfen"
          cancelLabel="Abbrechen"
          destructive
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );
    }
    render(<Example />);
    const confirm = await screen.findByRole("button", { name: "Verwerfen" });
    expect(confirm).toHaveAttribute("data-variant", "destructive");
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("reports cancel (button and Escape), also after an earlier confirm", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Öffnen
          </button>
          <ConfirmDialog open={open} onOpenChange={setOpen} title="Sicher?" onConfirm={onConfirm} onCancel={onCancel}>
            <p>Zusatz</p>
          </ConfirmDialog>
        </>
      );
    }
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Öffnen" }));
    expect(await screen.findByText("Zusatz")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Öffnen" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("button", { name: "Öffnen" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(2));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("passes contentProps to the surface", async () => {
    render(<ConfirmDialog defaultOpen title="Titel" contentProps={{ className: "max-w-sm", "data-testid": "surface" } as never} />);
    expect(await screen.findByTestId("surface")).toHaveClass("max-w-sm");
  });
});
