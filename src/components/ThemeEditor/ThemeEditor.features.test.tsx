// The editor features added in 0.9: undo/redo + saved state, contrast repair, light-from-dark, import, sections,
// saving presets, all colour tokens, the style sliders, fonts with files and the game sample.
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { checkThemeConfigContrast, type ThemeConfig } from "../../theming/theme-config";
import { ThemeEditor } from "./ThemeEditor";

const slot = (container: HTMLElement, name: string) => container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

describe("ThemeEditor features", () => {
  it("undo / redo step through changes; unsaved changes can be discarded and are cleared by saving", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onSave = vi.fn();
    const { container } = render(<ThemeEditor onChange={onChange} onSave={onSave} presets={[]} preview={false} />);
    const undo = screen.getByRole("button", { name: "Undo" });
    const redo = screen.getByRole("button", { name: "Redo" });
    expect(undo).toBeDisabled();
    expect(slot(container, "theme-editor-unsaved")).toHaveClass("invisible");

    const radius = screen.getByRole("slider", { name: "Corner radius" });
    act(() => radius.focus());
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ tokens: { shared: { radius: "0.525rem" } } }));
    expect(slot(container, "theme-editor-unsaved")).not.toHaveClass("invisible");
    expect(undo).toBeEnabled();

    await user.click(undo);
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: {} });
    expect(redo).toBeEnabled();
    await user.click(redo);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ tokens: { shared: { radius: "0.525rem" } } }));

    // Ctrl+Z on the editor (not inside a text field).
    fireEvent.keyDown(container.querySelector('[data-slot="theme-editor"]')!, { key: "z", ctrlKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: {} });
    fireEvent.keyDown(container.querySelector('[data-slot="theme-editor"]')!, { key: "y", ctrlKey: true });

    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: {} });
    expect(screen.getByRole("button", { name: "Discard changes" })).toBeDisabled();

    act(() => radius.focus());
    await user.keyboard("{ArrowRight}");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(slot(container, "theme-editor-unsaved")).toHaveClass("invisible");
  });

  it("“Fix” makes a failing field readable", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const unreadable: ThemeConfig = { v: 1, palette: { light: { primary: "#fde68a" } } };
    const { container } = render(
      <ThemeEditor defaultValue={unreadable} defaultEditingScheme="light" onChange={onChange} presets={[]} preview={false} />,
    );
    await user.click(screen.getByRole("button", { name: "Make Primary readable" }));
    const fixed = onChange.mock.lastCall![0] as ThemeConfig;
    expect(fixed.palette?.light?.primary).not.toBe("#fde68a");
    expect(checkThemeConfigContrast(fixed, "light").filter((result) => /primary/.test(result.fg + result.bg) && result.ratio < 4.5)).toEqual([]);
    expect(container.querySelector('[data-field="primary"][data-scheme-field="light"] [data-slot="theme-editor-field-fix"]')).toBeNull();
  });

  it("“From dark” fills the light accents, only when dark has some", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container, rerender } = render(<ThemeEditor defaultEditingScheme="light" presets={[]} preview={false} />);
    expect(slot(container, "theme-editor-derive-light")).toBeNull();
    rerender(<></>);
    render(
      <ThemeEditor
        defaultValue={{ palette: { dark: { primary: "#34d399" } } }}
        defaultEditingScheme="light"
        onChange={onChange}
        presets={[]}
        preview={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "From dark" }));
    expect((onChange.mock.lastCall![0] as ThemeConfig).palette?.light?.primary).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("imports a pasted theme as one undoable change and reports what it left out", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onImport = vi.fn();
    const { container } = render(<ThemeEditor importable onImport={onImport} onChange={onChange} presets={[]} preview={false} />);
    const text = within(slot(container, "theme-editor-import")!).getByRole("textbox");
    fireEvent.change(text, { target: { value: "no json" } });
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("alert")).toHaveTextContent("That is not valid JSON.");
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(text, {
      target: { value: JSON.stringify({ v: 1, palette: { dark: { primary: "#fb7185" } }, tokens: { shared: { radius: "1rem", nope: "1" } } }) },
    });
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: { dark: { primary: "#fb7185" } }, tokens: { shared: { radius: "1rem" } } });
    expect(onImport).toHaveBeenCalledWith(expect.objectContaining({ palette: { dark: { primary: "#fb7185" } } }), ["tokens.shared.nope"]);
    expect(slot(container, "theme-editor-import-message")).toHaveTextContent("1 entry was left out: tokens.shared.nope");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: {} });
  });

  it("sections shows only the listed parts", () => {
    const { container } = render(<ThemeEditor sections={["colors", "style"]} preview={false} />);
    expect(slot(container, "theme-editor-colors")).toBeInTheDocument();
    expect(slot(container, "theme-editor-style")).toBeInTheDocument();
    for (const name of ["theme-editor-presets", "theme-editor-scheme", "theme-editor-contrast", "theme-editor-advanced", "theme-editor-export"]) {
      expect(slot(container, name), name).toBeNull();
    }
  });

  it("saves the current theme as a named preset", async () => {
    const user = userEvent.setup();
    const onSavePreset = vi.fn();
    render(
      <ThemeEditor defaultValue={{ palette: { dark: { primary: "#fb7185" } } }} onSavePreset={onSavePreset} preview={false} />,
    );
    await user.click(screen.getByRole("button", { name: "Save as preset" }));
    await user.type(screen.getByRole("textbox", { name: "Preset name" }), "Server Rot");
    await user.click(screen.getByRole("button", { name: "Save preset" }));
    expect(onSavePreset).toHaveBeenCalledWith({
      id: expect.stringMatching(/^server-rot-/),
      label: "Server Rot",
      config: { v: 1, palette: { dark: { primary: "#fb7185" } } },
    });
  });

  it("all colours: a token set there is written per scheme and can be reset", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<ThemeEditor onChange={onChange} presets={[]} preview={false} />);
    await user.click(screen.getByRole("button", { name: /All colours/ }));
    const row = container.querySelector<HTMLElement>('[data-slot="theme-editor-token"][data-token="border"]')!;
    await user.click(within(row).getByRole("button", { name: "border" }));
    const input = await screen.findByRole("textbox", { name: "Hex" });
    await user.clear(input);
    await user.type(input, "#334455{Enter}");
    await user.keyboard("{Escape}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ tokens: { dark: { border: "#334455" } } }));
    await user.click(within(row).getByRole("button", { name: "Reset border" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: {} });
  });

  it("style sliders write shared tokens; see-through panels show a hint", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<ThemeEditor onChange={onChange} presets={[]} preview={false} />);
    expect(slot(container, "theme-editor-transparency-hint")).toBeNull();
    const opacity = screen.getByRole("slider", { name: "Panel opacity" });
    act(() => opacity.focus());
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ tokens: { shared: { "surface-opacity": "0.95" } } }));
    expect(slot(container, "theme-editor-transparency-hint")).toBeInTheDocument();
    for (const name of ["Accent strength", "Borders", "Shadows"]) expect(screen.getByRole("slider", { name })).toBeInTheDocument();
  });

  it("a font with a file stores the file in the theme (fonts.sans)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ThemeEditor
        onChange={onChange}
        presets={[]}
        preview={false}
        fonts={[{ label: "Rajdhani", value: '"Rajdhani", sans-serif', src: "fonts/rajdhani.woff2", weight: "400 700" }]}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Font" }));
    await user.click(await screen.findByRole("option", { name: "Rajdhani" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tokens: { shared: { "font-sans": '"Rajdhani", sans-serif' } },
        fonts: { sans: { family: "Rajdhani", src: "fonts/rajdhani.woff2", weight: "400 700" } },
      }),
    );
    await user.click(screen.getByRole("combobox", { name: "Font" }));
    await user.click(await screen.findByRole("option", { name: "Inter (default)" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: {} });
  });

  it("the split preview switches between the interface and the game sample", async () => {
    const user = userEvent.setup();
    const { container } = render(<ThemeEditor layout="split" presets={[]} preview={false} />);
    const pane = slot(container, "theme-editor-preview")!;
    expect(pane.querySelector('[data-slot="theme-editor-sample"]')).not.toHaveAttribute("data-sample", "game");
    await user.click(within(pane).getByRole("button", { name: "Game" }));
    await waitFor(() => expect(pane.querySelector('[data-slot="theme-editor-sample"]')).toHaveAttribute("data-sample", "game"));
    expect(within(pane).getAllByRole("progressbar").length).toBeGreaterThan(0);
    expect(within(pane).getByText("Karin Sultan")).toBeInTheDocument();
  });

  it("offers the two shipped fonts by default; fonts={[]} hides the section", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<ThemeEditor presets={[]} preview={false} />);
    await user.click(screen.getByRole("combobox", { name: "Font" }));
    const names = (await screen.findAllByRole("option")).map((option) => option.textContent);
    expect(names).toEqual(["Inter (default)", "JetBrains Mono"]);
    await user.keyboard("{Escape}");
    unmount();
    const hidden = render(<ThemeEditor presets={[]} preview={false} fonts={[]} />);
    expect(slot(hidden.container, "theme-editor-font")).toBeNull();
    expect(container).toBeDefined();
  });

  it("see-through panels get a backdrop in the preview, opaque ones none", () => {
    const { container, rerender } = render(<ThemeEditor layout="split" presets={[]} preview={false} />);
    expect(slot(container, "theme-editor-backdrop")).toBeNull();
    rerender(<ThemeEditor layout="split" presets={[]} preview={false} value={{ tokens: { shared: { "surface-opacity": "0.8" } } }} />);
    expect(slot(container, "theme-editor-backdrop")).toBeInTheDocument();
  });
});
