import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconProvider } from "../../icons";
import { toast, Toaster } from "./Toast";

afterEach(() => {
  act(() => toast.dismiss());
});

describe("Toast", () => {
  it("shows a toast with title and description in the bottom-right viewport", async () => {
    render(<Toaster />);
    act(() => {
      toast("Bestellung aufgegeben.", { description: "Lieferung in 2 Tagen." });
    });
    const item = await screen.findByRole("dialog");
    expect(item).toHaveClass("bg-pui-popover", "rounded-pui", "border-pui-border", "shadow-pui-floating", "px-3.5", "py-3");
    expect(screen.getByText("Bestellung aufgegeben.")).toHaveClass("font-medium");
    expect(screen.getByText("Lieferung in 2 Tagen.")).toHaveClass("text-pui-muted-foreground");
    expect(item.parentElement).toHaveClass("fixed", "bottom-6", "right-6", "w-80");
  });

  it("accepts an options object and returns the id", async () => {
    render(<Toaster />);
    let id = "";
    act(() => {
      id = toast({ title: "Hinweis", description: "Mit Objekt" });
    });
    expect(typeof id).toBe("string");
    expect(await screen.findByText("Mit Objekt")).toBeInTheDocument();
  });

  it("maps toast.success & co. to an icon and color", async () => {
    const Success = (props: object) => <svg data-testid="success-icon" {...props} />;
    const Error = (props: object) => <svg data-testid="error-icon" {...props} />;
    render(
      <IconProvider icons={{ success: Success, error: Error }}>
        <Toaster />
      </IconProvider>,
    );
    act(() => {
      toast.success("Gespeichert.");
      toast.error("Fehlgeschlagen.");
    });
    expect(await screen.findByTestId("success-icon")).toHaveClass("text-pui-positive");
    expect(screen.getByTestId("error-icon")).toHaveClass("text-pui-negative");
    const types = screen.getAllByRole("dialog").map((item) => item.getAttribute("data-type"));
    expect(types.sort()).toEqual(["error", "success"]);
  });

  it("renders no icon for a plain toast", async () => {
    render(<Toaster />);
    act(() => {
      toast("Hinweis");
    });
    const item = await screen.findByRole("dialog");
    // Only the close button's icon.
    expect(item.querySelectorAll("svg")).toHaveLength(1);
  });

  it("closes via the close button", async () => {
    const user = userEvent.setup();
    render(<Toaster closeLabel="Schließen" />);
    act(() => {
      toast("Gespeichert.");
    });
    // Base UI hides the close button from assistive tech until the stack is hovered or focused.
    await user.hover(await screen.findByRole("dialog"));
    await user.click(await screen.findByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("dismisses a toast by id", async () => {
    render(<Toaster />);
    let id = "";
    act(() => {
      id = toast.loading("Lädt …");
      toast.info("Bleibt");
    });
    expect(await screen.findByText("Lädt …")).toBeInTheDocument();
    act(() => toast.dismiss(id));
    await waitFor(() => expect(screen.queryByText("Lädt …")).not.toBeInTheDocument());
    expect(screen.getByText("Bleibt")).toBeInTheDocument();
  });

  it("runs a sonner-style action and closes the toast", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast("Fahrzeug verkauft.", { action: { label: "Rückgängig", onClick: onUndo } });
    });
    const action = await screen.findByRole("button", { name: "Rückgängig" });
    // Centred on the title line (negative margin keeps the toast as tall as the others).
    expect(action).toHaveClass("h-7", "-my-1");
    await user.click(action);
    expect(onUndo).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByText("Fahrzeug verkauft.")).not.toBeInTheDocument());
  });

  it("auto-dismisses after the Toaster timeout", async () => {
    render(<Toaster timeout={50} />);
    act(() => {
      toast("Kurz");
    });
    await screen.findByRole("dialog");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: 2000 });
  });

  it("follows a promise from loading to success", async () => {
    render(<Toaster />);
    let resolve: (value: string) => void = () => {};
    const promise = new Promise<string>((r) => {
      resolve = r;
    });
    act(() => {
      toast.promise(promise, {
        loading: "Überweisung läuft …",
        success: (value) => `Überwiesen: ${value}`,
        error: "Fehlgeschlagen",
      });
    });
    expect(await screen.findByText("Überweisung läuft …")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-type", "loading");
    await act(async () => {
      resolve("120 €");
      await promise;
    });
    expect(await screen.findByText("Überwiesen: 120 €")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-type", "success");
  });

  it("merges className on viewport and toasts, also in function form", async () => {
    render(
      <Toaster
        className="bottom-4"
        toastClassName={(state) => (state.type === "info" ? "is-info px-4" : undefined)}
      />,
    );
    act(() => {
      toast.info("Gespeichert.");
    });
    const item = await screen.findByRole("dialog");
    expect(item).toHaveClass("is-info", "px-4", "bg-pui-popover");
    expect(item).not.toHaveClass("px-3.5");
    expect(item.parentElement).toHaveClass("bottom-4");
    expect(item.parentElement).not.toHaveClass("bottom-6");
  });

  it("marks every part with data-slot and uses the motion/ring tokens", async () => {
    render(<Toaster />);
    act(() => {
      toast.info("Neu.", { description: "Details", action: { label: "Ansehen", onClick: () => {} } });
    });
    const item = await screen.findByRole("dialog");
    expect(item).toHaveAttribute("data-slot", "toast");
    expect(item).toHaveClass("duration-pui-base", "ease-pui", "focus-visible:ring-pui");
    expect(item.parentElement).toHaveAttribute("data-slot", "toaster");
    expect(item.querySelector("[data-slot=toast-icon]")).toBeInTheDocument();
    expect(item.querySelector("[data-slot=toast-content]")).toBeInTheDocument();
    expect(screen.getByText("Neu.")).toHaveAttribute("data-slot", "toast-title");
    expect(screen.getByText("Details")).toHaveAttribute("data-slot", "toast-description");
    expect(screen.getByRole("button", { name: "Ansehen" })).toHaveAttribute("data-slot", "toast-action");
    expect(item.querySelector("[data-slot=toast-close]")).toHaveAttribute("aria-label", "Close");
  });
});
