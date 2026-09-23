import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ThemeProvider,
  clearTokens,
} from "@pre_scripts/preui";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NuiThemeBridge,
  debugData,
  fetchNui,
  getResourceName,
  isEnvBrowser,
  resolveThemeTokens,
  useNuiEvent,
  useNuiVisibility,
  type NuiThemePayload,
} from ".";

const html = document.documentElement;
const runtimeStyle = () => document.getElementById("preui-runtime-tokens");

function send(action: string, data: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: { action, data } }));
  });
}

/** Pretends to run inside FiveM's CEF. */
function enterGame(resource = "my_resource") {
  Object.assign(window, { invokeNative: () => {}, GetParentResourceName: () => resource });
}

function leaveGame() {
  delete (window as Partial<Window>).invokeNative;
  delete (window as Partial<Window>).GetParentResourceName;
}

beforeEach(() => {
  html.removeAttribute("data-scheme");
  html.removeAttribute("data-theme");
});

afterEach(() => {
  leaveGame();
  clearTokens();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("environment + fetchNui", () => {
  it("detects the browser and the game", () => {
    expect(isEnvBrowser()).toBe(true);
    expect(getResourceName()).toBe("nui-frame-app");
    enterGame("garage");
    expect(isEnvBrowser()).toBe(false);
    expect(getResourceName()).toBe("garage");
  });

  it("returns the mock in a browser without a request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(fetchNui("getData", { id: 1 }, { ok: true })).resolves.toEqual({ ok: true });
    await expect(fetchNui("close")).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts JSON to https://<resource>/<event> in the game", async () => {
    enterGame("garage");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ slots: 3 })))
      .mockResolvedValueOnce(new Response(""));
    await expect(fetchNui("getData", { id: 1 })).resolves.toEqual({ slots: 3 });
    expect(fetchSpy).toHaveBeenCalledWith("https://garage/getData", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: '{"id":1}',
    });
    await expect(fetchNui("close")).resolves.toBeUndefined();
    expect(fetchSpy.mock.calls[1][1]?.body).toBe("{}");
  });
});

describe("useNuiEvent + debugData", () => {
  function Listener({ onData }: { onData: (data: unknown) => void }) {
    useNuiEvent("update", onData);
    return null;
  }

  it("calls the handler only for its action", () => {
    const onData = vi.fn();
    const { unmount } = render(<Listener onData={onData} />);
    send("other", 1);
    send("update", { value: 2 });
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith({ value: 2 });
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: "not an object" }));
    });
    unmount();
    send("update", 3);
    expect(onData).toHaveBeenCalledTimes(1);
  });

  it("debugData sends mock messages in a browser, one after another", () => {
    vi.useFakeTimers();
    const onData = vi.fn();
    render(<Listener onData={onData} />);
    debugData(
      [
        { action: "update", data: 1 },
        { action: "update", data: 2 },
      ],
      100,
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onData).toHaveBeenLastCalledWith(1);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onData).toHaveBeenLastCalledWith(2);
  });

  it("debugData does nothing inside the game", () => {
    vi.useFakeTimers();
    enterGame();
    const onData = vi.fn();
    render(<Listener onData={onData} />);
    debugData([{ action: "update", data: 1 }], 10);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onData).not.toHaveBeenCalled();
  });
});

describe("useNuiVisibility", () => {
  function Page(props: Parameters<typeof useNuiVisibility>[0]) {
    const { visible } = useNuiVisibility(props);
    return visible ? <p>visible</p> : null;
  }

  it("follows setVisible and closes on Escape via the close callback", () => {
    enterGame("shop");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(""));
    render(<Page />);
    expect(screen.queryByText("visible")).toBeNull();
    send("setVisible", true);
    expect(screen.getByText("visible")).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(screen.queryByText("visible")).toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith("https://shop/close", expect.objectContaining({ method: "POST" }));
  });

  it("leaves Escape to an open Select / Dialog inside the page first", async () => {
    const user = userEvent.setup();
    enterGame("shop");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(""));
    function Shop() {
      const { visible } = useNuiVisibility({ initialVisible: true });
      if (!visible) return null;
      return (
        <main aria-label="shop">
          <Dialog>
            <DialogTrigger>Buy</DialogTrigger>
            <DialogContent>
              <DialogTitle>Confirm</DialogTitle>
              <Select items={[{ value: "cash", label: "Cash" }]}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </DialogContent>
          </Dialog>
        </main>
      );
    }
    render(<Shop />);
    const shown = () => screen.queryByRole("main", { name: "shop", hidden: true }) !== null;
    await user.click(screen.getByText("Buy"));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("combobox"));
    await screen.findByRole("listbox");

    await user.keyboard("{Escape}"); // closes the Select only
    await waitFor(() => expect(document.querySelector('[data-slot="select-content"][data-open]')).toBeNull());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}"); // closes the Dialog only
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(shown()).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    await user.keyboard("{Escape}"); // closes the page
    expect(shown()).toBe(false);
    expect(fetchSpy).toHaveBeenCalledWith("https://shop/close", expect.anything());
  });

  it("toggleKeys show and hide the page in a browser", () => {
    render(<Page toggleKeys={["F1"]} />);
    const press = (key: string, init: KeyboardEventInit = {}) =>
      act(() => {
        document.body.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
      });
    press("F1");
    expect(screen.getByText("visible")).toBeInTheDocument();
    press("F1", { repeat: true });
    expect(screen.getByText("visible")).toBeInTheDocument();
    press("F1");
    expect(screen.queryByText("visible")).toBeNull();
    press("F1");
    press("Escape");
    expect(screen.queryByText("visible")).toBeNull();
  });

  it("ignores toggleKeys inside the game (Lua opens the UI there)", () => {
    enterGame("shop");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(""));
    render(<Page toggleKeys={["F1"]} />);
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "F1", bubbles: true }));
    });
    expect(screen.queryByText("visible")).toBeNull();
  });

  it("respects closeOnEscape={false}", () => {
    render(<Page closeOnEscape={false} initialVisible />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(screen.getByText("visible")).toBeInTheDocument();
  });
});

describe("NuiThemeBridge", () => {
  function App({ mock, onThemeChange }: { mock?: NuiThemePayload; onThemeChange?: (p: NuiThemePayload) => void }) {
    return (
      <ThemeProvider storage={false} themes={{ brand: "both" }}>
        <NuiThemeBridge mock={mock} onThemeChange={onThemeChange} />
      </ThemeProvider>
    );
  }

  it("loads the current theme on mount (mock in a browser)", async () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    render(<App mock={{ v: 1, scheme: "light", theme: "brand", tokens: { light: { primary: "#16a34a" } } }} />);
    await act(async () => {});
    expect(html).toHaveAttribute("data-scheme", "light");
    expect(html).toHaveAttribute("data-theme", "brand");
    expect(runtimeStyle()?.textContent).toContain("--pui-primary: 142 76% 36%;");
    expect(getItem).not.toHaveBeenCalled();
  });

  it("applies setTheme messages: scheme, theme, palette and tokens", async () => {
    const onThemeChange = vi.fn();
    render(<App onThemeChange={onThemeChange} />);
    await act(async () => {});
    send("setTheme", { scheme: "light" });
    expect(html).toHaveAttribute("data-scheme", "light");
    send("setTheme", { palette: { dark: { primary: "#f97316" } }, tokens: { shared: { radius: "2px" } } });
    const css = runtimeStyle()!.textContent!;
    expect(css).toContain("--pui-radius: 2px;");
    expect(css).toContain("--pui-primary: 25 95% 53%;");
    expect(html).toHaveAttribute("data-scheme", "light"); // scheme left out: stays
    send("setTheme", { theme: "brand", tokens: { shared: { radius: "2px" } } });
    expect(html).toHaveAttribute("data-theme", "brand");
    expect(runtimeStyle()!.textContent).not.toContain("--pui-primary"); // the payload is the complete state
    send("setTheme", { theme: "" }); // Lua can't send nil: "" removes the theme
    expect(html).not.toHaveAttribute("data-theme");
    expect(runtimeStyle()).toBeNull(); // no palette/tokens: overrides removed
    expect(onThemeChange).toHaveBeenCalledTimes(4);
  });

  it("asks the getTheme callback inside the game", async () => {
    enterGame("hud");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ scheme: "light" })));
    render(<App />);
    await act(async () => {});
    expect(fetchSpy).toHaveBeenCalledWith("https://hud/getTheme", expect.anything());
    expect(html).toHaveAttribute("data-scheme", "light");
  });

  it("removes its token overrides on unmount", async () => {
    const { unmount } = render(<App mock={{ tokens: { dark: { primary: "#16a34a" } } }} />);
    await act(async () => {});
    expect(runtimeStyle()).not.toBeNull();
    unmount();
    expect(runtimeStyle()).toBeNull();
  });
});

describe("resolveThemeTokens", () => {
  it("expands palettes and lets explicit tokens win", () => {
    const resolved = resolveThemeTokens({
      palette: { dark: { primary: "#f97316" } },
      tokens: { dark: { "--pui-ring": "#ffffff" }, shared: { radius: "0px" } },
    });
    expect(resolved.dark?.["--pui-primary"]).toBe("25 95% 53%");
    expect(resolved.dark?.["--pui-ring"]).toBe("#ffffff");
    expect(resolved.light).toBeUndefined();
    expect(resolved.shared).toEqual({ radius: "0px" });
  });
});
