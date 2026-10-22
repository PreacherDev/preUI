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

  it("tells the cancel reasons apart", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Öffnen
          </button>
          <ConfirmDialog open={open} onOpenChange={setOpen} title="Sicher?" onCancel={onCancel} />
        </>
      );
    }
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Öffnen" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(onCancel).toHaveBeenLastCalledWith("button"));

    await user.click(screen.getByRole("button", { name: "Öffnen" }));
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onCancel).toHaveBeenLastCalledWith("escape"));
  });

  it("disables the confirming button with confirmDisabled and spins with confirmLoading", async () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<ConfirmDialog defaultOpen title="Titel" confirmDisabled onConfirm={onConfirm} />);
    const confirm = await screen.findByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    rerender(<ConfirmDialog defaultOpen title="Titel" confirmLoading onConfirm={onConfirm} />);
    const loading = screen.getByRole("button", { name: "Confirm" });
    expect(loading).toBeDisabled();
    expect(loading).toHaveAttribute("data-loading", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("stays open with a spinner while onConfirm's promise runs and closes when it resolves", async () => {
    const user = userEvent.setup();
    let resolve: (value: boolean) => void = () => {};
    const onConfirm = vi.fn(() => new Promise<boolean>((done) => (resolve = done)));
    const onCancel = vi.fn();
    render(<ConfirmDialog defaultOpen title="Speichern?" onConfirm={onConfirm} onCancel={onCancel} />);
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm" })).toHaveAttribute("data-loading", "true"));
    resolve(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("ignores Escape and a press outside while onConfirm's promise runs", async () => {
    const user = userEvent.setup();
    let resolve: (value: boolean) => void = () => {};
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        defaultOpen
        title="Löschen?"
        onConfirm={() => new Promise<boolean>((done) => (resolve = done))}
        onCancel={onCancel}
        onOpenChange={onOpenChange}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await user.keyboard("{Escape}");
    await user.click(document.body);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    resolve(true);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("ignores Escape while confirmLoading is set, and closes again once it is off", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { rerender } = render(<ConfirmDialog defaultOpen title="Löschen?" confirmLoading onCancel={onCancel} />);
    await screen.findByRole("alertdialog");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    rerender(<ConfirmDialog defaultOpen title="Löschen?" onCancel={onCancel} />);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onCancel).toHaveBeenCalledWith("escape"));
  });

  it("keeps the dialog open when onConfirm resolves false", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(() => Promise.resolve(false));
    render(<ConfirmDialog defaultOpen title="Speichern?" onConfirm={onConfirm} />);
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm" })).not.toHaveAttribute("data-loading"));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("keeps the dialog open when onConfirm returns false", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog defaultOpen title="Speichern?" onConfirm={() => false} />);
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("passes contentProps to the surface", async () => {
    render(<ConfirmDialog defaultOpen title="Titel" contentProps={{ className: "max-w-sm", "data-testid": "surface" } as never} />);
    expect(await screen.findByTestId("surface")).toHaveClass("max-w-sm");
  });
});
