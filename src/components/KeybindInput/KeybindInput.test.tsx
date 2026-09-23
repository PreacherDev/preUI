import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { KeybindInput, formatKeybind, keybindFromEvent, matchesKeybind, type Keybind } from "./KeybindInput";

function field() {
  return document.querySelector<HTMLElement>('[data-slot="keybind-input"]')!;
}

function trigger() {
  return document.querySelector<HTMLButtonElement>('[data-slot="keybind-input-trigger"]')!;
}

function keys() {
  return [...document.querySelectorAll('[data-slot="keybind-input-key"]')].map((el) => el.textContent);
}

describe("formatKeybind / keybindFromEvent / matchesKeybind", () => {
  it("formats modifiers first and uses layout-independent names", () => {
    expect(formatKeybind(null)).toEqual([]);
    expect(formatKeybind({ key: "f", code: "KeyF", shift: true, ctrl: true })).toEqual(["Ctrl", "Shift", "F"]);
    expect(formatKeybind({ key: " ", code: "Space" })).toEqual(["Space"]);
    expect(formatKeybind({ key: "!", code: "Digit1", shift: true })).toEqual(["Shift", "1"]);
    expect(formatKeybind({ key: "ArrowUp", code: "ArrowUp" })).toEqual(["Up"]);
    expect(formatKeybind({ key: "Shift", code: "ShiftLeft" })).toEqual(["Shift"]);
  });

  it("supports custom key names", () => {
    const formatKey = (key: string) => ({ " ": "Leertaste", Control: "Strg" })[key];
    expect(formatKeybind({ key: " ", code: "Space", ctrl: true }, { formatKey })).toEqual(["Strg", "Leertaste"]);
  });

  it("builds a keybind from an event and matches events", () => {
    const event = { key: "F", code: "KeyF", ctrlKey: false, altKey: false, shiftKey: true, metaKey: false };
    const bind = keybindFromEvent(event);
    expect(bind).toEqual({ key: "f", code: "KeyF", shift: true });
    expect(keybindFromEvent(event, { allowModifiers: false })).toEqual({ key: "f", code: "KeyF" });
    expect(matchesKeybind(event, bind)).toBe(true);
    expect(matchesKeybind({ ...event, shiftKey: false }, bind)).toBe(false);
    expect(matchesKeybind(event, null)).toBe(false);
  });
});

describe("KeybindInput", () => {
  it("renders the field with the placeholder and an accessible name", () => {
    render(<KeybindInput />);
    expect(field()).toHaveClass("rounded-pui-md", "border-pui-input", "h-pui-control");
    expect(screen.getByRole("button", { name: "Keybind: not set" })).toBe(trigger());
    expect(screen.getByText("Not set")).toHaveAttribute("data-slot", "keybind-input-placeholder");
  });

  it("shows the value as key caps and describes it", () => {
    render(<KeybindInput defaultValue={{ key: "f", code: "KeyF", shift: true }} aria-label="Open menu" />);
    expect(keys()).toEqual(["Shift", "F"]);
    expect(trigger()).toHaveAccessibleName("Open menu, Keybind: Shift + F");
  });

  it("starts listening on click and captures the next key with modifiers", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onListeningChange = vi.fn();
    render(<KeybindInput onValueChange={onValueChange} onListeningChange={onListeningChange} />);
    await user.click(trigger());
    expect(field()).toHaveAttribute("data-listening");
    expect(screen.getByText("Press a key…")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Listening");
    expect(onListeningChange).toHaveBeenLastCalledWith(true);
    await user.keyboard("{Control>}{Shift>}k{/Shift}{/Control}");
    expect(onValueChange).toHaveBeenCalledWith({ key: "k", code: "KeyK", ctrl: true, shift: true });
    expect(field()).not.toHaveAttribute("data-listening");
    expect(keys()).toEqual(["Ctrl", "Shift", "K"]);
    expect(onListeningChange).toHaveBeenLastCalledWith(false);
  });

  it("starts listening with Enter and Space and can bind Enter / Space themselves", async () => {
    const user = userEvent.setup();
    render(<KeybindInput />);
    trigger().focus();
    await user.keyboard("{Enter}");
    expect(field()).toHaveAttribute("data-listening");
    await user.keyboard("{Enter}");
    expect(keys()).toEqual(["Enter"]);
    await user.keyboard(" ");
    expect(field()).toHaveAttribute("data-listening");
    await user.keyboard(" ");
    expect(field()).not.toHaveAttribute("data-listening");
    expect(keys()).toEqual(["Space"]);
  });

  it("binds a lone modifier on release", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<KeybindInput onValueChange={onValueChange} />);
    await user.click(trigger());
    await user.keyboard("{Shift}");
    expect(onValueChange).toHaveBeenCalledWith({ key: "Shift", code: "ShiftLeft" });
  });

  it("ignores modifiers with allowModifiers={false}", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<KeybindInput allowModifiers={false} onValueChange={onValueChange} />);
    await user.click(trigger());
    await user.keyboard("{Shift}");
    expect(onValueChange).not.toHaveBeenCalled();
    await user.keyboard("{Shift>}g{/Shift}");
    expect(onValueChange).toHaveBeenCalledWith({ key: "g", code: "KeyG" });
  });

  it("cancels with Escape and keeps the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<KeybindInput defaultValue={{ key: "e", code: "KeyE" }} onValueChange={onValueChange} />);
    await user.click(trigger());
    await user.keyboard("{Escape}");
    expect(field()).not.toHaveAttribute("data-listening");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(keys()).toEqual(["E"]);
  });

  it("clicking again or blurring cancels listening", async () => {
    const user = userEvent.setup();
    render(<KeybindInput />);
    await user.click(trigger());
    await user.click(trigger());
    expect(field()).not.toHaveAttribute("data-listening");
    await user.click(trigger());
    await user.tab();
    expect(field()).not.toHaveAttribute("data-listening");
  });

  it("ignores disallowed keys", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<KeybindInput disallowedKeys={["Escape", "F1"]} onValueChange={onValueChange} />);
    await user.click(trigger());
    await user.keyboard("{F1}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(field()).toHaveAttribute("data-listening");
  });

  it("clears with Backspace / Delete while listening and with the clear button", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<KeybindInput defaultValue={{ key: "e", code: "KeyE" }} onValueChange={onValueChange} />);
    await user.click(trigger());
    await user.keyboard("{Backspace}");
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText("Not set")).toBeInTheDocument();
    await user.click(trigger());
    await user.keyboard("q");
    await user.click(screen.getByRole("button", { name: "Clear keybind" }));
    expect(onValueChange).toHaveBeenLastCalledWith(null);
    expect(trigger()).toHaveFocus();
  });

  it("binds Backspace when not clearable", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<KeybindInput clearable={false} defaultValue={{ key: "e", code: "KeyE" }} onValueChange={onValueChange} />);
    expect(screen.queryByRole("button", { name: "Clear keybind" })).toBeNull();
    await user.click(trigger());
    await user.keyboard("{Backspace}");
    expect(onValueChange).toHaveBeenCalledWith({ key: "Backspace", code: "Backspace" });
  });

  it("works controlled", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<Keybind | null>({ key: "m", code: "KeyM" });
      return (
        <>
          <KeybindInput value={value} onValueChange={setValue} />
          <span data-testid="out">{value ? value.code : "none"}</span>
        </>
      );
    }
    render(<Controlled />);
    expect(keys()).toEqual(["M"]);
    await user.click(trigger());
    await user.keyboard("{Alt>}x{/Alt}");
    expect(screen.getByTestId("out")).toHaveTextContent("KeyX");
    expect(keys()).toEqual(["Alt", "X"]);
  });

  it("controlled value without updates stays unchanged", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<KeybindInput value={null} onValueChange={onValueChange} />);
    await user.click(trigger());
    await user.keyboard("z");
    expect(onValueChange).toHaveBeenCalledWith({ key: "z", code: "KeyZ" });
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("does nothing when disabled", async () => {
    const user = userEvent.setup();
    render(<KeybindInput disabled defaultValue={{ key: "e", code: "KeyE" }} />);
    expect(trigger()).toBeDisabled();
    expect(field()).toHaveAttribute("data-disabled");
    expect(field()).toHaveClass("data-[disabled]:opacity-50");
    expect(screen.queryByRole("button", { name: "Clear keybind" })).toBeNull();
    await user.click(trigger());
    expect(field()).not.toHaveAttribute("data-listening");
  });

  it("marks invalid, merges classes, forwards the ref and uses custom labels / formatKey", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <KeybindInput
        ref={ref}
        invalid
        className="w-48 px-1"
        buttonClassName="font-mono"
        name="menuKey"
        defaultValue={{ key: " ", code: "Space", ctrl: true }}
        formatKey={(key) => ({ " ": "Leertaste", Control: "Strg" })[key]}
        labels={{ binding: (b) => (b ? `Taste: ${b}` : "Keine Taste") }}
      />,
    );
    expect(ref.current).toBe(trigger());
    expect(field()).toHaveAttribute("data-invalid");
    expect(field()).toHaveClass("w-48", "px-1");
    expect(field()).not.toHaveClass("w-full", "p-0");
    expect(trigger()).toHaveClass("font-mono");
    expect(trigger()).toHaveAttribute("aria-invalid", "true");
    expect(keys()).toEqual(["Strg", "Leertaste"]);
    expect(trigger()).toHaveAccessibleName("Taste: Strg + Leertaste");
    expect(document.querySelector<HTMLInputElement>('input[name="menuKey"]')!.value).toBe(
      JSON.stringify({ key: " ", code: "Space", ctrl: true }),
    );
  });
});
