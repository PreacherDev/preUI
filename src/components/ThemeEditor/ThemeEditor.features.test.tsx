// The editor features added in 0.9: undo/redo + saved state, contrast repair, light-from-dark, import, sections,
// saving presets, all colour tokens, the style sliders, fonts with files and the game sample.
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { encodeThemeCode } from "../../theming/theme-code";
import { checkThemeConfigContrast, type ThemeConfig } from "../../theming/theme-config";
import { ThemeEditor } from "./ThemeEditor";
import { defaultThemeEditorFonts } from "./theme-editor-fonts";

const slot = (container: HTMLElement, name: string) => container.querySelector<HTMLElement>(`[data-slot="${name}"]`);

// The whole editor renders per test and user-event types into it: generous time, so a busy machine (full suite in
// parallel) doesn't turn the slower tests red.
describe("ThemeEditor features", { timeout: 15_000 }, () => {
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
      removable: true,
      config: { v: 1, palette: { dark: { primary: "#fb7185" } } },
    });
  });

  it("Fix lowers the accent strength when no lightness can make a colour readable on its own tint", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const strong: ThemeConfig = { v: 1, palette: {}, tokens: { shared: { "tint-scale": "3" } } };
    const { container } = render(<ThemeEditor defaultValue={strong} onChange={onChange} presets={[]} preview={false} />);
    expect(slot(container, "theme-editor-tint-hint")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Make Primary readable" }));
    const fixed = onChange.mock.lastCall![0] as ThemeConfig;
    expect(Number((fixed.tokens?.shared as Record<string, string>)["tint-scale"])).toBeLessThan(3);
    expect(container.querySelector('[data-field="primary"][data-scheme-field="dark"]')).toHaveAttribute("data-contrast", "pass");
  });

  describe("fix all", () => {
    // Pale yellow primary in light, accent strength at the maximum: problems in both schemes.
    const broken: ThemeConfig = { v: 1, palette: { light: { primary: "#fde68a" } }, tokens: { shared: { "tint-scale": "3" } } };

    it("the status bar fixes both schemes in one undoable step", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<ThemeEditor defaultValue={broken} onChange={onChange} presets={[]} preview={false} />);
      expect(container.querySelector('[data-scheme-status="dark"]')).not.toHaveAttribute("data-problems", "0");
      await user.click(within(slot(container, "theme-editor-status")!).getByRole("button", { name: "Fix all" }));
      expect(onChange).toHaveBeenCalledTimes(1);
      const fixed = onChange.mock.lastCall![0] as ThemeConfig;
      expect(checkThemeConfigContrast(fixed, "dark").filter((result) => result.ratio < 4.5)).toEqual([]);
      expect(checkThemeConfigContrast(fixed, "light").filter((result) => result.ratio < 4.5)).toEqual([]);
      // Nothing left to fix: the button is gone.
      expect(slot(container, "theme-editor-fix-all")).toBeNull();
      await user.click(screen.getByRole("button", { name: "Undo" }));
      expect(onChange.mock.lastCall![0]).toEqual(expect.objectContaining({ palette: broken.palette }));
    });

    it("the colour tab fixes only its own scheme", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ThemeEditor defaultValue={broken} defaultEditingScheme="light" onChange={onChange} presets={[]} preview={false} />);
      await user.click(screen.getByRole("button", { name: "Fix all problems in Light" }));
      const fixed = onChange.mock.lastCall![0] as ThemeConfig;
      expect(checkThemeConfigContrast(fixed, "light").filter((result) => result.ratio < 4.5)).toEqual([]);
      expect(fixed.palette?.dark).toBeUndefined();
    });

    it("has no Fix all while everything is readable", () => {
      const { container } = render(<ThemeEditor presets={[]} preview={false} />);
      expect(slot(container, "theme-editor-fix-all")).toBeNull();
      expect(slot(container, "theme-editor-fix-all-scheme")).toBeNull();
    });
  });

  describe("share", () => {
    it("shows the theme code and applies a pasted one as one change", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const onImport = vi.fn();
      const other: ThemeConfig = { v: 1, palette: { dark: { primary: "#fb7185" } } };
      const { container } = render(
        <ThemeEditor shareable onChange={onChange} onImport={onImport} presets={[]} preview={false} />,
      );
      expect((slot(container, "theme-editor-share-code") as HTMLInputElement).value).toMatch(/^PUI1\./);
      await user.type(screen.getByRole("textbox", { name: "Theme code from someone else" }), encodeThemeCode(other));
      await user.click(screen.getByRole("button", { name: "Apply" }));
      expect(onChange.mock.lastCall![0]).toEqual(expect.objectContaining({ palette: other.palette }));
      expect(onImport).toHaveBeenCalledTimes(1);
      expect(slot(container, "theme-editor-share-message")).toHaveTextContent("Applied.");
    });

    it("says so when the code is broken", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<ThemeEditor shareable onChange={onChange} presets={[]} preview={false} />);
      await user.type(screen.getByRole("textbox", { name: "Theme code from someone else" }), "PUI1.%%%");
      await user.click(screen.getByRole("button", { name: "Apply" }));
      expect(onChange).not.toHaveBeenCalled();
      expect(slot(container, "theme-editor-share-message")).toHaveTextContent("That is not a valid theme code.");
    });
  });

  describe("preset list", () => {
    const preset = (id: string, extra: object = {}) => ({
      id,
      label: id,
      config: { v: 1 as const, palette: { dark: { primary: "#529dff" } } },
      ...extra,
    });

    it("shows the description and the number of contrast problems as visible text", () => {
      // Pale yellow primary on white: unreadable in the light scheme.
      const bad = { id: "bad", label: "Bad", config: { v: 1 as const, palette: { light: { primary: "#fde68a" } } } };
      const { container } = render(
        <ThemeEditor presets={[preset("ok", { description: "Blue accent" }), bad]} preview={false} />,
      );
      const [ok, failing] = container.querySelectorAll<HTMLElement>('[data-slot="theme-editor-preset"]');
      expect(within(ok).getByText("Blue accent")).toBeInTheDocument();
      expect(ok).toHaveAttribute("data-contrast", "pass");
      expect(failing).toHaveAttribute("data-contrast", "fail");
      expect(within(failing).getByText(/^\d+ problems?$/)).toBeVisible();
      expect(ok).not.toHaveAttribute("title");
    });

    it("lists presets under their group headings, in the order of the first preset of each group", () => {
      const { container } = render(
        <ThemeEditor
          presets={[preset("a", { group: "Built-in" }), preset("b", { group: "Server" }), preset("c", { group: "Built-in" })]}
          preview={false}
        />,
      );
      const groups = [...container.querySelectorAll<HTMLElement>('[data-slot="theme-editor-preset-group"]')];
      expect(groups.map((group) => group.firstElementChild?.textContent)).toEqual(["Built-in", "Server"]);
      expect([...groups[0].querySelectorAll("[data-preset]")].map((item) => item.getAttribute("data-preset"))).toEqual(["a", "c"]);
      expect(within(groups[1]).getByRole("group", { name: "Server" })).toBeInTheDocument();
    });

    it("has no headings without groups", () => {
      const { container } = render(<ThemeEditor presets={[preset("a"), preset("b")]} preview={false} />);
      expect(container.querySelector('[data-slot="theme-editor-preset-group"]')).toBeNull();
      expect(screen.getByRole("group", { name: "Presets" })).toBeInTheDocument();
    });
  });

  describe('layout="sidebar"', () => {
    it("shows one page at a time, switched from the navigation", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      const { container } = render(
        <ThemeEditor layout="sidebar" exportable preview={false} onPageChange={onPageChange} />,
      );
      const nav = screen.getByRole("navigation", { name: "Theme editor sections" });
      expect(within(nav).getAllByRole("button").map((button) => button.getAttribute("data-page"))).toEqual([
        "presets",
        "colors",
        "style",
        "contrast",
        "advanced",
      ]);
      expect(within(nav).getByRole("button", { name: /Presets/ })).toHaveAttribute("aria-current", "page");
      expect(slot(container, "theme-editor-presets")).not.toBeNull();
      expect(slot(container, "theme-editor-colors")).toBeNull();

      await user.click(within(nav).getByRole("button", { name: /Colors/ }));
      expect(onPageChange).toHaveBeenLastCalledWith("colors");
      expect(slot(container, "theme-editor-presets")).toBeNull();
      expect(slot(container, "theme-editor-scheme")).not.toBeNull();
      expect(slot(container, "theme-editor-colors")).not.toBeNull();
      // The contrast details have their own page.
      expect(slot(container, "theme-editor-contrast")).toBeNull();

      await user.click(within(nav).getByRole("button", { name: /Contrast/ }));
      expect(slot(container, "theme-editor-contrast")).not.toBeNull();

      await user.click(within(nav).getByRole("button", { name: /Advanced/ }));
      expect(slot(container, "theme-editor-advanced")).toHaveAttribute("data-open");
      expect(slot(container, "theme-editor-export")).not.toBeNull();
      // The preview pane stays next to every page.
      expect(slot(container, "theme-editor-preview")).not.toBeNull();
    });

    it("leaves out empty pages and counts contrast problems on the contrast entry", () => {
      const unreadable: ThemeConfig = { v: 1, palette: { light: { primary: "#fde68a" } } };
      render(<ThemeEditor layout="sidebar" presets={[]} preview={false} value={unreadable} sections={["colors", "contrast"]} />);
      const nav = screen.getByRole("navigation");
      expect(within(nav).getAllByRole("button").map((button) => button.getAttribute("data-page"))).toEqual(["colors", "contrast"]);
      // The first page shown is the start page when "presets" isn't there.
      expect(within(nav).getByRole("button", { name: /Colors/ })).toHaveAttribute("aria-current", "page");
      const badge = nav.querySelector('[data-slot="theme-editor-nav-problems"]');
      expect(badge).toHaveTextContent(/\d+/);
    });

    it("is preUI's Sidebar: collapsible to the icon rail without touching the page's sidebar cookie", async () => {
      const user = userEvent.setup();
      document.cookie = "sidebar_state=true; path=/";
      const { container } = render(<ThemeEditor layout="sidebar" shareable preview={false} />);
      const sidebar = container.querySelector('[data-slot="sidebar"]')!;
      expect(sidebar).toHaveAttribute("data-variant", "inset");
      expect(sidebar).toHaveAttribute("data-state", "expanded");
      expect(within(screen.getByRole("navigation")).getByRole("button", { name: /Share/ })).toHaveAttribute("data-page", "share");
      await user.click(screen.getByRole("button", { name: "Collapse" }));
      expect(sidebar).toHaveAttribute("data-state", "collapsed");
      expect(sidebar).toHaveAttribute("data-collapsible", "icon");
      expect(document.cookie).toContain("sidebar_state=true");
      // The content panel is a div, not a second <main>.
      expect(slot(container, "theme-editor-main")!.tagName).toBe("DIV");
    });

    it("can be controlled with page", () => {
      const { container } = render(<ThemeEditor layout="sidebar" preview={false} page="style" />);
      expect(slot(container, "theme-editor-style")).not.toBeNull();
      expect(slot(container, "theme-editor-presets")).toBeNull();
    });
  });

  describe("saved presets: rename and delete", () => {
    const builtIn = { id: "blue", label: "Blau", config: { v: 1 as const, palette: { dark: { primary: "#529dff" } } } };
    const saved = { id: "mine", label: "Mein Theme", removable: true, config: { v: 1 as const, palette: { dark: { primary: "#fb7185" } } } };

    it("shows the menu only on removable presets, and only with a handler", () => {
      const { container, unmount } = render(<ThemeEditor presets={[builtIn, saved]} preview={false} />);
      expect(container.querySelector('[data-slot="theme-editor-preset-actions"]')).toBeNull();
      unmount();
      const view = render(<ThemeEditor presets={[builtIn, saved]} preview={false} onDeletePreset={() => {}} />);
      const menus = view.container.querySelectorAll('[data-slot="theme-editor-preset-actions"]');
      expect(menus).toHaveLength(1);
      expect(menus[0]).toHaveAccessibleName("Actions for Mein Theme");
      expect(menus[0]).toHaveClass("absolute");
      // Every entry has the same structure; the saved one reserves the button's room on its right edge.
      const tiles = view.container.querySelectorAll('[data-slot="theme-editor-preset-item"]');
      expect(tiles).toHaveLength(2);
      expect(tiles[1]).toContainElement(menus[0] as HTMLElement);
      expect(tiles[1].querySelector("button[data-preset]")).toHaveClass("pr-11");
      expect(tiles[0].querySelector("button[data-preset]")).not.toHaveClass("pr-11");
    });

    it("deletes a preset after the confirmation, and not when cancelled", async () => {
      const user = userEvent.setup();
      const onDeletePreset = vi.fn();
      const onChange = vi.fn();
      render(<ThemeEditor presets={[builtIn, saved]} preview={false} onDeletePreset={onDeletePreset} onChange={onChange} />);
      await user.click(screen.getByRole("button", { name: "Actions for Mein Theme" }));
      expect(screen.queryByRole("menuitem", { name: "Rename" })).toBeNull();
      await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent('Delete "Mein Theme"?');
      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(onDeletePreset).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Actions for Mein Theme" }));
      await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
      await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
      expect(onDeletePreset).toHaveBeenCalledWith(saved);
      // Opening the menu or deleting doesn't apply the preset.
      expect(onChange).not.toHaveBeenCalled();
    });

    it("renames a preset with the new name, trimmed", async () => {
      const user = userEvent.setup();
      const onRenamePreset = vi.fn();
      render(
        <ThemeEditor
          presets={[saved]}
          preview={false}
          onRenamePreset={onRenamePreset}
          onDeletePreset={() => {}}
          labels={{ renamePreset: "Umbenennen", presetName: "Name" }}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Actions for Mein Theme" }));
      await user.click(await screen.findByRole("menuitem", { name: "Umbenennen" }));
      const input = await screen.findByRole("textbox", { name: "Name" });
      expect(input).toHaveValue("Mein Theme");
      await user.clear(input);
      await user.type(input, "  Server Blau  {Enter}");
      expect(onRenamePreset).toHaveBeenCalledWith(saved, "Server Blau");
      await waitFor(() => expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument());
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
    // Always in the layout (reserves its space), hidden while the panels are opaque.
    expect(slot(container, "theme-editor-transparency-hint")).toHaveClass("invisible");
    expect(slot(container, "theme-editor-transparency-hint")).toHaveAttribute("aria-hidden", "true");
    const opacity = screen.getByRole("slider", { name: "Panel opacity" });
    act(() => opacity.focus());
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ tokens: { shared: { "surface-opacity": "0.95" } } }));
    expect(slot(container, "theme-editor-transparency-hint")).not.toHaveClass("invisible");
    expect(slot(container, "theme-editor-transparency-hint")).not.toHaveAttribute("aria-hidden");
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

  it("fontSrcBase turns the file names of a font choice into per-weight sources", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const fonts = [
      {
        label: "Poppins",
        value: '"Poppins", system-ui, sans-serif',
        files: [
          { file: "poppins-400.woff2", weight: "400" },
          { file: "poppins-700.woff2", weight: "700" },
        ],
      },
    ];
    const { unmount } = render(
      <ThemeEditor onChange={onChange} presets={[]} preview={false} fonts={fonts} fontSrcBase="https://cfx-nui-pre_lib/theme/fonts/" />,
    );
    await user.click(screen.getByRole("combobox", { name: "Font" }));
    await user.click(await screen.findByRole("option", { name: "Poppins" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fonts: {
          sans: {
            family: "Poppins",
            src: [
              { url: "https://cfx-nui-pre_lib/theme/fonts/poppins-400.woff2", weight: "400" },
              { url: "https://cfx-nui-pre_lib/theme/fonts/poppins-700.woff2", weight: "700" },
            ],
          },
        },
      }),
    );
    unmount();

    // Without a base URL the family is still offered, but nothing is loaded and no file is stored.
    const second = vi.fn();
    render(<ThemeEditor onChange={second} presets={[]} preview={false} fonts={fonts} />);
    await user.click(screen.getByRole("combobox", { name: "Font" }));
    await user.click(await screen.findByRole("option", { name: "Poppins" }));
    expect(second).toHaveBeenLastCalledWith(
      expect.objectContaining({ tokens: { shared: { "font-sans": '"Poppins", system-ui, sans-serif' } } }),
    );
    expect(second.mock.calls[second.mock.calls.length - 1][0].fonts).toBeUndefined();
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

  it("offers the curated font list by default; fonts={[]} hides the section", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<ThemeEditor presets={[]} preview={false} />);
    await user.click(screen.getByRole("combobox", { name: "Font" }));
    const names = (await screen.findAllByRole("option")).map((option) => option.textContent);
    // One option per shipped family: Inter is the "default" option, every other entry follows in order.
    expect(names).toHaveLength(defaultThemeEditorFonts.length);
    expect(names[0]).toBe("Inter (default)");
    expect(names.filter((name) => name === "Inter")).toHaveLength(0);
    expect(names).toContain("JetBrains Mono");
    expect(names).toContain("Space Mono");
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
