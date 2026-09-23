import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import {
  SkillCheck,
  getSkillCheckProgress,
  resolveSkillCheckDifficulty,
  useSkillCheck,
  useSkillCheckGame,
  type SkillCheckGame,
  type SkillCheckProps,
  type SkillCheckRenderState,
  type UseSkillCheckGameOptions,
} from "./SkillCheck";

// Manual requestAnimationFrame clock: `advance(ms)` runs one frame every 16 ms.
let now = 0;
let nextId = 0;
const frames = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  now = 0;
  nextId = 0;
  frames.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    nextId += 1;
    frames.set(nextId, callback);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames.delete(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function advance(ms: number) {
  act(() => {
    const end = now + ms;
    while (now < end) {
      now = Math.min(end, now + 16);
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(now));
    }
  });
}

/**
 * With `random={() => 0}` the zone starts at 90°; easy = 50° wide, 180°/s. The first frame (t = 16) is angle 0,
 * so the marker is at 115° (inside) after 16 + 640 ms and at 45° (outside) after 16 + 250 ms.
 */
function toInside() {
  advance(16 + 640);
}

function root() {
  return screen.getByRole("group", { name: "Skill check" });
}

function press(key = "e", init: KeyboardEventInit = {}) {
  act(() => {
    fireEvent.keyDown(window, { key, ...init });
  });
}

function renderCheck(props: Partial<SkillCheckProps> = {}) {
  const onComplete = vi.fn();
  const onRoundComplete = vi.fn();
  const utils = render(<SkillCheck random={() => 0} onComplete={onComplete} onRoundComplete={onRoundComplete} {...props} />);
  return { ...utils, onComplete, onRoundComplete };
}

describe("SkillCheck", () => {
  it("renders the ring, zone, indicator, key and data attributes", () => {
    const ref = createRef<HTMLDivElement>();
    renderCheck({ ref, className: "my-check" } as Partial<SkillCheckProps>);
    const check = root();
    expect(ref.current).toBe(check);
    expect(check).toHaveAttribute("data-slot", "skill-check");
    expect(check).toHaveAttribute("data-state", "running");
    expect(check).toHaveClass("my-check", "relative");
    expect(check.querySelector('[data-slot="skill-check-track"]')).toHaveClass("stroke-pui-muted");
    const zone = check.querySelector('[data-slot="skill-check-zone"]')!;
    expect(zone).toHaveClass("stroke-pui-primary");
    expect(zone.getAttribute("transform")).toBe("rotate(0 64 64)");
    expect(check.querySelector('[data-slot="skill-check-indicator"]')).toBeInTheDocument();
    expect(check.querySelector('[data-slot="skill-check-key"]')).toHaveTextContent("E");
    expect(check.querySelector('[data-slot="skill-check-hint"]')).toHaveTextContent("Press");
  });

  it("moves the indicator with requestAnimationFrame via an SVG transform", () => {
    renderCheck();
    const needle = root().querySelector('[data-slot="skill-check-indicator"]')!;
    advance(16 + 500);
    expect(needle.getAttribute("transform")).toBe("rotate(90 64 64)");
  });

  it("succeeds when the key is pressed inside the zone", () => {
    const { onComplete, onRoundComplete } = renderCheck();
    toInside();
    press("E");
    expect(onComplete).toHaveBeenCalledWith(true, { round: 1 });
    expect(onRoundComplete).toHaveBeenCalledWith({ round: 1, success: true });
    expect(root()).toHaveAttribute("data-state", "success");
    expect(root().querySelector('[data-slot="skill-check-zone"]')).toHaveClass("stroke-pui-positive");
    expect(screen.getByRole("status")).toHaveTextContent("Success");
  });

  it("fails when the key is pressed outside the zone", () => {
    const { onComplete } = renderCheck();
    advance(16 + 250);
    press("e");
    expect(onComplete).toHaveBeenCalledWith(false, { round: 1 });
    expect(root()).toHaveAttribute("data-state", "failed");
    expect(root().querySelector('[data-slot="skill-check-zone"]')).toHaveClass("stroke-pui-negative");
    expect(screen.getByRole("status")).toHaveTextContent("Failed");
  });

  it("ignores keys that are not configured, repeats and modifier combos", () => {
    const { onComplete } = renderCheck({ keys: ["e", "Space"] });
    advance(16 + 250);
    press("q");
    press("e", { repeat: true });
    press("e", { ctrlKey: true });
    expect(onComplete).not.toHaveBeenCalled();
    advance(390); // 640 ms -> 115°
    press(" ", { code: "Space" });
    expect(onComplete).toHaveBeenCalledWith(true, { round: 1 });
  });

  it("fails when the indicator completes a full turn without a press", () => {
    const { onComplete } = renderCheck();
    advance(16 + 1990);
    expect(onComplete).not.toHaveBeenCalled();
    advance(32);
    expect(onComplete).toHaveBeenCalledWith(false, { round: 1 });
    expect(root()).toHaveAttribute("data-state", "failed");
  });

  it("respects timeoutTurns", () => {
    const { onComplete } = renderCheck({ timeoutTurns: 2 });
    advance(16 + 2100);
    expect(onComplete).not.toHaveBeenCalled();
    advance(2000);
    expect(onComplete).toHaveBeenCalledWith(false, { round: 1 });
  });

  it("plays several rounds and completes after the last one", () => {
    const { onComplete, onRoundComplete } = renderCheck({ rounds: ["easy", "easy", "easy"] });
    expect(root().querySelector('[data-slot="skill-check-round"]')).toHaveTextContent("1/3");
    toInside();
    press();
    expect(onRoundComplete).toHaveBeenLastCalledWith({ round: 1, success: true });
    expect(root()).toHaveAttribute("data-state", "running");
    expect(root()).toHaveAttribute("data-flash");
    expect(root().querySelector('[data-slot="skill-check-round"]')).toHaveTextContent("2/3");
    // The indicator restarts at 0 for the next round.
    expect(root().querySelector('[data-slot="skill-check-indicator"]')!.getAttribute("transform")).toBe("rotate(0 64 64)");
    toInside();
    press();
    toInside();
    press();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(true, { round: 3 });
  });

  it("stops at the first missed round", () => {
    const { onComplete } = renderCheck({ rounds: 3 });
    toInside();
    press();
    advance(16 + 100);
    press();
    expect(onComplete).toHaveBeenCalledWith(false, { round: 2 });
  });

  it("uses custom difficulties and speed", () => {
    expect(resolveSkillCheckDifficulty("hard")).toEqual({ areaSize: 25, speedMultiplier: 1.75 });
    const { onComplete } = renderCheck({ difficulty: { areaSize: 10, speedMultiplier: 2 } });
    // 360°/s: 95° after ~264 ms (zone 90..100).
    advance(16 + 264);
    press();
    expect(onComplete).toHaveBeenCalledWith(true, { round: 1 });
  });

  it("counts a pointer press on the ring", () => {
    const { onComplete } = renderCheck();
    toInside();
    act(() => {
      fireEvent.pointerDown(root(), { button: 0 });
    });
    expect(onComplete).toHaveBeenCalledWith(true, { round: 1 });
  });

  it("randomKey requires the shown key; another configured key fails", () => {
    const { onComplete } = renderCheck({ keys: ["e", "f"], randomKey: true, random: () => 0.6 });
    expect(root().querySelector('[data-slot="skill-check-key"]')).toHaveTextContent("F");
    // Zone 90 + 0.6 * 205 = 213..263°; the marker is at 234° after 1300 ms — inside, but "e" is the wrong key.
    advance(16 + 1300);
    press("e");
    expect(onComplete).toHaveBeenCalledWith(false, { round: 1 });
  });

  it("does nothing while inactive and restarts when runKey changes", () => {
    const onComplete = vi.fn();
    const { rerender } = render(<SkillCheck active={false} random={() => 0} onComplete={onComplete} />);
    expect(root()).toHaveAttribute("data-state", "idle");
    expect(root().querySelector('[data-slot="skill-check-zone"]')).toBeNull();
    advance(3000);
    press();
    expect(onComplete).not.toHaveBeenCalled();
    rerender(<SkillCheck active random={() => 0} onComplete={onComplete} runKey={1} />);
    advance(16 + 250);
    press();
    expect(onComplete).toHaveBeenLastCalledWith(false, { round: 1 });
    rerender(<SkillCheck active random={() => 0} onComplete={onComplete} runKey={2} />);
    expect(root()).toHaveAttribute("data-state", "running");
    toInside();
    press();
    expect(onComplete).toHaveBeenLastCalledWith(true, { round: 1 });
  });

  it("uses custom labels and formatKey", () => {
    renderCheck({ keys: [" "], labels: { press: "Drücke", label: "Schloss" }, formatKey: (key) => (key === " " ? "Leertaste" : undefined) });
    const check = screen.getByRole("group", { name: "Schloss" });
    expect(check.querySelector('[data-slot="skill-check-key"]')).toHaveTextContent("Leertaste");
    expect(check.querySelector('[data-slot="skill-check-hint"]')).toHaveTextContent("Drücke");
  });

  it("removes the key listener and cancels the frame on unmount", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount, onComplete } = renderCheck();
    expect(add).toHaveBeenCalledWith("keydown", expect.any(Function));
    const handler = add.mock.calls.find(([type]) => type === "keydown")![1];
    unmount();
    expect(remove).toHaveBeenCalledWith("keydown", handler);
    expect(frames.size).toBe(0);
    press();
    expect(onComplete).not.toHaveBeenCalled();
    add.mockRestore();
    remove.mockRestore();
  });
});

describe("useSkillCheck", () => {
  function Harness({ onResult }: { onResult: (value: boolean) => void }) {
    const skillCheck = useSkillCheck();
    return (
      <>
        <button type="button" onClick={() => void skillCheck.start(["easy", "medium"]).then(onResult)}>
          start
        </button>
        <button type="button" onClick={skillCheck.cancel}>
          cancel
        </button>
        <span data-testid="running">{String(skillCheck.running)}</span>
        <SkillCheck {...skillCheck.props} random={() => 0} />
      </>
    );
  }

  it("starts idle and resolves true when every round is hit", async () => {
    const onResult = vi.fn();
    render(<Harness onResult={onResult} />);
    expect(root()).toHaveAttribute("data-state", "idle");
    fireEvent.click(screen.getByText("start"));
    expect(screen.getByTestId("running")).toHaveTextContent("true");
    expect(root().querySelector('[data-slot="skill-check-round"]')).toHaveTextContent("1/2");
    toInside();
    press();
    // medium: 270°/s, zone 90..130 -> 110° after ~407 ms
    advance(16 + 407);
    press();
    await act(async () => {});
    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("running")).toHaveTextContent("false");
    expect(root()).toHaveAttribute("data-state", "success");
  });

  it("resolves false on a miss and can be started again", async () => {
    const onResult = vi.fn();
    render(<Harness onResult={onResult} />);
    fireEvent.click(screen.getByText("start"));
    advance(16 + 100);
    press();
    await act(async () => {});
    expect(onResult).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByText("start"));
    expect(root()).toHaveAttribute("data-state", "running");
    toInside();
    press();
    advance(16 + 407);
    press();
    await act(async () => {});
    expect(onResult).toHaveBeenLastCalledWith(true);
  });

  it("resolves false on cancel and when start is called again", async () => {
    const onResult = vi.fn();
    render(<Harness onResult={onResult} />);
    fireEvent.click(screen.getByText("start"));
    fireEvent.click(screen.getByText("start"));
    await act(async () => {});
    expect(onResult).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByText("cancel"));
    await act(async () => {});
    expect(onResult).toHaveBeenCalledTimes(2);
    expect(root()).toHaveAttribute("data-state", "idle");
  });

  it("resolves false when the hook's component unmounts", async () => {
    const onResult = vi.fn();
    const { unmount } = render(<Harness onResult={onResult} />);
    fireEvent.click(screen.getByText("start"));
    unmount();
    await act(async () => {});
    expect(onResult).toHaveBeenCalledWith(false);
  });
});

describe("SkillCheck customisation", () => {
  it("merges classNames per part", () => {
    renderCheck({
      rounds: 2,
      classNames: {
        root: "r",
        svg: "s",
        track: "stroke-pui-border",
        zone: "z",
        indicator: "i",
        content: "c",
        hint: "h",
        key: "k",
        round: "rd",
        status: "st",
      },
    });
    const check = root();
    expect(check).toHaveClass("r", "relative");
    const part = (name: string) => check.querySelector(`[data-slot="skill-check-${name}"]`)!;
    expect(part("svg")).toHaveClass("s");
    expect(part("track")).toHaveClass("stroke-pui-border");
    expect(part("track")).not.toHaveClass("stroke-pui-muted");
    expect(part("zone")).toHaveClass("z", "stroke-pui-primary");
    expect(part("indicator").querySelector("line")).toHaveClass("i", "stroke-pui-foreground");
    expect(part("content")).toHaveClass("c");
    expect(part("hint")).toHaveClass("h");
    expect(part("key")).toHaveClass("k");
    expect(part("round")).toHaveClass("rd");
    expect(part("status")).toHaveClass("st", "sr-only");
  });

  it("zoneTone and indicatorTone use tokens; success/failure still win", () => {
    const { onComplete } = renderCheck({ zoneTone: "warning", indicatorTone: "primary" });
    const zone = root().querySelector('[data-slot="skill-check-zone"]')!;
    const needle = root().querySelector('[data-slot="skill-check-indicator"] line')!;
    expect(zone).toHaveClass("stroke-pui-warning");
    expect(needle).toHaveClass("stroke-pui-primary");
    advance(16 + 250);
    press();
    expect(onComplete).toHaveBeenCalledWith(false, { round: 1 });
    expect(zone).toHaveClass("stroke-pui-negative");
    expect(zone).not.toHaveClass("stroke-pui-warning");
    expect(needle).toHaveClass("stroke-pui-negative");
  });

  it("renderContent replaces the centre content and gets state, round, key and progress", () => {
    const renderContent = vi.fn(({ state, round, rounds, key, progress }: SkillCheckRenderState) => (
      <span data-testid="custom">{`${state} ${round}/${rounds} ${key} ${progress.toFixed(2)}`}</span>
    ));
    renderCheck({ rounds: 2, renderContent });
    const content = root().querySelector('[data-slot="skill-check-content"]')!;
    expect(content.querySelector('[data-slot="skill-check-key"]')).toBeNull();
    expect(screen.getByTestId("custom")).toHaveTextContent("running 1/2 e 0.00");
    advance(16 + 500); // 90° -> a quarter turn
    expect(screen.getByTestId("custom")).toHaveTextContent("running 1/2 e 0.25");
  });

  it("bar variant: zone as a segment, indicator slides with a translate transform, same game logic", () => {
    const { onComplete } = renderCheck({ variant: "bar", size: 240, thickness: 10 });
    const check = root();
    expect(check).toHaveAttribute("data-variant", "bar");
    expect(check.style.width).toBe("240px");
    const track = check.querySelector('[data-slot="skill-check-track"]')!;
    expect(track.tagName.toLowerCase()).toBe("line");
    // needle width 5 -> bar from 2.5 to 237.5 (length 235); zone 90..140° = 25% … 38.9%.
    expect(Number(track.getAttribute("x1"))).toBeCloseTo(2.5);
    expect(Number(track.getAttribute("x2"))).toBeCloseTo(237.5);
    const zone = check.querySelector('[data-slot="skill-check-zone"]')!;
    expect(Number(zone.getAttribute("x1"))).toBeCloseTo(2.5 + 0.25 * 235);
    expect(Number(zone.getAttribute("x2"))).toBeCloseTo(2.5 + (140 / 360) * 235);
    const needle = check.querySelector('[data-slot="skill-check-indicator"]')!;
    expect(needle.getAttribute("transform")).toBe("translate(0 0)");
    advance(16 + 500);
    expect(needle.getAttribute("transform")).toBe(`translate(${0.25 * 235} 0)`);
    advance(140); // 640 ms -> 115°
    press();
    expect(onComplete).toHaveBeenCalledWith(true, { round: 1 });
  });

  it("bar variant keeps the indicator at the right end when the round times out", () => {
    renderCheck({ variant: "bar", size: "sm" });
    advance(16 + 2100);
    expect(root()).toHaveAttribute("data-state", "failed");
    expect(root()).toHaveAttribute("data-size", "sm");
    const needle = root().querySelector('[data-slot="skill-check-indicator"]')!;
    const x = Number(/translate\(([\d.]+) 0\)/.exec(needle.getAttribute("transform")!)![1]);
    const line = root().querySelector('[data-slot="skill-check-track"]')!;
    expect(x).toBeCloseTo(Number(line.getAttribute("x2")) - Number(line.getAttribute("x1")));
  });

  it("getSkillCheckProgress maps angles to 0 … 1 of the current turn", () => {
    expect(getSkillCheckProgress(0)).toBe(0);
    expect(getSkillCheckProgress(-5)).toBe(0);
    expect(getSkillCheckProgress(90)).toBe(0.25);
    expect(getSkillCheckProgress(360)).toBe(1);
    expect(getSkillCheckProgress(450)).toBe(0.25);
    expect(getSkillCheckProgress(720)).toBe(1);
  });
});

describe("useSkillCheckGame", () => {
  let game: SkillCheckGame;
  function Game(props: UseSkillCheckGameOptions) {
    game = useSkillCheckGame({ random: () => 0, ...props });
    return (
      <div data-testid="game" data-angle={game.angle}>
        {game.round}/{game.rounds} {game.key}
      </div>
    );
  }

  it("is idle until start(), then runs, re-renders with the angle and reports the zone", () => {
    const onComplete = vi.fn();
    render(<Game onComplete={onComplete} />);
    expect(game.state).toBe("idle");
    advance(1000);
    expect(game.angle).toBe(0);
    act(() => game.start());
    expect(game.state).toBe("running");
    expect(game.zone).toEqual({ start: 90, size: 50 });
    expect(game.difficulty).toEqual({ areaSize: 50, speedMultiplier: 1 });
    advance(16 + 500);
    expect(game.angle).toBe(90);
    expect(game.progress).toBe(0.25);
    expect(screen.getByTestId("game")).toHaveAttribute("data-angle", "90");
    advance(140);
    let result: boolean | null = null;
    act(() => {
      result = game.press();
    });
    expect(result).toBe(true);
    expect(game.state).toBe("success");
    expect(onComplete).toHaveBeenCalledWith(true, { round: 1 });
    act(() => {
      result = game.press();
    });
    expect(result).toBeNull();
  });

  it("press(key) checks the configured keys and the random round key; the window listener works too", () => {
    const onRoundComplete = vi.fn();
    render(<Game active keys={["e", "f"]} randomKey random={() => 0.6} rounds={2} onRoundComplete={onRoundComplete} />);
    expect(game.key).toBe("f");
    expect(game.rounds).toBe(2);
    let result: boolean | null = null;
    act(() => {
      result = game.press("q");
    });
    expect(result).toBeNull();
    // zone 213..263°; 234° after 1300 ms
    advance(16 + 1300);
    press("F");
    expect(onRoundComplete).toHaveBeenLastCalledWith({ round: 1, success: true });
    expect(game.round).toBe(2);
    expect(game.flash).toBe(true);
    expect(game.angle).toBe(0);
    advance(16 + 1300);
    act(() => {
      result = game.press("e");
    });
    expect(result).toBe(false);
    expect(game.state).toBe("failed");
  });

  it("keyboard: false ignores window keys; cancel() stops without onComplete; timeouts fail", () => {
    const onComplete = vi.fn();
    render(<Game active keyboard={false} onComplete={onComplete} />);
    toInside();
    press("e");
    expect(game.state).toBe("running");
    act(() => game.cancel());
    expect(game.state).toBe("idle");
    expect(onComplete).not.toHaveBeenCalled();
    act(() => game.start());
    advance(16 + 2100);
    expect(onComplete).toHaveBeenCalledWith(false, { round: 1 });
  });

  it("frameUpdates: false draws via onFrame without re-rendering every frame", () => {
    const onFrame = vi.fn();
    let renders = 0;
    function Counting() {
      renders += 1;
      game = useSkillCheckGame({ active: true, random: () => 0, frameUpdates: false, onFrame });
      return null;
    }
    render(<Counting />);
    const before = renders;
    advance(16 + 500);
    expect(renders).toBe(before);
    expect(onFrame).toHaveBeenLastCalledWith(90);
    expect(game.getAngle()).toBe(90);
  });
});
