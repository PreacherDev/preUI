import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  debugLoadscreen,
  getNuiHandover,
  initialLoadscreenState,
  isLoadscreenMessage,
  playLoadscreenDemo,
  reduceLoadscreen,
  useLoadscreen,
  type LoadscreenMessage,
  type LoadscreenState,
} from "./loadscreen";

function Probe() {
  const state = useLoadscreen();
  return <output data-testid="state">{JSON.stringify(state)}</output>;
}
const state = (): LoadscreenState => JSON.parse(screen.getByTestId("state").textContent!);

/** The game posts its loading events as plain window messages. */
function post(message: unknown) {
  act(() => {
    window.dispatchEvent(new MessageEvent("message", { data: message }));
  });
}

const run = (messages: LoadscreenMessage[]) => messages.reduce(reduceLoadscreen, initialLoadscreenState);

afterEach(() => {
  delete (window as Partial<Window>).invokeNative;
  delete window.nuiHandoverData;
  vi.useRealTimers();
});

describe("reduceLoadscreen", () => {
  it("follows the init phases in order and ends ready at 100 %", () => {
    expect(run([{ eventName: "startInitFunction", type: "INIT_BEFORE_MAP_LOADED" }]).phase).toBe("files");
    expect(run([{ eventName: "startDataFileEntries" }]).phase).toBe("files");
    expect(run([{ eventName: "performMapLoadFunction" }]).phase).toBe("map");
    expect(run([{ eventName: "startInitFunction", type: "INIT_AFTER_MAP_LOADED" }]).phase).toBe("map");
    expect(run([{ eventName: "startInitFunction", type: "INIT_SESSION" }]).phase).toBe("session");
    expect(run([{ eventName: "endInitFunction", type: "INIT_SESSION" }])).toEqual({ progress: 1, phase: "ready", log: null });
    expect(run([{ eventName: "endInitFunction", type: "INIT_CORE" }]).phase).toBe("core");
  });

  it("never goes backwards", () => {
    const after = run([
      { eventName: "performMapLoadFunction" },
      { eventName: "loadProgress", loadFraction: 0.6 },
      { eventName: "startInitFunction", type: "INIT_BEFORE_MAP_LOADED" },
      { eventName: "loadProgress", loadFraction: 0.2 },
    ]);
    expect(after).toEqual({ progress: 0.6, phase: "map", log: null });
  });

  it("clamps progress and ignores invalid fractions", () => {
    expect(run([{ eventName: "loadProgress", loadFraction: 4 }]).progress).toBe(1);
    expect(run([{ eventName: "loadProgress", loadFraction: -1 }]).progress).toBe(0);
    expect(run([{ eventName: "loadProgress", loadFraction: Number.NaN }]).progress).toBe(0);
  });

  it("keeps the last log line", () => {
    expect(run([{ eventName: "onLogLine", message: "Mounting data" }]).log).toBe("Mounting data");
  });

  it("returns the same object when nothing changed", () => {
    expect(reduceLoadscreen(initialLoadscreenState, { eventName: "onDataFileEntry" })).toBe(initialLoadscreenState);
  });

  it("isLoadscreenMessage", () => {
    expect(isLoadscreenMessage({ eventName: "loadProgress" })).toBe(true);
    expect(isLoadscreenMessage({ action: "setVisible" })).toBe(false);
    expect(isLoadscreenMessage(null)).toBe(false);
    expect(isLoadscreenMessage("loadProgress")).toBe(false);
  });
});

describe("useLoadscreen", () => {
  it("follows the game's messages and ignores other messages", () => {
    render(<Probe />);
    expect(state()).toEqual({ progress: 0, phase: "core", log: null });

    post({ action: "setVisible", data: true });
    post({ eventName: "startDataFileEntries" });
    post({ eventName: "loadProgress", loadFraction: 0.25 });
    expect(state()).toEqual({ progress: 0.25, phase: "files", log: null });

    post({ eventName: "endInitFunction", type: "INIT_SESSION" });
    expect(state()).toEqual({ progress: 1, phase: "ready", log: null });
  });

  it("stops listening on unmount", () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Probe />);
    unmount();
    expect(spy).toHaveBeenCalledWith("message", expect.any(Function));
    spy.mockRestore();
  });
});

describe("getNuiHandover", () => {
  it("returns the handed over data, a field of it, or null", () => {
    expect(getNuiHandover()).toBeNull();
    expect(getNuiHandover("theme")).toBeNull();

    window.nuiHandoverData = { theme: { scheme: "light" }, name: "Alex" };
    expect(getNuiHandover()).toEqual({ theme: { scheme: "light" }, name: "Alex" });
    expect(getNuiHandover<{ scheme: string }>("theme")).toEqual({ scheme: "light" });
    expect(getNuiHandover("missing")).toBeNull();

    window.nuiHandoverData = "text";
    expect(getNuiHandover("theme")).toBeNull();
  });
});

describe("demo load", () => {
  // window.postMessage in jsdom is async (a timer), so these tests read the posted messages through a listener.
  function collect() {
    const messages: LoadscreenMessage[] = [];
    const onMessage = (event: MessageEvent) => {
      if (isLoadscreenMessage(event.data)) messages.push(event.data);
    };
    window.addEventListener("message", onMessage);
    return { messages, stop: () => window.removeEventListener("message", onMessage) };
  }

  it("playLoadscreenDemo goes through every phase to ready and can be stopped", async () => {
    vi.useFakeTimers();
    const { messages, stop } = collect();
    playLoadscreenDemo(2);
    await vi.advanceTimersByTimeAsync(3000);
    stop();

    const final = messages.reduce(reduceLoadscreen, initialLoadscreenState);
    expect(final).toEqual({ progress: 1, phase: "ready", log: null });
    const phases = messages.map((message) => reduceLoadscreen(initialLoadscreenState, message).phase);
    for (const phase of ["files", "map", "session", "ready"]) expect(phases).toContain(phase);

    const second = collect();
    const cancel = playLoadscreenDemo(2);
    cancel();
    await vi.advanceTimersByTimeAsync(3000);
    second.stop();
    expect(second.messages).toEqual([]);
  });

  it("debugLoadscreen sets the handover and plays the load in a browser only", async () => {
    vi.useFakeTimers();
    const { messages, stop } = collect();

    debugLoadscreen({ seconds: 1, handover: { server: "Test" } });
    expect(getNuiHandover("server")).toBe("Test");
    await vi.advanceTimersByTimeAsync(2000);
    expect(messages.length).toBeGreaterThan(0);

    messages.length = 0;
    delete window.nuiHandoverData;
    Object.assign(window, { invokeNative: () => {} });
    debugLoadscreen({ seconds: 1, handover: { server: "Test" } });
    await vi.advanceTimersByTimeAsync(2000);
    stop();
    expect(getNuiHandover()).toBeNull();
    expect(messages).toEqual([]);
  });
});
