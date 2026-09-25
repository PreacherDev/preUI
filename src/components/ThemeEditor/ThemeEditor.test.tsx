import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { renderToStringAndHydrate } from "../../test-utils/ssr";
import { defaultThemePresets, type ThemeConfig, type ThemePreset } from "../../theming/theme-config";
import { ThemeEditor, type ThemeEditorProps } from "./ThemeEditor";

const PREVIEW_ID = "preui-theme-editor-preview";
const previewStyle = () => document.getElementById(PREVIEW_ID);
const field = (container: HTMLElement, scheme: string, key: string) =>
  container.querySelector<HTMLElement>(`[data-slot="theme-editor-color-field"][data-scheme-field="${scheme}"][data-field="${key}"]`)!;
const status = (container: HTMLElement, scheme: string) =>
  container.querySelector<HTMLElement>(`[data-slot="theme-editor-status-item"][data-scheme-status="${scheme}"]`)!;

/** Opens a field's colour picker and types a hex value. */
async function setColor(user: ReturnType<typeof userEvent.setup>, name: string, hex: string) {
  await user.click(screen.getByRole("button", { name }));
  const input = await screen.findByRole("textbox", { name: "Hex" });
  await user.clear(input);
  await user.type(input, `${hex}{Enter}`);
  await user.keyboard("{Escape}");
}

afterEach(() => {
  document.getElementById(PREVIEW_ID)?.remove();
});

describe("ThemeEditor", () => {
  it("renders all sections with data-slots, merges className and marks the variant", () => {
    const { container } = render(<ThemeEditor className="custom-editor" onSave={() => {}} exportable fonts={[{ label: "Mono", value: "monospace" }]} />);
    const root = container.querySelector('[data-slot="theme-editor"]')!;
    expect(root).toHaveClass("custom-editor");
    expect(root).toHaveClass("rounded-pui");
    expect(root).toHaveAttribute("data-variant", "panel");
    for (const slot of [
      "theme-editor-status",
      "theme-editor-presets",
      "theme-editor-scheme",
      "theme-editor-colors",
      "theme-editor-contrast",
      "theme-editor-radius",
      "theme-editor-font",
      "theme-editor-export",
      "theme-editor-actions",
    ]) {
      expect(root.querySelector(`[data-slot="${slot}"]`), slot).toBeInTheDocument();
    }
    expect(within(root as HTMLElement).getAllByRole("button", { name: /^(Primary|Background|Text|Positive|Negative|Destructive|Warning|Info)$/ })).toHaveLength(8);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    // Nothing changed yet: reset is disabled, the default preset is pressed.
    expect(screen.getByRole("button", { name: "Reset all" })).toBeDisabled();
    expect(container.querySelector('[data-preset="default"]')).toHaveAttribute("aria-pressed", "true");
  });

  it("renders actionsSlot at the start of the action bar", () => {
    const { container } = render(<ThemeEditor presets={[]} actionsSlot={<span>Esc schließt</span>} />);
    const actions = container.querySelector('[data-slot="theme-editor-actions"]')!;
    expect(actions.firstElementChild).toHaveTextContent("Esc schließt");
  });

  it("inline variant has no frame", () => {
    const { container } = render(<ThemeEditor variant="inline" presets={[]} />);
    const root = container.querySelector('[data-slot="theme-editor"]')!;
    expect(root).toHaveAttribute("data-variant", "inline");
    expect(root).not.toHaveClass("border");
    expect(container.querySelector('[data-slot="theme-editor-presets"]')).toBeNull();
  });

  it("uncontrolled: a colour change calls onChange with a protocol v1 config and marks the field", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<ThemeEditor onChange={onChange} presets={[]} />);
    expect(field(container, "dark", "primary")).not.toHaveAttribute("data-changed");
    await setColor(user, "Primary", "#f97316");
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: { dark: { primary: "#f97316" } } });
    expect(field(container, "dark", "primary")).toHaveAttribute("data-changed");
    expect(within(field(container, "dark", "primary")).getByRole("button", { name: "Reset Primary" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reset all" })).toBeEnabled();
  });

  it("shows the effective (derived) colour of fields that are not set", () => {
    const { container } = render(<ThemeEditor defaultValue={{ palette: { dark: { background: "#ffffff" } } }} presets={[]} />);
    // Text on a white background is derived dark, not the default light text.
    expect(field(container, "dark", "foreground")).toHaveTextContent(/#[0-3]/i);
    expect(field(container, "dark", "foreground")).not.toHaveAttribute("data-changed");
  });

  it("controlled: renders the value, reports changes, follows new values", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const value: ThemeConfig = { v: 1, scheme: "light", theme: "brand", palette: { light: { primary: "#047857" } } };
    const { container, rerender } = render(<ThemeEditor value={value} onChange={onChange} presets={[]} />);
    // The light tab opens for a light config.
    expect(screen.getByRole("tab", { name: "Light" })).toHaveAttribute("aria-selected", "true");
    expect(field(container, "light", "primary")).toHaveTextContent("#047857");
    await setColor(user, "Primary", "#1d4ed8");
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "light", theme: "brand", palette: { light: { primary: "#1d4ed8" } } });
    // Not updated by the parent → still shows the value.
    expect(field(container, "light", "primary")).toHaveTextContent("#047857");
    rerender(<ThemeEditor value={{ ...value, palette: { light: { primary: "#6d28d9" } } }} onChange={onChange} presets={[]} />);
    expect(field(container, "light", "primary")).toHaveTextContent("#6d28d9");
  });

  it("works with a controlled parent (state round trip)", async () => {
    const user = userEvent.setup();
    let latest: ThemeConfig | undefined;
    function Host() {
      const [config, setConfig] = useState<ThemeConfig>({});
      latest = config;
      return <ThemeEditor value={config} onChange={setConfig} presets={[]} />;
    }
    const { container } = render(<Host />);
    await setColor(user, "Background", "#101820");
    expect(latest).toEqual({ v: 1, scheme: "dark", palette: { dark: { background: "#101820" } } });
    expect(field(container, "dark", "background")).toHaveAttribute("data-changed");
  });

  it("per-field reset removes only that colour", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(
      <ThemeEditor
        defaultValue={{ palette: { dark: { primary: "#f97316", background: "#101820" } } }}
        onChange={onChange}
        presets={[]}
      />,
    );
    await user.click(within(field(container, "dark", "primary")).getByRole("button", { name: "Reset Primary" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: { dark: { background: "#101820" } } });
    await user.click(within(field(container, "dark", "background")).getByRole("button", { name: "Reset Background" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: {} });
    expect(within(field(container, "dark", "background")).getByRole("button", { name: "Reset Background" })).toBeDisabled();
  });

  it("reset all clears palette and tokens, keeps scheme and theme, calls onReset", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onReset = vi.fn();
    render(
      <ThemeEditor
        defaultValue={{ scheme: "system", theme: "brand", palette: { light: { primary: "#047857" } }, tokens: { shared: { radius: "0rem" } } }}
        onChange={onChange}
        onReset={onReset}
        presets={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reset all" }));
    const expected = { v: 1, scheme: "system", theme: "brand", palette: {} };
    expect(onChange).toHaveBeenLastCalledWith(expected);
    expect(onReset).toHaveBeenCalledWith(expected);
    expect(screen.getByRole("button", { name: "Reset all" })).toBeDisabled();
  });

  it("changes the default scheme", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThemeEditor onChange={onChange} presets={[]} />);
    const group = screen.getByRole("group", { name: "Default scheme" });
    expect(within(group).getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(group).getByRole("button", { name: "System" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "system", palette: {} });
  });

  it("edits the light palette in the light tab", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onEditingSchemeChange = vi.fn();
    render(<ThemeEditor onChange={onChange} onEditingSchemeChange={onEditingSchemeChange} presets={[]} />);
    await user.click(screen.getByRole("tab", { name: "Light" }));
    expect(onEditingSchemeChange).toHaveBeenCalledWith("light");
    await setColor(user, "Primary", "#047857");
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: { light: { primary: "#047857" } } });
  });

  it("changes the radius (shared token) and resets it", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThemeEditor onChange={onChange} presets={[]} />);
    const slider = screen.getByRole("slider");
    act(() => slider.focus());
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: {}, tokens: { shared: { radius: "0.525rem" } } });
    expect(screen.getByText("0.525 rem")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset Corner radius" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "dark", palette: {} });
  });

  it("picks a font from the list", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ThemeEditor
        onChange={onChange}
        presets={[]}
        fonts={[
          { label: "Rajdhani", value: '"Rajdhani", sans-serif' },
          { label: "System", value: "system-ui, sans-serif" },
        ]}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Font" }));
    await user.click(await screen.findByRole("option", { name: "Rajdhani" }));
    expect(onChange).toHaveBeenLastCalledWith({
      v: 1,
      scheme: "dark",
      palette: {},
      tokens: { shared: { "font-sans": '"Rajdhani", sans-serif' } },
    });
  });

  it("save passes the config and shows a spinner while the promise runs", async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const onSave = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<ThemeEditor defaultValue={{ palette: { dark: { primary: "#f97316" } } }} onSave={onSave} presets={[]} />);
    const save = screen.getByRole("button", { name: "Save" });
    await user.click(save);
    expect(onSave).toHaveBeenCalledWith({ v: 1, scheme: "dark", palette: { dark: { primary: "#f97316" } } });
    expect(save).toHaveAttribute("aria-busy", "true");
    await act(async () => finish());
    expect(save).not.toHaveAttribute("aria-busy");
  });

  it("preview applies the edited theme in its own style element and removes it on unmount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ThemeEditor presets={[]} />);
    const style = previewStyle()!;
    expect(style).not.toBeNull();
    // Complete token set: other runtime overrides can't leak into the preview.
    expect(style.textContent).toContain("--pui-primary: 217 91% 63%");
    expect(style.textContent).toContain("--pui-radius: 0.5rem");
    await setColor(user, "Primary", "#f97316");
    expect(previewStyle()!.textContent).toContain("--pui-primary: 25 95% 53%");
    expect(document.documentElement).not.toHaveAttribute("data-scheme");
    unmount();
    expect(previewStyle()).toBeNull();
  });

  it("preview={false} writes nothing; previewId changes the element", () => {
    const { unmount } = render(<ThemeEditor preview={false} presets={[]} />);
    expect(previewStyle()).toBeNull();
    unmount();
    const second = render(<ThemeEditor previewId="my-preview" presets={[]} />);
    expect(document.getElementById("my-preview")).not.toBeNull();
    second.unmount();
    expect(document.getElementById("my-preview")).toBeNull();
  });

  it("previewSlot renders in the scheme being edited", async () => {
    const user = userEvent.setup();
    const { container } = render(<ThemeEditor previewSlot={<button type="button">Sample</button>} presets={[]} />);
    const slot = container.querySelector('[data-slot="theme-editor-preview"] [data-scheme]')!;
    expect(slot).toHaveAttribute("data-scheme", "dark");
    await user.click(screen.getByRole("tab", { name: "Light" }));
    expect(slot).toHaveAttribute("data-scheme", "light");
  });

  it("contrast: the status shows both schemes and reacts, failing fields are marked", async () => {
    const user = userEvent.setup();
    const { container } = render(<ThemeEditor presets={[]} />);
    expect(status(container, "dark")).toHaveTextContent("Dark: all readable");
    expect(status(container, "light")).toHaveTextContent("Light: all readable");
    await user.click(screen.getByRole("tab", { name: "Light" }));
    // A pale yellow accent can't be read as text on white.
    await setColor(user, "Primary", "#fde047");
    expect(status(container, "light")).toHaveTextContent(/Light: \d+ problems?/);
    expect(status(container, "light")).not.toHaveAttribute("data-problems", "0");
    expect(status(container, "dark")).toHaveTextContent("Dark: all readable");
    const primary = field(container, "light", "primary");
    expect(primary).toHaveAttribute("data-contrast", "fail");
    expect(primary.querySelector('[data-slot="theme-editor-field-contrast"]')).toBeInTheDocument();
    expect(field(container, "light", "positive")).toHaveAttribute("data-contrast", "pass");
    const pair = container.querySelector('[data-slot="theme-editor-contrast-item"][data-pair="primary/background"]')!;
    expect(pair).toHaveAttribute("data-contrast", "fail");
    expect(pair).toHaveTextContent("Primary as text");
    // Clicking a status item switches the tab.
    await user.click(status(container, "dark"));
    expect(screen.getByRole("tab", { name: /Dark/ })).toHaveAttribute("aria-selected", "true");
  });

  it("minContrast changes the threshold", () => {
    const { container } = render(<ThemeEditor minContrast={21} presets={[]} />);
    expect(status(container, "dark")).not.toHaveAttribute("data-problems", "0");
  });

  describe("presets", () => {
    it("ships built-in presets and applies one", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { container } = render(<ThemeEditor onChange={onChange} defaultValue={{ tokens: { shared: { radius: "0rem" } } }} />);
      const buttons = container.querySelectorAll('[data-slot="theme-editor-preset"]');
      expect(buttons).toHaveLength(defaultThemePresets.length);
      // All built-ins pass the contrast check in both schemes.
      for (const button of buttons) expect(button).toHaveAttribute("data-contrast", "pass");
      await user.click(screen.getByRole("button", { name: /Emerald/ }));
      // Palette replaced, the user's radius kept.
      expect(onChange).toHaveBeenLastCalledWith({
        v: 1,
        scheme: "dark",
        palette: { dark: { primary: "#34d399" }, light: { primary: "#047857" } },
        tokens: { shared: { radius: "0rem" } },
      });
      expect(container.querySelector('[data-preset="emerald"]')).toHaveAttribute("aria-pressed", "true");
      expect(container.querySelector('[data-preset="default"]')).toHaveAttribute("aria-pressed", "false");
      // Further edits continue from the preset.
      await setColor(user, "Background", "#101820");
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ palette: { dark: { primary: "#34d399", background: "#101820" }, light: { primary: "#047857" } } }),
      );
      expect(container.querySelector('[data-preset="emerald"]')).toHaveAttribute("aria-pressed", "false");
    });

    it("recognises the current value as a preset (case and format insensitive)", () => {
      const { container } = render(
        <ThemeEditor defaultValue={{ palette: { dark: { primary: "#34D399" }, light: { primary: "rgb(4, 120, 87)" } } }} />,
      );
      expect(container.querySelector('[data-preset="emerald"]')).toHaveAttribute("aria-pressed", "true");
    });

    it("accepts own presets and flags presets with contrast problems", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const presets: ThemePreset[] = [
        { id: "server", label: "Server look", config: { scheme: "light", palette: { light: { primary: "#be123c" } }, tokens: { shared: { radius: "0.25rem" } } } },
        { id: "bad", label: "Unreadable", config: { palette: { light: { primary: "#fde047" } } } },
      ];
      const { container } = render(<ThemeEditor presets={presets} onChange={onChange} labels={{ presetProblems: (n) => `${n} Probleme` }} />);
      expect(container.querySelector('[data-preset="server"]')).toHaveAttribute("data-contrast", "pass");
      expect(container.querySelector('[data-preset="bad"]')).toHaveAttribute("data-contrast", "fail");
      expect(within(container.querySelector<HTMLElement>('[data-preset="bad"]')!).getByText(/Probleme$/)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /Server look/ }));
      expect(onChange).toHaveBeenLastCalledWith({
        v: 1,
        scheme: "light",
        palette: { light: { primary: "#be123c" } },
        tokens: { shared: { radius: "0.25rem" } },
      });
      expect(container.querySelector('[data-preset="server"]')).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("export", () => {
    it("shows the CSS overrides and the JSON config and copies them", async () => {
      const user = userEvent.setup();
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
      const onExport = vi.fn();
      const config: ThemeConfig = { palette: { dark: { primary: "#f97316" } }, tokens: { shared: { radius: "0.25rem" } } };
      const { container } = render(<ThemeEditor defaultValue={config} exportable onExport={onExport} presets={[]} />);
      const text = () => container.querySelector<HTMLTextAreaElement>('[data-slot="theme-editor-export-text"]')!;
      expect(text().value).toContain("preUI token overrides");
      expect(text().value).toContain(":root:root {\n  --pui-radius: 0.25rem;\n}");
      expect(text().value).toContain("--pui-primary: 25 95% 53%;");
      expect(text().value).not.toContain("--pui-background");
      await user.click(screen.getByRole("button", { name: "Copy" }));
      expect(writeText).toHaveBeenCalledWith(text().value);
      expect(onExport).toHaveBeenCalledWith("css", text().value);
      expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "JSON" }));
      expect(JSON.parse(text().value)).toEqual({ v: 1, scheme: "dark", palette: { dark: { primary: "#f97316" } }, tokens: { shared: { radius: "0.25rem" } } });
      // @ts-expect-error cleanup of the test double
      delete navigator.clipboard;
    });

    it("is hidden unless exportable", () => {
      const { container } = render(<ThemeEditor presets={[]} />);
      expect(container.querySelector('[data-slot="theme-editor-export"]')).toBeNull();
    });
  });

  it("labels replace every visible text", async () => {
    const labels: ThemeEditorProps["labels"] = {
      statusScheme: (scheme, summary) => `${scheme} – ${summary}`,
      allReadable: "alles lesbar",
      scheme: "Standard-Schema",
      schemes: { dark: "Dunkel", light: "Hell" },
      fields: { primary: "Akzent" },
      resetField: (name) => `${name} zurücksetzen`,
      contrast: (scheme) => `Kontrast ${scheme}`,
      pairs: { "foreground/background": "Text auf Hintergrund" },
      reset: "Alles zurücksetzen",
      save: "Speichern",
      presets: "Vorlagen",
      radius: "Eckenradius",
      radiusValue: (value) => `${value} rem (Ecken)`,
    };
    const { container } = render(<ThemeEditor labels={labels} onSave={() => {}} locale="de-DE" />);
    expect(status(container, "dark")).toHaveTextContent("Dunkel – alles lesbar");
    expect(screen.getByText("Standard-Schema")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Hell" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Akzent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Akzent zurücksetzen" })).toBeInTheDocument();
    expect(screen.getByText("Kontrast Dunkel")).toBeInTheDocument();
    expect(screen.getByText("Text auf Hintergrund")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alles zurücksetzen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Speichern" })).toBeInTheDocument();
    expect(screen.getByText("Vorlagen")).toBeInTheDocument();
    expect(screen.getByText("0,5 rem (Ecken)")).toBeInTheDocument();
    // Defaults stay for keys that aren't given.
    expect(screen.getByRole("button", { name: "Background" })).toBeInTheDocument();
    // Ratios formatted with the locale.
    expect(container.querySelector('[data-slot="theme-editor-contrast"]')!.textContent).toMatch(/\d+,\d\d/);
  });

  it("renders on the server and hydrates without errors; the preview only starts on the client", async () => {
    const config: ThemeConfig = { scheme: "light", palette: { light: { primary: "#047857" } } };
    const result = await renderToStringAndHydrate(
      <ThemeEditor defaultValue={config} exportable onSave={() => {}} fonts={[{ label: "Mono", value: "monospace" }]} />,
    );
    expect(result.html).toContain('data-slot="theme-editor"');
    expect(result.html).toContain('data-slot="theme-editor-preset"');
    expect(result.errors).toEqual([]);
    await waitFor(() => expect(previewStyle()).not.toBeNull());
    expect(previewStyle()!.textContent).toContain("--pui-primary: 163 94% 24%");
    result.unmount();
    expect(previewStyle()).toBeNull();
  });

  it("ignores invalid input values", () => {
    const onChange = vi.fn();
    const { container } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ThemeEditor defaultValue={{ scheme: "blue" as any, palette: { dark: { primary: "" } } }} onChange={onChange} presets={[]} />,
    );
    expect(field(container, "dark", "primary")).not.toHaveAttribute("data-changed");
    fireEvent.click(within(screen.getByRole("group", { name: "Default scheme" })).getByRole("button", { name: "Light" }));
    expect(onChange).toHaveBeenLastCalledWith({ v: 1, scheme: "light", palette: {} });
  });
});
