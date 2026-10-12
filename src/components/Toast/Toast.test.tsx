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

  it("closeButton={false} renders no close button", async () => {
    render(<Toaster closeButton={false} />);
    act(() => {
      toast.success("Gespeichert.");
    });
    const item = await screen.findByRole("dialog");
    expect(item.querySelector("[data-slot=toast-close]")).toBeNull();
    // Only the type icon is left.
    expect(item.querySelectorAll("svg")).toHaveLength(1);
  });

  it("a toast's closeButton option overrides the Toaster", async () => {
    render(<Toaster closeButton={false} />);
    act(() => {
      toast("Mit X", { closeButton: true });
      toast("Ohne X");
    });
    const withClose = (await screen.findByText("Mit X")).closest("[data-slot=toast]")!;
    const without = screen.getByText("Ohne X").closest("[data-slot=toast]")!;
    expect(withClose.querySelector("[data-slot=toast-close]")).not.toBeNull();
    expect(without.querySelector("[data-slot=toast-close]")).toBeNull();
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

  // jsdom doesn't report window blur the way Base UI checks it (composedPath), so the pause comes from hovering the
  // stack here — the other case FiveM hits: the cursor was over a toast when the UI closed and never "leaves" it.
  async function showPausedToast(title: string) {
    const user = userEvent.setup();
    act(() => {
      toast(title);
    });
    await user.hover(await screen.findByRole("dialog"));
    act(() => {
      window.dispatchEvent(new FocusEvent("blur"));
    });
  }

  it("keeps a paused toast while the window is unfocused by default", async () => {
    render(<Toaster timeout={100} />);
    await showPausedToast("Wartet");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("pauseWhenUnfocused={false} closes toasts although the window has no focus (FiveM: UI closed)", async () => {
    render(<Toaster timeout={100} pauseWhenUnfocused={false} />);
    await showPausedToast("Schließt trotzdem");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: 2000 });
  });

  it("keeps counting while unfocused by default in FiveM NUI", async () => {
    const nui = window as { GetParentResourceName?: () => string };
    nui.GetParentResourceName = () => "my-resource";
    try {
      render(<Toaster timeout={100} />);
      await showPausedToast("NUI");
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: 2000 });
    } finally {
      delete nui.GetParentResourceName;
    }
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
    // Long unbroken words (URLs, IDs) wrap instead of overflowing the 320px toast.
    expect(item.querySelector("[data-slot=toast-content]")).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(screen.getByText("Neu.")).toHaveAttribute("data-slot", "toast-title");
    expect(screen.getByText("Details")).toHaveAttribute("data-slot", "toast-description");
    expect(screen.getByRole("button", { name: "Ansehen" })).toHaveAttribute("data-slot", "toast-action");
    expect(item.querySelector("[data-slot=toast-close]")).toHaveAttribute("aria-label", "Close");
  });

  it("defaults to bottom-right and moves the viewport when position changes at runtime", async () => {
    const { rerender } = render(<Toaster />);
    act(() => {
      toast("Gespeichert.");
    });
    const item = await screen.findByRole("dialog");
    const viewport = item.parentElement!;
    expect(viewport).toHaveAttribute("data-position", "bottom-right");
    expect(viewport).toHaveClass("bottom-6", "right-6", "flex-col-reverse");
    expect(item).toHaveClass("data-[starting-style]:[transform:translateY(0.5rem)]");

    rerender(<Toaster position="top-left" />);
    expect(viewport).toHaveAttribute("data-position", "top-left");
    expect(viewport).toHaveClass("top-6", "left-6", "flex-col", "fixed", "w-80");
    expect(viewport).not.toHaveClass("bottom-6", "right-6", "flex-col-reverse");
    // Top: slides down from above, swipes up/left.
    expect(item).toHaveClass(
      "data-[starting-style]:[transform:translateY(-0.5rem)]",
      "data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)_-_100%))]",
      "data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)_-_100%))]",
    );
    expect(item).not.toHaveClass("data-[starting-style]:[transform:translateY(0.5rem)]");

    rerender(<Toaster position="bottom-center" />);
    expect(viewport).toHaveAttribute("data-position", "bottom-center");
    expect(viewport).toHaveClass("bottom-6", "left-1/2", "-translate-x-1/2", "flex-col-reverse");
    expect(viewport).not.toHaveClass("top-6", "left-6");
    expect(item).toHaveClass("data-[starting-style]:[transform:translateY(0.5rem)]");

    rerender(<Toaster position="top-center" />);
    expect(viewport).toHaveClass("top-6", "left-1/2", "-translate-x-1/2", "flex-col");
  });

  it("keeps className overrides for other positions", async () => {
    render(<Toaster position="top-right" className="top-12" />);
    act(() => {
      toast("Hinweis");
    });
    const viewport = (await screen.findByRole("dialog")).parentElement!;
    expect(viewport).toHaveClass("top-12", "right-6");
    expect(viewport).not.toHaveClass("top-6");
  });
  it("actions={false} hides the action buttons", async () => {
    render(<Toaster actions={false} />);
    act(() => {
      toast("Gespeichert.", { action: { label: "Rückgängig", onClick: () => {} } });
    });
    const item = await screen.findByRole("dialog");
    expect(item.querySelector("[data-slot=toast-action]")).toBeNull();
  });

  describe("position per toast", () => {
    const stacks = () => Array.from(document.querySelectorAll<HTMLElement>("[data-slot=toaster]"));
    const stackOf = (text: string) => screen.getByText(text).closest<HTMLElement>("[data-slot=toaster]")!;

    it("renders only the main stack while no toast asks for its own position", async () => {
      render(<Toaster />);
      act(() => {
        toast("Normal");
      });
      await screen.findByText("Normal");
      expect(stacks()).toHaveLength(1);
      expect(stackOf("Normal")).toHaveAttribute("data-position", "bottom-right");
    });

    it("opens a stack per used position on demand and removes it after its last toast", async () => {
      render(<Toaster />);
      act(() => {
        toast("Unten rechts");
        toast.success("Oben links", { position: "top-left" });
        toast({ title: "Oben mittig", position: "top-center" });
      });
      expect(await screen.findByText("Oben links")).toBeInTheDocument();
      expect(stacks()).toHaveLength(3);
      expect(stackOf("Unten rechts")).toHaveAttribute("data-position", "bottom-right");
      const topLeft = stackOf("Oben links");
      expect(topLeft).toHaveAttribute("data-position", "top-left");
      expect(topLeft).toHaveClass("fixed", "top-6", "left-6", "flex-col", "w-80", "z-[100]");
      expect(topLeft).toHaveAttribute("role", "region");
      // Top position: slides down from above, swipes up.
      expect(screen.getByText("Oben links").closest("[data-slot=toast]")).toHaveClass(
        "data-[starting-style]:[transform:translateY(-0.5rem)]",
      );
      expect(stackOf("Oben mittig")).toHaveAttribute("data-position", "top-center");

      act(() => toast.dismiss());
      await waitFor(() => expect(stacks()).toHaveLength(1));
    });

    it("joins the main stack when the position is the Toaster's own", async () => {
      render(<Toaster position="top-right" />);
      act(() => {
        toast("Erster");
        toast("Zweiter", { position: "top-right" });
      });
      expect(await screen.findByText("Zweiter")).toBeInTheDocument();
      expect(stacks()).toHaveLength(1);
      expect(stackOf("Zweiter")).toBe(stackOf("Erster"));
    });

    it("keeps positioned toasts in place when the Toaster moves its main stack", async () => {
      const { rerender } = render(<Toaster />);
      act(() => {
        toast("Haupt");
        toast("Fest", { position: "top-left" });
      });
      await screen.findByText("Fest");
      rerender(<Toaster position="bottom-center" />);
      expect(stackOf("Haupt")).toHaveAttribute("data-position", "bottom-center");
      expect(stackOf("Fest")).toHaveAttribute("data-position", "top-left");
    });

    it("dismisses a positioned toast by id and runs its action", async () => {
      const user = userEvent.setup();
      const onUndo = vi.fn();
      render(<Toaster />);
      let id = "";
      act(() => {
        id = toast("Weg damit", { position: "bottom-left" });
        toast("Mit Aktion", { position: "top-right", action: { label: "Rückgängig", onClick: onUndo } });
      });
      expect(await screen.findByText("Weg damit")).toBeInTheDocument();
      act(() => toast.dismiss(id));
      await waitFor(() => expect(screen.queryByText("Weg damit")).not.toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: "Rückgängig" }));
      expect(onUndo).toHaveBeenCalledOnce();
      await waitFor(() => expect(screen.queryByText("Mit Aktion")).not.toBeInTheDocument());
    });

    it("applies the Toaster's timeout, closeButton and pauseWhenUnfocused to positioned stacks", async () => {
      render(<Toaster timeout={100} closeButton={false} pauseWhenUnfocused={false} />);
      const user = userEvent.setup();
      act(() => {
        toast("Oben", { position: "top-center" });
      });
      const item = await screen.findByRole("dialog");
      expect(item.querySelector("[data-slot=toast-close]")).toBeNull();
      await user.hover(item);
      act(() => {
        window.dispatchEvent(new FocusEvent("blur"));
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(), { timeout: 2000 });
    });

    it("toast.promise takes the position from its loading options", async () => {
      render(<Toaster />);
      let resolve: (value: string) => void = () => {};
      const promise = new Promise<string>((r) => {
        resolve = r;
      });
      act(() => {
        toast.promise(promise, {
          loading: { title: "Lädt …", position: "top-center" },
          success: "Fertig",
          error: "Fehler",
        });
      });
      await screen.findByText("Lädt …");
      expect(stackOf("Lädt …")).toHaveAttribute("data-position", "top-center");
      await act(async () => {
        resolve("ok");
        await promise;
      });
      await screen.findByText("Fertig");
      expect(stackOf("Fertig")).toHaveAttribute("data-position", "top-center");
    });
  });
});
