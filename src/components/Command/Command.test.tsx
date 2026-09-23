import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from ".";

// cmdk measures the list and scrolls the selected item into view; the ScrollArea viewport waits for
// animations. jsdom has none of these APIs.
beforeAll(() => {
  if (!Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => [];
  }
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }
});

function Menu({ onSelect = () => {} }: { onSelect?: (value: string) => void }) {
  return (
    <Command className="custom-command">
      <CommandInput placeholder="Suchen …" />
      <CommandList>
        <CommandEmpty>Keine Treffer</CommandEmpty>
        <CommandGroup heading="Vorschläge">
          <CommandItem onSelect={onSelect}>Kalender</CommandItem>
          <CommandItem onSelect={onSelect}>Rechner</CommandItem>
          <CommandItem disabled onSelect={onSelect}>
            Archiv
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Einstellungen">
          <CommandItem onSelect={onSelect}>
            Profil
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

describe("Command", () => {
  it("renders input, groups and items", () => {
    const { container } = render(<Menu />);
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", "Suchen …");
    expect(screen.getByText("Vorschläge")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(screen.getByText("⌘P")).toHaveAttribute("data-slot", "command-shortcut");
    expect(container.querySelector('[data-slot="command"]')).toHaveClass("custom-command", "bg-pui-popover");
    // The cmdk list is the preUI ScrollArea viewport (floating thumb, no native scrollbar), never a Tab stop.
    const list = screen.getByRole("listbox");
    expect(list).toHaveAttribute("cmdk-list");
    expect(list).toHaveAttribute("data-slot", "scroll-area-viewport");
    expect(list).toHaveAttribute("tabindex", "-1");
    expect(list).toHaveClass("max-h-72");
    expect(list.parentElement).toHaveAttribute("data-slot", "scroll-area");
  });

  it("keeps the selected item visible without scrolling the page", async () => {
    const pageScroll = vi.spyOn(Element.prototype, "scrollIntoView");
    const user = userEvent.setup();
    render(<Menu />);
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(pageScroll).not.toHaveBeenCalled();
    expect(screen.getAllByRole("option")[0].scrollIntoView).not.toBe(Element.prototype.scrollIntoView);
    pageScroll.mockRestore();
  });

  it("filters items by the search", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.type(screen.getByRole("combobox"), "rech");
    expect(screen.getByRole("option", { name: "Rechner" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Kalender" })).not.toBeInTheDocument();
    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "xyz");
    expect(screen.getByText("Keine Treffer")).toBeInTheDocument();
  });

  it("fires onSelect on click and on Enter", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Menu onSelect={onSelect} />);
    await user.click(screen.getByRole("option", { name: "Rechner" }));
    expect(onSelect).toHaveBeenLastCalledWith("Rechner");

    await user.type(screen.getByRole("combobox"), "kal");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith("Kalender");
  });

  it("marks disabled items and does not select them", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Menu onSelect={onSelect} />);
    const archive = screen.getByRole("option", { name: "Archiv" });
    expect(archive).toHaveAttribute("data-disabled", "true");
    expect(archive).toHaveAttribute("aria-disabled", "true");
    expect(archive).toHaveClass("data-[disabled=true]:opacity-50");
  });
});

describe("CommandDialog", () => {
  it("opens with an accessible title and the command palette", async () => {
    const user = userEvent.setup();
    function Palette() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Öffnen
          </button>
          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Befehl eingeben …" />
            <CommandList>
              <CommandEmpty>Nichts gefunden</CommandEmpty>
              <CommandItem>Neues Projekt</CommandItem>
            </CommandList>
          </CommandDialog>
        </>
      );
    }
    render(<Palette />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Öffnen" }));
    const dialog = await screen.findByRole("dialog", { name: "Command Palette" });
    expect(dialog).toHaveAccessibleDescription("Search for a command to run…");
    expect(screen.getByRole("option", { name: "Neues Projekt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("accepts custom title and hides the close button", async () => {
    render(
      <CommandDialog open title="Befehle" description="Suche einen Befehl" showCloseButton={false}>
        <CommandInput />
      </CommandDialog>,
    );
    const dialog = await screen.findByRole("dialog", { name: "Befehle" });
    expect(dialog).toHaveAccessibleDescription("Suche einen Befehl");
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});

describe("CommandDialog overlays", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders into a container with a contained scrim", async () => {
    function Framed() {
      const frameRef = useRef<HTMLDivElement>(null);
      return (
        <>
          <div ref={frameRef} data-testid="frame" className="relative overflow-hidden" />
          <CommandDialog open container={frameRef} overlayClassName="bg-pui-scrim/40">
            <CommandInput placeholder="Suchen …" />
          </CommandDialog>
        </>
      );
    }
    render(<Framed />);
    const dialog = await screen.findByRole("dialog");
    const overlay = document.querySelector("[data-slot=dialog-overlay]");
    expect(screen.getByTestId("frame")).toContainElement(dialog);
    expect(dialog).toHaveClass("absolute", "top-[15%]", "max-h-[70%]");
    expect(dialog).not.toHaveClass("fixed", "top-[15vh]", "max-h-[70vh]", "max-h-[85%]");
    expect(overlay).toHaveClass("absolute", "bg-pui-scrim/40");
  });

  it("renders no scrim with overlay={false}", async () => {
    render(
      <CommandDialog open overlay={false}>
        <CommandInput placeholder="Suchen …" />
      </CommandDialog>,
    );
    await screen.findByRole("dialog");
    expect(document.querySelector("[data-slot=dialog-overlay]")).toBeNull();
  });

  it("focuses the search input without scrolling", async () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    function Palette() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Palette
          </button>
          <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Suchen …" />
          </CommandDialog>
        </>
      );
    }
    const user = userEvent.setup();
    render(<Palette />);
    await user.click(screen.getByRole("button", { name: "Palette" }));
    const input = await screen.findByPlaceholderText("Suchen …");
    await waitFor(() => expect(input).toHaveFocus());
    const options = focus.mock.contexts.flatMap((context, index) => (context === input ? [focus.mock.calls[index]![0]] : []));
    expect(options).toEqual([{ preventScroll: true }]);
  });
});
