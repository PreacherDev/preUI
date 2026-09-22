import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderToStringAndHydrate } from "../../test-utils/ssr";
import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerEyeDropper,
  ColorPickerHue,
  ColorPickerInput,
  ColorPickerSwatches,
  ColorPickerTrigger,
  useColorPicker,
} from "./ColorPicker";

const area = () => screen.getByRole("slider", { name: "Saturation and brightness" });
const hue = () => screen.getByRole("slider", { name: "Hue" });
const hexInput = () => screen.getByRole("textbox", { name: "Hex" });

function Inline(props: Parameters<typeof ColorPicker>[0]) {
  return <ColorPicker inline {...props} />;
}

describe("ColorPicker", () => {
  it("inline default layout: area, hue, input, data-slots", () => {
    const { container } = render(<Inline defaultValue="#ff0000" swatches={["#ff0000", "#00ff00"]} />);
    const root = container.querySelector('[data-slot="color-picker"]')!;
    expect(root).toBeInTheDocument();
    for (const slot of [
      "color-picker-area",
      "color-picker-area-thumb",
      "color-picker-hue",
      "color-picker-input",
      "color-picker-swatches",
      "color-picker-swatch",
    ]) {
      expect(root.querySelector(`[data-slot="${slot}"]`), slot).toBeInTheDocument();
    }
    // Alpha only with the `alpha` prop, the eye dropper not at all in jsdom (no window.EyeDropper).
    expect(root.querySelector('[data-slot="color-picker-alpha"]')).toBeNull();
    expect(root.querySelector('[data-slot="color-picker-eye-dropper"]')).toBeNull();
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 100%, brightness 100%");
    expect(hexInput()).toHaveValue("#ff0000");
    expect(hue()).toHaveAttribute("aria-valuenow", "0");
  });

  it("area keyboard: arrows ±1, Shift ±10, Home/End, PageUp/PageDown; commits every key", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(<Inline defaultValue="#808080" onValueChange={onValueChange} onValueCommit={onValueCommit} />);
    // #808080 = s 0, v 50.2
    area().focus();
    await user.keyboard("{ArrowRight}");
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 1%, brightness 50%");
    await user.keyboard("{Shift>}{ArrowRight}{ArrowUp}{/Shift}");
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 11%, brightness 60%");
    await user.keyboard("{ArrowDown}{ArrowLeft}");
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 10%, brightness 59%");
    await user.keyboard("{End}");
    expect(area()).toHaveAttribute("aria-valuenow", "100");
    await user.keyboard("{Home}");
    expect(area()).toHaveAttribute("aria-valuenow", "0");
    await user.keyboard("{PageUp}");
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 0%, brightness 69%");
    await user.keyboard("{PageDown}{PageDown}");
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 0%, brightness 49%");
    expect(onValueCommit).toHaveBeenCalledTimes(10);
    expect(onValueChange).toHaveBeenLastCalledWith("#7d7d7d", expect.anything());
  });

  it("area clamps at the edges", async () => {
    const user = userEvent.setup();
    render(<Inline defaultValue="#ffffff" />);
    area().focus();
    await user.keyboard("{ArrowUp}{ArrowLeft}");
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 0%, brightness 100%");
  });

  it("area pointer: press + drag sets saturation/brightness, release commits", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(<Inline defaultValue="#ff0000" onValueChange={onValueChange} onValueCommit={onValueCommit} />);
    const el = area();
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, clientX: 100, clientY: 50 });
    expect(el).toHaveAttribute("aria-valuetext", "Saturation 50%, brightness 50%");
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 300, clientY: -20 });
    expect(el).toHaveAttribute("aria-valuetext", "Saturation 100%, brightness 100%");
    expect(onValueCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(el, { pointerId: 1 });
    expect(onValueCommit).toHaveBeenCalledWith("#ff0000", expect.anything());
    expect(onValueChange).toHaveBeenCalledWith("#804040", expect.anything());
    // Moves after the release do nothing.
    fireEvent.pointerMove(el, { pointerId: 1, clientX: 0, clientY: 100 });
    expect(el).toHaveAttribute("aria-valuetext", "Saturation 100%, brightness 100%");
  });

  it("hue keyboard changes the hue, keeps saturation / brightness", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Inline defaultValue="#ff0000" onValueChange={onValueChange} />);
    hue().focus();
    await user.keyboard("{PageUp}");
    expect(hue()).toHaveAttribute("aria-valuenow", "10");
    await user.keyboard("{End}");
    expect(hue()).toHaveAttribute("aria-valuenow", "360");
    await user.keyboard("{Home}{ArrowRight}");
    expect(hue()).toHaveAttribute("aria-valuenow", "1");
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 100%, brightness 100%");
    expect(onValueChange).toHaveBeenCalled();
  });

  it("keeps the hue when the colour becomes black or grey", async () => {
    const user = userEvent.setup();
    render(<Inline defaultValue="#10b77f" />);
    expect(hue()).toHaveAttribute("aria-valuenow", "160");
    area().focus();
    for (let i = 0; i < 11; i++) await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(hexInput()).toHaveValue("#000000");
    expect(hue()).toHaveAttribute("aria-valuenow", "160");
    // Back up again: the colour is the same green-ish hue, the saturation survived as well.
    await user.keyboard("{PageUp}{PageUp}{PageUp}{PageUp}{PageUp}");
    expect(area()).toHaveAttribute("aria-valuetext", "Saturation 91%, brightness 50%");
    // Typing a grey keeps the hue too.
    await user.clear(hexInput());
    await user.type(hexInput(), "#777777{Enter}");
    expect(hue()).toHaveAttribute("aria-valuenow", "160");
  });

  it("hex input: validates, commits on Enter and blur, Escape restores", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(<Inline defaultValue="#ff0000" onValueChange={onValueChange} onValueCommit={onValueCommit} />);
    const input = hexInput();
    await user.clear(input);
    await user.type(input, "#zz");
    expect(input).toHaveAttribute("aria-invalid", "true");
    await user.keyboard("{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("#ff0000");
    expect(input).not.toHaveAttribute("aria-invalid");

    await user.clear(input);
    await user.type(input, "0f0");
    expect(onValueChange).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenLastCalledWith("#00ff00", expect.anything());
    expect(onValueCommit).toHaveBeenLastCalledWith("#00ff00", expect.anything());
    expect(input).toHaveValue("#00ff00");
    expect(hue()).toHaveAttribute("aria-valuenow", "120");

    await user.clear(input);
    await user.type(input, "rgb(0, 0, 255)");
    await user.tab();
    expect(onValueCommit).toHaveBeenLastCalledWith("#0000ff", expect.anything());

    await user.clear(input);
    await user.type(input, "#123456{Escape}");
    expect(input).toHaveValue("#0000ff");
  });

  it("uncontrolled: keeps its own state", async () => {
    const user = userEvent.setup();
    render(<Inline defaultValue="#ff0000" swatches={["#0000ff"]} />);
    await user.click(screen.getByRole("button", { name: "#0000ff" }));
    expect(hexInput()).toHaveValue("#0000ff");
    expect(screen.getByRole("button", { name: "#0000ff" })).toHaveAttribute("aria-pressed", "true");
  });

  it("controlled: follows value, reports changes, a rejected change snaps back", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<Inline value="#ff0000" onValueChange={onValueChange} swatches={["#00ff00"]} />);
    await user.click(screen.getByRole("button", { name: "#00ff00" }));
    expect(onValueChange).toHaveBeenCalledWith("#00ff00", expect.anything());
    // Parent did not accept the change → still red.
    expect(hexInput()).toHaveValue("#ff0000");
    rerender(<Inline value="#0000FF" onValueChange={onValueChange} />);
    expect(hexInput()).toHaveValue("#0000ff");
    expect(hue()).toHaveAttribute("aria-valuenow", "240");
  });

  it("controlled via state: the hue survives the round trip through the parent", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [color, setColor] = useState("#3366cc");
      return (
        <>
          <Inline value={color} onValueChange={setColor} />
          <output data-testid="out">{color}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(hue()).toHaveAttribute("aria-valuenow", "220");
    area().focus();
    await user.keyboard("{Home}");
    expect(screen.getByTestId("out")).toHaveTextContent("#cccccc");
    expect(hue()).toHaveAttribute("aria-valuenow", "220");
  });

  it("alpha: slider, #rrggbbaa value, checkerboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<Inline alpha defaultValue="#ff000080" onValueChange={onValueChange} />);
    expect(container.querySelector('[data-slot="color-picker-alpha"]')).toBeInTheDocument();
    const alpha = screen.getByRole("slider", { name: "Alpha" });
    expect(alpha).toHaveAttribute("aria-valuenow", "50");
    expect(hexInput()).toHaveValue("#ff000080");
    alpha.focus();
    await user.keyboard("{End}");
    expect(onValueChange).toHaveBeenLastCalledWith("#ff0000ff", expect.anything());
    await user.keyboard("{Home}");
    expect(hexInput()).toHaveValue("#ff000000");
  });

  it("without alpha, a translucent value is shown opaque", () => {
    render(<Inline defaultValue="#ff000080" />);
    expect(hexInput()).toHaveValue("#ff0000");
  });

  it("disabled: area not focusable, controls disabled, keys ignored", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<Inline disabled defaultValue="#ff0000" swatches={["#00ff00"]} onValueChange={onValueChange} />);
    expect(container.querySelector('[data-slot="color-picker"]')).toHaveAttribute("data-disabled");
    expect(area()).toHaveAttribute("tabindex", "-1");
    expect(area()).toHaveAttribute("aria-disabled", "true");
    expect(hexInput()).toBeDisabled();
    expect(screen.getByRole("button", { name: "#00ff00" })).toBeDisabled();
    fireEvent.keyDown(area(), { key: "ArrowLeft" });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("labels and getAreaValueText are configurable", () => {
    render(
      <Inline
        defaultValue="#ff0000"
        labels={{ area: "Sättigung und Helligkeit", hue: "Farbton" }}
        getAreaValueText={(s, v) => `Sättigung ${s} %, Helligkeit ${v} %`}
      />,
    );
    expect(screen.getByRole("slider", { name: "Sättigung und Helligkeit" })).toHaveAttribute(
      "aria-valuetext",
      "Sättigung 100 %, Helligkeit 100 %",
    );
    expect(screen.getByRole("slider", { name: "Farbton" })).toBeInTheDocument();
  });

  it("popover: swatch trigger opens the default layout, Escape closes", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ColorPicker defaultValue="#10b77f" onOpenChange={onOpenChange} />);
    const trigger = screen.getByRole("button", { name: "Choose color" });
    expect(trigger).toHaveAttribute("data-slot", "color-picker-trigger");
    expect(trigger.querySelector('[data-slot="color-picker-trigger-swatch"]')).toHaveStyle({ background: "#10b77f" });
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "color-picker-content");
    expect(dialog).toHaveClass("bg-pui-popover", "border-pui-border", "rounded-pui-md", "w-64");
    expect(area()).toBeInTheDocument();
    expect(hexInput()).toHaveValue("#10b77f");
    expect(onOpenChange).toHaveBeenLastCalledWith(true, expect.anything());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("popover: controlled open + own composition + trigger label", async () => {
    const user = userEvent.setup();
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <ColorPicker defaultValue="#ff0000" open={open} onOpenChange={setOpen}>
          <ColorPickerTrigger aria-label="Akzentfarbe Farbwähler" className="size-7" />
          <ColorPickerContent data-testid="content" className="w-80">
            <ColorPickerArea className="h-40" />
            <ColorPickerHue />
            <ColorPickerInput />
            <ColorPickerSwatches swatches={[{ value: "#0000ff", label: "Blau" }]} />
          </ColorPickerContent>
        </ColorPicker>
      );
    }
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Akzentfarbe Farbwähler" });
    expect(trigger).toHaveClass("size-7");
    await user.click(trigger);
    const content = await screen.findByTestId("content");
    expect(content).toHaveClass("w-80", "p-3");
    expect(area()).toHaveClass("h-40");
    await user.click(screen.getByRole("button", { name: "Blau" }));
    expect(hexInput()).toHaveValue("#0000ff");
  });

  it("disabled popover trigger does not open", async () => {
    const user = userEvent.setup();
    render(<ColorPicker disabled defaultValue="#ff0000" />);
    const trigger = screen.getByRole("button", { name: "Choose color" });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("alpha trigger shows a checkerboard", () => {
    render(<ColorPicker alpha defaultValue="#ff000080" />);
    const swatch = screen.getByRole("button", { name: "Choose color" }).querySelector('[data-slot="color-picker-trigger-swatch"]')!;
    expect((swatch as HTMLElement).style.background).toContain("conic-gradient");
  });

  it("renders a hidden input for forms", () => {
    const { container } = render(<Inline name="accent" defaultValue="#ABCDEF" />);
    expect(container.querySelector('input[type="hidden"][name="accent"]')).toHaveValue("#abcdef");
  });

  it("useColorPicker gives own parts access to the state", async () => {
    const user = userEvent.setup();
    function Lightness() {
      const { hsva, setHsva } = useColorPicker();
      return (
        <button type="button" onClick={() => setHsva({ ...hsva, v: 0 }, true)}>
          Schwarz {Math.round(hsva.h)}
        </button>
      );
    }
    render(
      <Inline defaultValue="#10b77f">
        <ColorPickerHue />
        <ColorPickerInput />
        <Lightness />
      </Inline>,
    );
    await user.click(screen.getByRole("button", { name: /Schwarz/ }));
    expect(hexInput()).toHaveValue("#000000");
    expect(hue()).toHaveAttribute("aria-valuenow", "160");
    expect(() => render(<ColorPickerHue />)).toThrow(/inside <ColorPicker>/);
  });

  it("eye dropper appears only when window.EyeDropper exists", async () => {
    const user = userEvent.setup();
    const open = vi.fn().mockResolvedValue({ sRGBHex: "#123456" });
    (window as unknown as { EyeDropper: unknown }).EyeDropper = class {
      open = open;
    };
    try {
      render(
        <Inline defaultValue="#ff0000">
          <ColorPickerInput />
          <ColorPickerEyeDropper />
        </Inline>,
      );
      const button = await screen.findByRole("button", { name: "Pick a color from the screen" });
      await user.click(button);
      await waitFor(() => expect(hexInput()).toHaveValue("#123456"));
    } finally {
      delete (window as unknown as { EyeDropper?: unknown }).EyeDropper;
    }
  });

  it("merges className on parts, including the function form on the content", async () => {
    const user = userEvent.setup();
    render(
      <ColorPicker defaultValue="#ff0000" className="custom-root">
        <ColorPickerTrigger />
        <ColorPickerContent className={() => "from-fn"}>
          <ColorPickerAlpha />
        </ColorPickerContent>
      </ColorPicker>,
    );
    expect(document.querySelector('[data-slot="color-picker"]')).toHaveClass("custom-root", "inline-flex");
    await user.click(screen.getByRole("button", { name: "Choose color" }));
    expect(await screen.findByRole("dialog")).toHaveClass("from-fn");
  });

  it("SSR: renderToString + hydrate without mismatch (popover and inline)", async () => {
    const result = await renderToStringAndHydrate(
      <div>
        <ColorPicker defaultValue="#10b77f" swatches={["#ff0000"]} />
        <ColorPicker inline alpha defaultValue="#10b77f80" swatches={["#ff0000"]} />
      </div>,
    );
    expect(result.html).toContain('data-slot="color-picker-trigger"');
    expect(result.html).toContain('data-slot="color-picker-area"');
    expect(result.html).not.toContain("color-picker-eye-dropper");
    expect(result.errors).toEqual([]);
    result.unmount();
  });
});
