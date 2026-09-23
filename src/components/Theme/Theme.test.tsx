import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStringAndHydrate } from "../../test-utils/ssr";
import { ThemeProvider, ThemeScript, ThemeSelect, ThemeToggle, getThemeScript, useTheme, type ThemeProviderProps } from ".";
import {
  normalizeThemeOptions,
  parseStoredTheme,
  resolveThemeState,
  type ThemeOptions,
  type ThemeStorage,
  type ThemeStorageValue,
} from "./theme-script";

const KEY = "preui-theme";
const html = document.documentElement;

/** matchMedia mock whose `prefers-color-scheme: dark` answer can be flipped at runtime (fires `change`). */
function mockSystemScheme(initial: "light" | "dark") {
  let dark = initial === "dark";
  const listeners = new Set<() => void>();
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return query.includes("dark") ? dark : false;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  }));
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: matchMedia });
  return {
    set(next: "light" | "dark") {
      dark = next === "dark";
      act(() => {
        for (const listener of [...listeners]) listener();
      });
    },
  };
}

function resetDom() {
  html.removeAttribute("data-scheme");
  html.removeAttribute("data-theme");
  html.style.colorScheme = "";
}

beforeEach(() => {
  localStorage.clear();
  resetDom();
  mockSystemScheme("dark");
});

afterEach(() => {
  localStorage.clear();
  resetDom();
});

function Probe() {
  const { scheme, resolvedScheme, theme, systemScheme, canToggleScheme, themes, setScheme, setTheme } = useTheme();
  return (
    <div>
      <output data-testid="state">
        {JSON.stringify({ scheme, resolvedScheme, theme, systemScheme: systemScheme ?? null, canToggleScheme, themes })}
      </output>
      <button type="button" onClick={() => setScheme("light")}>light</button>
      <button type="button" onClick={() => setScheme("dark")}>dark</button>
      <button type="button" onClick={() => setScheme("system")}>system</button>
      <button type="button" onClick={() => setTheme("brand")}>brand</button>
      <button type="button" onClick={() => setTheme("paper")}>paper</button>
      <button type="button" onClick={() => setTheme(null)}>no-theme</button>
    </div>
  );
}

const state = () => JSON.parse(screen.getByTestId("state").textContent!) as Record<string, unknown>;

function renderProvider(props: Partial<ThemeProviderProps> = {}) {
  return render(
    <ThemeProvider {...props}>
      <Probe />
    </ThemeProvider>,
  );
}

describe("ThemeProvider", () => {
  it("defaults to the dark scheme without a theme and writes it to <html>", () => {
    renderProvider();
    expect(state()).toMatchObject({ scheme: "dark", resolvedScheme: "dark", theme: null, canToggleScheme: true });
    expect(html).toHaveAttribute("data-scheme", "dark");
    expect(html).not.toHaveAttribute("data-theme");
    expect(html.style.colorScheme).toBe("dark");
  });

  it("honours defaultScheme and defaultTheme", () => {
    renderProvider({ defaultScheme: "light", defaultTheme: "brand" });
    expect(state()).toMatchObject({ scheme: "light", resolvedScheme: "light", theme: "brand" });
    expect(html).toHaveAttribute("data-scheme", "light");
    expect(html).toHaveAttribute("data-theme", "brand");
  });

  it("sets and persists scheme and theme, removes data-theme again", async () => {
    const user = userEvent.setup();
    renderProvider({ themes: { brand: "both" } });
    await user.click(screen.getByRole("button", { name: "light" }));
    expect(html).toHaveAttribute("data-scheme", "light");
    expect(html.style.colorScheme).toBe("light");
    await user.click(screen.getByRole("button", { name: "brand" }));
    expect(html).toHaveAttribute("data-theme", "brand");
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ scheme: "light", theme: "brand" });
    await user.click(screen.getByRole("button", { name: "no-theme" }));
    expect(html).not.toHaveAttribute("data-theme");
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ scheme: "light", theme: null });
    expect(state().themes).toEqual(["brand"]);
  });

  it("restores the stored choice and uses a custom storageKey", () => {
    localStorage.setItem("my-key", JSON.stringify({ scheme: "light", theme: "brand" }));
    renderProvider({ storageKey: "my-key" });
    expect(state()).toMatchObject({ scheme: "light", resolvedScheme: "light", theme: "brand" });
  });

  it("ignores invalid stored data", () => {
    localStorage.setItem(KEY, "{not json");
    renderProvider();
    expect(state()).toMatchObject({ scheme: "dark", theme: null });
    localStorage.setItem(KEY, JSON.stringify({ scheme: "sepia", theme: 3 }));
    expect(parseStoredTheme(localStorage.getItem(KEY))).toEqual({});
  });

  it("follows prefers-color-scheme live while the scheme is system", async () => {
    const system = mockSystemScheme("light");
    const user = userEvent.setup();
    renderProvider({ defaultScheme: "system" });
    expect(state()).toMatchObject({ scheme: "system", resolvedScheme: "light", systemScheme: "light" });
    expect(html).toHaveAttribute("data-scheme", "light");
    system.set("dark");
    expect(state()).toMatchObject({ scheme: "system", resolvedScheme: "dark", systemScheme: "dark" });
    expect(html).toHaveAttribute("data-scheme", "dark");
    // An explicit choice stops following the system.
    await user.click(screen.getByRole("button", { name: "light" }));
    system.set("light");
    system.set("dark");
    expect(html).toHaveAttribute("data-scheme", "light");
  });

  it("treats system as dark when enableSystem is false", async () => {
    const user = userEvent.setup();
    mockSystemScheme("light");
    renderProvider({ defaultScheme: "system", enableSystem: false });
    expect(state()).toMatchObject({ scheme: "dark", resolvedScheme: "dark" });
    await user.click(screen.getByRole("button", { name: "system" }));
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("syncs across tabs via the storage event", () => {
    renderProvider();
    localStorage.setItem(KEY, JSON.stringify({ scheme: "light", theme: "brand" }));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(state()).toMatchObject({ resolvedScheme: "light", theme: "brand" });
    expect(html).toHaveAttribute("data-scheme", "light");
    expect(html).toHaveAttribute("data-theme", "brand");
  });

  it("locks the scheme for light-only / dark-only themes", async () => {
    const user = userEvent.setup();
    renderProvider({ themes: { brand: "both", paper: "light" } });
    await user.click(screen.getByRole("button", { name: "paper" }));
    expect(state()).toMatchObject({ scheme: "dark", resolvedScheme: "light", theme: "paper", canToggleScheme: false });
    expect(html).toHaveAttribute("data-scheme", "light");
    // The preference is kept and applies again once the theme supports both schemes.
    await user.click(screen.getByRole("button", { name: "brand" }));
    expect(state()).toMatchObject({ resolvedScheme: "dark", canToggleScheme: true });
  });

  it("treats undeclared theme names as supporting both schemes", async () => {
    const user = userEvent.setup();
    renderProvider({ themes: { paper: "light" } });
    await user.click(screen.getByRole("button", { name: "brand" }));
    expect(state()).toMatchObject({ theme: "brand", canToggleScheme: true, resolvedScheme: "dark" });
  });

  it("forcedScheme / forcedTheme win over the stored choice and don't overwrite it", () => {
    localStorage.setItem(KEY, JSON.stringify({ scheme: "light", theme: "brand" }));
    renderProvider({ forcedScheme: "dark", forcedTheme: null });
    expect(state()).toMatchObject({ scheme: "dark", resolvedScheme: "dark", theme: null, canToggleScheme: false });
    expect(html).toHaveAttribute("data-scheme", "dark");
    expect(html).not.toHaveAttribute("data-theme");
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ scheme: "light", theme: "brand" });
  });

  it("keeps working in memory when localStorage is blocked", async () => {
    const user = userEvent.setup();
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      renderProvider({ storageKey: "blocked-key" });
      await user.click(screen.getByRole("button", { name: "light" }));
      expect(html).toHaveAttribute("data-scheme", "light");
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });

  it("calls onChange after a change (not initially) and suspends transitions while switching", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const appendChild = vi.spyOn(document.head, "appendChild");
    renderProvider({ onChange });
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "light" }));
    expect(onChange).toHaveBeenCalledWith({ scheme: "light", resolvedScheme: "light", theme: null });
    expect(appendChild.mock.calls.some(([node]) => (node as Element).hasAttribute?.("data-preui-theme-transition"))).toBe(true);
    appendChild.mockRestore();
  });

  it("useTheme throws outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
    vi.mocked(console.error).mockRestore();
  });
});

describe("ThemeToggle", () => {
  it("switches between dark and light and shows the current scheme", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle className="extra" />
      </ThemeProvider>,
    );
    const button = screen.getByRole("button", { name: "Toggle color scheme" });
    expect(button).toHaveAttribute("data-slot", "theme-toggle");
    expect(button).toHaveAttribute("data-scheme", "dark");
    expect(button).toHaveClass("extra");
    await user.click(button);
    expect(button).toHaveAttribute("data-scheme", "light");
    expect(html).toHaveAttribute("data-scheme", "light");
    await user.click(button);
    expect(html).toHaveAttribute("data-scheme", "dark");
  });

  it("is disabled while the scheme is locked", () => {
    render(
      <ThemeProvider themes={{ paper: "light" }} defaultTheme="paper">
        <ThemeToggle label="Farbschema" />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Farbschema" })).toBeDisabled();
  });
});

describe("ThemeSelect", () => {
  it("picks scheme and theme from the menu", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider themes={{ brand: "both", paper: "light" }}>
        <ThemeSelect themeLabels={{ brand: "Marke" }} />
      </ThemeProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Color scheme and theme" });
    expect(trigger).toHaveAttribute("data-slot", "theme-select-trigger");
    await user.click(trigger);
    expect(await screen.findByRole("menuitemradio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    await user.click(await screen.findByRole("menuitemradio", { name: "Light" }));
    expect(html).toHaveAttribute("data-scheme", "light");

    await user.click(trigger);
    await user.click(await screen.findByRole("menuitemradio", { name: "Marke" }));
    expect(html).toHaveAttribute("data-theme", "brand");

    await user.click(trigger);
    await user.click(await screen.findByRole("menuitemradio", { name: "paper" }));
    await user.click(trigger);
    // paper is light-only: the scheme options are locked.
    expect(await screen.findByRole("menuitemradio", { name: "System" })).toHaveAttribute("aria-disabled", "true");
    await user.click(await screen.findByRole("menuitemradio", { name: "Default" }));
    expect(html).not.toHaveAttribute("data-theme");
  });

  it("hides the theme group without declared themes and the system option without enableSystem", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider enableSystem={false}>
        <ThemeSelect labels={{ trigger: "Schema", light: "Hell" }} />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Schema" }));
    expect(await screen.findByRole("menuitemradio", { name: "Hell" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitemradio", { name: "System" })).toBeNull();
    expect(screen.queryByText("Theme")).toBeNull();
  });
});

describe("ThemeScript / getThemeScript", () => {
  const run = (options: ThemeOptions = {}) => {
    resetDom();
    new Function(getThemeScript(options))();
    return { scheme: html.getAttribute("data-scheme"), theme: html.getAttribute("data-theme"), colorScheme: html.style.colorScheme };
  };

  it("applies defaults, stored values and the system scheme before React runs", () => {
    expect(run()).toEqual({ scheme: "dark", theme: null, colorScheme: "dark" });
    expect(run({ defaultScheme: "light", defaultTheme: "brand" })).toEqual({ scheme: "light", theme: "brand", colorScheme: "light" });
    mockSystemScheme("light");
    expect(run({ defaultScheme: "system" }).scheme).toBe("light");
    localStorage.setItem(KEY, JSON.stringify({ scheme: "dark", theme: "brand" }));
    expect(run({ defaultScheme: "system" })).toEqual({ scheme: "dark", theme: "brand", colorScheme: "dark" });
  });

  it("matches resolveThemeState for every combination", () => {
    const stored = [null, "{bad", { scheme: "light" }, { scheme: "dark", theme: "paper" }, { scheme: "system", theme: null }, { theme: "night" }];
    const optionSets: ThemeOptions[] = [
      {},
      { defaultScheme: "system" },
      { defaultScheme: "system", enableSystem: false },
      { defaultScheme: "light", defaultTheme: "paper", themes: { paper: "light", night: "dark" } },
      { themes: { paper: "light", night: "dark" } },
      { forcedScheme: "light" },
      { forcedTheme: null, defaultTheme: "brand" },
      { forcedTheme: "night", themes: { night: "dark" } },
    ];
    for (const system of ["light", "dark"] as const) {
      mockSystemScheme(system);
      for (const value of stored) {
        const raw = value === null ? null : typeof value === "string" ? value : JSON.stringify(value);
        for (const options of optionSets) {
          localStorage.clear();
          if (raw !== null) localStorage.setItem(KEY, raw);
          const expected = resolveThemeState(normalizeThemeOptions(options), parseStoredTheme(raw), system);
          expect(run(options), JSON.stringify({ system, raw, options })).toEqual({
            scheme: expected.resolvedScheme,
            theme: expected.theme,
            colorScheme: expected.resolvedScheme,
          });
        }
      }
    }
  });

  it("survives blocked localStorage", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    try {
      expect(run({ defaultScheme: "light" }).scheme).toBe("light");
    } finally {
      getItem.mockRestore();
    }
  });

  it("uses the storage key and escapes markup in theme names", () => {
    const script = getThemeScript({ storageKey: "k</script>", themes: { "</script><b>": "light" } });
    expect(script).not.toContain("</script>");
    expect(script).toContain("\\u003c/script>");
  });

  it("ThemeScript renders an inline script with the options and nonce", () => {
    const markup = renderToString(<ThemeScript nonce="abc" defaultScheme="light" storageKey="x" />);
    expect(markup).toMatch(/^<script data-slot="theme-script" nonce="abc">/);
    expect(markup).toContain('"k":"x"');
    expect(markup).toContain('"s":"light"');
  });
});

describe("SSR + hydration", () => {
  it("renders on the server without touching storage/matchMedia and hydrates without mismatch", async () => {
    // The inline script already applied the stored light scheme …
    localStorage.setItem(KEY, JSON.stringify({ scheme: "light", theme: "brand" }));
    new Function(getThemeScript())();
    expect(html).toHaveAttribute("data-scheme", "light");

    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const ui = (
      <ThemeProvider>
        <ThemeToggle />
        <Probe />
      </ThemeProvider>
    );
    // renderToString must not read storage (the helper also fails on matchMedia reads).
    const serverHtml = renderToString(ui);
    expect(getItem).not.toHaveBeenCalled();
    expect(serverHtml).toContain("&quot;resolvedScheme&quot;:&quot;dark&quot;");
    getItem.mockRestore();

    const result = await renderToStringAndHydrate(ui, { clientMatchMedia: true });
    expect(result.errors).toEqual([]);
    // … and after hydrating the provider shows the stored values; the DOM never went back to dark.
    expect(result.container.querySelector("output")!.textContent).toContain('"resolvedScheme":"light"');
    expect(result.container.querySelector("output")!.textContent).toContain('"theme":"brand"');
    expect(html).toHaveAttribute("data-scheme", "light");
    expect(html).toHaveAttribute("data-theme", "brand");
    result.unmount();
  });

  it("does not overwrite the script's attributes during the hydration pass", async () => {
    localStorage.setItem(KEY, JSON.stringify({ scheme: "light" }));
    new Function(getThemeScript())();
    const setAttribute = vi.spyOn(html, "setAttribute");
    const result = await renderToStringAndHydrate(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(result.errors).toEqual([]);
    const schemes = setAttribute.mock.calls.filter(([name]) => name === "data-scheme").map(([, value]) => value);
    expect(schemes).not.toContain("dark");
    setAttribute.mockRestore();
    result.unmount();
  });
});

describe("ThemeProvider storage", () => {
  /** A ThemeStorage whose `subscribe` callback can be fired from the test (like a NUI message). */
  function createTestStorage(initial: ThemeStorageValue | null) {
    let push: ((value: ThemeStorageValue) => void) | null = null;
    const storage = {
      get: vi.fn(() => initial),
      set: vi.fn(),
      subscribe: vi.fn((callback: (value: ThemeStorageValue) => void) => {
        push = callback;
        return () => {
          push = null;
        };
      }),
    } satisfies ThemeStorage;
    return { storage, push: (value: ThemeStorageValue) => act(() => push?.(value)) };
  }

  it("storage={false} keeps the choice in state and never touches localStorage", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const user = userEvent.setup();
    renderProvider({ storage: false, themes: { brand: "both" } });
    expect(state()).toMatchObject({ scheme: "dark", theme: null });
    await user.click(screen.getByRole("button", { name: "light" }));
    await user.click(screen.getByRole("button", { name: "brand" }));
    expect(html).toHaveAttribute("data-scheme", "light");
    expect(html).toHaveAttribute("data-theme", "brand");
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    getItem.mockRestore();
    setItem.mockRestore();
  });

  it("reads from and writes to a custom storage", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const { storage } = createTestStorage({ scheme: "light", theme: "brand" });
    const user = userEvent.setup();
    renderProvider({ storage, themes: { brand: "both" } });
    expect(state()).toMatchObject({ scheme: "light", resolvedScheme: "light", theme: "brand" });
    expect(html).toHaveAttribute("data-scheme", "light");
    await user.click(screen.getByRole("button", { name: "dark" }));
    expect(storage.set).toHaveBeenLastCalledWith({ scheme: "dark", theme: "brand" });
    await user.click(screen.getByRole("button", { name: "no-theme" }));
    expect(storage.set).toHaveBeenLastCalledWith({ scheme: "dark", theme: null });
    expect(getItem).not.toHaveBeenCalled();
    getItem.mockRestore();
  });

  it("applies subscribe updates without re-mounting, with transitions suspended", () => {
    const { storage, push } = createTestStorage(null);
    const onChange = vi.fn();
    const appendChild = vi.spyOn(document.head, "appendChild");
    const { container } = renderProvider({ storage, onChange });
    const probe = container.firstChild;
    push({ scheme: "light" });
    expect(html).toHaveAttribute("data-scheme", "light");
    expect(onChange).toHaveBeenLastCalledWith({ scheme: "light", resolvedScheme: "light", theme: null });
    expect(appendChild.mock.calls.some(([node]) => (node as Element).hasAttribute?.("data-preui-theme-transition"))).toBe(true);
    push({ theme: "brand" }); // partial: the scheme stays
    expect(state()).toMatchObject({ scheme: "light", theme: "brand" });
    push({ theme: null });
    expect(html).not.toHaveAttribute("data-theme");
    push({ scheme: "bogus" as "light" }); // invalid values are ignored
    expect(state()).toMatchObject({ scheme: "light" });
    expect(container.firstChild).toBe(probe);
    expect(storage.set).not.toHaveBeenCalled(); // updates from outside are not written back
    appendChild.mockRestore();
  });

  it("unsubscribes on unmount", () => {
    const unsubscribe = vi.fn();
    const storage: ThemeStorage = { get: () => null, set: () => {}, subscribe: () => unsubscribe };
    renderProvider({ storage }).unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("getThemeScript with storage never reads localStorage and applies the defaults", () => {
    localStorage.setItem(KEY, JSON.stringify({ scheme: "light", theme: "brand" }));
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    resetDom();
    new Function(getThemeScript({ storage: false, defaultScheme: "dark", defaultTheme: "base" }))();
    expect(html).toHaveAttribute("data-scheme", "dark");
    expect(html).toHaveAttribute("data-theme", "base");
    expect(getItem).not.toHaveBeenCalled();
    getItem.mockRestore();
  });
});

describe("ThemeProvider tokens", () => {
  const runtimeStyle = () => document.getElementById("preui-runtime-tokens");

  it("applies runtime tokens, updates them on change and removes them on unmount", () => {
    const { rerender, unmount } = render(
      <ThemeProvider tokens={{ dark: { primary: "#ef4444" } }}>
        <Probe />
      </ThemeProvider>,
    );
    expect(runtimeStyle()?.textContent).toContain("--pui-primary: 0 84% 60%;");
    rerender(
      <ThemeProvider tokens={{ dark: { primary: "#22c55e" }, shared: { radius: "4px" } }}>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.querySelectorAll("#preui-runtime-tokens")).toHaveLength(1);
    expect(runtimeStyle()?.textContent).toContain("--pui-radius: 4px;");
    expect(runtimeStyle()?.textContent).not.toContain("0 84% 60%");
    rerender(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(runtimeStyle()).toBeNull();
    rerender(
      <ThemeProvider tokens={{ light: { primary: "#2563eb" } }}>
        <Probe />
      </ThemeProvider>,
    );
    expect(runtimeStyle()).not.toBeNull();
    unmount();
    expect(runtimeStyle()).toBeNull();
  });

  it("does not rewrite the style for a new object with the same content", () => {
    const { rerender } = render(<ThemeProvider tokens={{ dark: { primary: "#ef4444" } }} />);
    const element = runtimeStyle()!;
    const setter = vi.spyOn(element, "textContent", "set");
    rerender(<ThemeProvider tokens={{ dark: { primary: "#ef4444" } }} />);
    expect(setter).not.toHaveBeenCalled();
    setter.mockRestore();
  });
});

describe("colorScheme={false} (transparent iframes, FiveM NUI)", () => {
  it("the provider and the script never write color-scheme", () => {
    renderProvider({ colorScheme: false, defaultScheme: "light" });
    expect(html).toHaveAttribute("data-scheme", "light");
    expect(html.style.colorScheme).toBe("");
    resetDom();
    html.style.colorScheme = "dark";
    new Function(getThemeScript({ colorScheme: false, defaultScheme: "light" }))();
    expect(html).toHaveAttribute("data-scheme", "light");
    expect(html.style.colorScheme).toBe("dark"); // untouched by the script
  });

  it("removes a color-scheme set earlier", () => {
    html.style.colorScheme = "dark";
    renderProvider({ colorScheme: false });
    expect(html.style.colorScheme).toBe("");
  });
});
