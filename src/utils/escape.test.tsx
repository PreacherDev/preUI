import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../components/Dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/DropdownMenu";
import { KeybindInput } from "../components/KeybindInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { Toaster, toast } from "../components/Toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/Tooltip";
import { isOverlayOpen, useEscapeKey, type UseEscapeKeyOptions } from "./escape";
import { useWindowToggle, type UseWindowToggleOptions } from "./use-window-toggle";

const items = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
];

/** A Dialog with a Select inside, plus a DropdownMenu — the popups a NUI window typically has. */
function Popups() {
  return (
    <>
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Settings</DialogTitle>
          <Select items={items}>
            <SelectTrigger>
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

const escape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

describe("isOverlayOpen", () => {
  it("is false with nothing open, and on an empty root", () => {
    render(<Popups />);
    expect(isOverlayOpen()).toBe(false);
  });

  it("is true while a Dialog is open and false again after it closed", async () => {
    const user = userEvent.setup();
    render(<Popups />);
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog", { name: "Settings" });
    expect(isOverlayOpen()).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(isOverlayOpen()).toBe(false);
  });

  it("is true while a DropdownMenu is open", async () => {
    const user = userEvent.setup();
    render(<Popups />);
    await user.click(screen.getByText("Open menu"));
    await screen.findByRole("menu");
    expect(isOverlayOpen()).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(isOverlayOpen()).toBe(false);
  });

  it("counts an open Select, not a closed one that stays mounted", async () => {
    const user = userEvent.setup();
    render(
      <Select items={items}>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    await user.click(screen.getByRole("combobox"));
    await screen.findByRole("listbox");
    expect(isOverlayOpen()).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.querySelector('[data-slot="select-content"][data-open]')).toBeNull());
    expect(isOverlayOpen()).toBe(false);
  });

  it("ignores toasts (role=dialog) and tooltips", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tip</TooltipContent>
        </Tooltip>
        <Toaster />
      </TooltipProvider>,
    );
    act(() => {
      toast("Saved", { timeout: 0 });
    });
    await screen.findByRole("dialog");
    await user.hover(screen.getByText("Hover me"));
    await screen.findByText("Tip");
    expect(document.querySelector('[data-slot="tooltip-content"][data-open]')).not.toBeNull();
    expect(isOverlayOpen()).toBe(false);
  });

  it("counts a KeybindInput that is recording", async () => {
    const user = userEvent.setup();
    render(<KeybindInput />);
    expect(isOverlayOpen()).toBe(false);
    await user.click(screen.getByRole("button"));
    expect(isOverlayOpen()).toBe(true);
  });

  it("only looks inside the given root", async () => {
    const user = userEvent.setup();
    const { container } = render(<Popups />);
    await user.click(screen.getByText("Open menu"));
    await screen.findByRole("menu");
    expect(isOverlayOpen(document.body)).toBe(true);
    expect(isOverlayOpen(container)).toBe(false); // the menu is portalled to <body>
  });
});

describe("useEscapeKey", () => {
  function Page({ onEscape, ...options }: UseEscapeKeyOptions & { onEscape: () => void }) {
    useEscapeKey(onEscape, options);
    return <Popups />;
  }

  it("calls the handler for Escape", () => {
    const onEscape = vi.fn();
    render(<Page onEscape={onEscape} />);
    escape();
    expect(onEscape).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("is ignored while an overlay is open: the first Escape closes only the popup", async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(<Page onEscape={onEscape} />);
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("combobox"));
    await screen.findByRole("listbox");

    await user.keyboard("{Escape}"); // closes the Select
    await waitFor(() => expect(document.querySelector('[data-slot="select-content"][data-open]')).toBeNull());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}"); // closes the Dialog
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onEscape).not.toHaveBeenCalled();
    await user.keyboard("{Escape}"); // now it's ours
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("with ignoreWhenOverlayOpen={false} fires even with an open menu", async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(<Page onEscape={onEscape} ignoreWhenOverlayOpen={false} />);
    await user.click(screen.getByText("Open menu"));
    await screen.findByRole("menu");
    escape();
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("respects enabled={false}", () => {
    const onEscape = vi.fn();
    render(<Page onEscape={onEscape} enabled={false} />);
    escape();
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("capture={false} skips an Escape a component handled, and still skips overlays", async () => {
    const user = userEvent.setup();
    const onEscape = vi.fn();
    render(
      <>
        <Page onEscape={onEscape} capture={false} />
        <input aria-label="search" onKeyDown={(event) => event.key === "Escape" && event.preventDefault()} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("search"), { key: "Escape" });
    expect(onEscape).not.toHaveBeenCalled();
    await user.click(screen.getByText("Open menu"));
    await screen.findByRole("menu");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(onEscape).not.toHaveBeenCalled();
    escape();
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});

describe("useWindowToggle", () => {
  function Window({ label = "Window", ...options }: UseWindowToggleOptions & { label?: string }) {
    const { open, close, toggle } = useWindowToggle(options);
    return (
      <>
        <input aria-label="chat" />
        <button onClick={toggle}>toggle</button>
        {open && (
          <section aria-label={label}>
            <button onClick={close}>close</button>
            <Popups />
          </section>
        )}
      </>
    );
  }
  const windowShown = () => screen.queryByRole("region", { name: "Window", hidden: true }) !== null;

  it("Escape closes, F1 reopens (openKeys only open)", async () => {
    const user = userEvent.setup();
    render(<Window defaultOpen openKeys={["F1"]} />);
    expect(windowShown()).toBe(true);
    await user.keyboard("{F1}"); // already open: nothing
    expect(windowShown()).toBe(true);
    await user.keyboard("{Escape}");
    expect(windowShown()).toBe(false);
    await user.keyboard("{F1}");
    expect(windowShown()).toBe(true);
  });

  it("toggleKeys open and close; the default is closed", async () => {
    const user = userEvent.setup();
    render(<Window toggleKeys={["F2"]} />);
    expect(windowShown()).toBe(false);
    await user.keyboard("{F2}");
    expect(windowShown()).toBe(true);
    await user.keyboard("{F2}");
    expect(windowShown()).toBe(false);
  });

  it("prevents the browser default of the key (F1 = help)", () => {
    render(<Window openKeys={["F1"]} />);
    const event = new KeyboardEvent("keydown", { key: "F1", bubbles: true, cancelable: true });
    act(() => {
      document.body.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(windowShown()).toBe(true);
  });

  it("ignores key repeats", () => {
    render(<Window toggleKeys={["F1"]} />);
    fireEvent.keyDown(document.body, { key: "F1", repeat: true });
    expect(windowShown()).toBe(false);
    fireEvent.keyDown(document.body, { key: "F1" });
    expect(windowShown()).toBe(true);
    fireEvent.keyDown(document.body, { key: "Escape", repeat: true });
    expect(windowShown()).toBe(true);
  });

  it("letter keys don't fire while typing into an input; F-keys do", async () => {
    const user = userEvent.setup();
    render(<Window toggleKeys={["i", "F1"]} />);
    await user.click(screen.getByLabelText("chat"));
    await user.keyboard("i");
    expect(windowShown()).toBe(false);
    expect(screen.getByLabelText("chat")).toHaveValue("i");
    await user.keyboard("{F1}");
    expect(windowShown()).toBe(true);
    await user.click(document.body);
    await user.keyboard("I"); // letters ignore case
    expect(windowShown()).toBe(false);
    await user.keyboard("{Control>}i{/Control}"); // but not with Ctrl
    expect(windowShown()).toBe(false);
  });

  it("matches key codes and Keybind combinations", () => {
    render(<Window toggleKeys={["KeyM", { key: "k", code: "KeyK", ctrl: true }]} />);
    fireEvent.keyDown(document.body, { key: "m", code: "KeyM" });
    expect(windowShown()).toBe(true);
    fireEvent.keyDown(document.body, { key: "k", code: "KeyK" }); // without Ctrl: no
    expect(windowShown()).toBe(true);
    fireEvent.keyDown(document.body, { key: "k", code: "KeyK", ctrlKey: true });
    expect(windowShown()).toBe(false);
  });

  it("a modifier can be the toggle key itself (Alt)", () => {
    render(<Window toggleKeys={["Alt"]} />);
    fireEvent.keyDown(document.body, { key: "Alt", code: "AltLeft", altKey: true });
    expect(windowShown()).toBe(true);
    fireEvent.keyDown(document.body, { key: "Control", code: "ControlLeft", ctrlKey: true, altKey: true });
    expect(windowShown()).toBe(true);
  });

  it("leaves Escape to an open Select / Dialog first", async () => {
    const user = userEvent.setup();
    render(<Window defaultOpen openKeys={["F1"]} />);
    await user.click(screen.getByText("Open dialog"));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("combobox"));
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.querySelector('[data-slot="select-content"][data-open]')).toBeNull());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(windowShown()).toBe(true);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(windowShown()).toBe(true);
    await user.keyboard("{Escape}");
    expect(windowShown()).toBe(false);
  });

  it("closes with an open toast, which never owns Escape", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Window defaultOpen />
        <Toaster />
      </>,
    );
    act(() => {
      toast("Saved", { timeout: 0 });
    });
    await screen.findByText("Saved");
    await user.keyboard("{Escape}");
    expect(windowShown()).toBe(false);
  });

  it("closes while a tooltip is shown (Base UI tooltips swallow Escape in the bubble phase)", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <Window defaultOpen />
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Tip</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.hover(screen.getByText("Hover me"));
    await screen.findByText("Tip");
    await user.keyboard("{Escape}");
    expect(windowShown()).toBe(false);
  });

  it("closeOnEscape={false} and enabled={false}", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Window defaultOpen closeOnEscape={false} toggleKeys={["F1"]} />);
    await user.keyboard("{Escape}");
    expect(windowShown()).toBe(true);
    rerender(<Window defaultOpen enabled={false} toggleKeys={["F1"]} />);
    await user.keyboard("{F1}");
    await user.keyboard("{Escape}");
    expect(windowShown()).toBe(true);
    await user.click(screen.getByText("close")); // the functions keep working
    expect(windowShown()).toBe(false);
  });

  it("controlled: reports the reason and follows the prop", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <Window
          open={open}
          onOpenChange={(next, details) => {
            onOpenChange(next, details.reason);
            setOpen(next);
          }}
          openKeys={["F1"]}
        />
      );
    }
    render(<Controlled />);
    await user.keyboard("{Escape}");
    expect(windowShown()).toBe(false);
    await user.keyboard("{F1}");
    expect(windowShown()).toBe(true);
    await user.click(screen.getByText("toggle"));
    expect(onOpenChange.mock.calls).toEqual([
      [false, "escape"],
      [true, "key"],
      [false, "imperative"],
    ]);
  });

  it("controlled without updating the prop stays as it is", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Window open onOpenChange={onOpenChange} />);
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: "escape" }));
    expect(windowShown()).toBe(true);
  });
});
