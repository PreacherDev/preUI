// Loading screen helpers (separate entry `@pre_scripts/preui-nui/loadscreen`): the game's loading events and the
// data a server hands over with `deferrals.handover`.

import { useEffect, useState } from "react";
import { isEnvBrowser } from "./nui";

/** Where the game is while loading, in this order. `"ready"` comes with the end of `INIT_SESSION`. */
export type LoadPhase = "core" | "files" | "map" | "session" | "ready";

export interface LoadscreenState {
  /** 0 to 1, never goes backwards (the game's `loadFraction` jumps around). `1` once `phase` is `"ready"`. */
  progress: number;
  /** Never goes backwards (the game sends some phases more than once). */
  phase: LoadPhase;
  /** The last log line the game sent (`onLogLine`), `null` before the first. */
  log: string | null;
}

/** A message the game posts to a loading screen (FiveM's `LoadingScreens.cpp`), e.g. `{ eventName: "loadProgress", loadFraction: 0.4 }`. */
export interface LoadscreenMessage {
  eventName: string;
  loadFraction?: number;
  /** `INIT_CORE`, `INIT_BEFORE_MAP_LOADED`, `INIT_AFTER_MAP_LOADED` or `INIT_SESSION` for the init events. */
  type?: string;
  /** Text of `onLogLine`. */
  message?: string;
}

const PHASE_ORDER: readonly LoadPhase[] = ["core", "files", "map", "session", "ready"];

const INIT_PHASES: Record<string, LoadPhase> = {
  INIT_CORE: "core",
  INIT_BEFORE_MAP_LOADED: "files",
  INIT_AFTER_MAP_LOADED: "map",
  INIT_SESSION: "session",
};

/** The state before the first message. */
export const initialLoadscreenState: LoadscreenState = { progress: 0, phase: "core", log: null };

/** `true` for a loading screen message from the game (an object with a string `eventName`). */
export function isLoadscreenMessage(data: unknown): data is LoadscreenMessage {
  return typeof data === "object" && data !== null && typeof (data as LoadscreenMessage).eventName === "string";
}

function phaseOf(message: LoadscreenMessage): LoadPhase | null {
  switch (message.eventName) {
    case "startInitFunction":
      return INIT_PHASES[message.type ?? ""] ?? null;
    case "startDataFileEntries":
      return "files";
    case "performMapLoadFunction":
      return "map";
    case "endInitFunction":
      return message.type === "INIT_SESSION" ? "ready" : null;
    default:
      return null;
  }
}

/**
 * The next state after one game message; returns `state` itself when nothing changed. Progress and phase only move
 * forward. What `useLoadscreen` uses, for your own store or tests.
 */
export function reduceLoadscreen(state: LoadscreenState, message: LoadscreenMessage): LoadscreenState {
  let { progress, phase, log } = state;

  if (message.eventName === "loadProgress" && typeof message.loadFraction === "number" && !Number.isNaN(message.loadFraction)) {
    progress = Math.max(progress, Math.min(Math.max(message.loadFraction, 0), 1));
  }
  if (message.eventName === "onLogLine" && typeof message.message === "string") log = message.message;

  const next = phaseOf(message);
  if (next && PHASE_ORDER.indexOf(next) > PHASE_ORDER.indexOf(phase)) phase = next;
  if (phase === "ready") progress = 1;

  return progress === state.progress && phase === state.phase && log === state.log ? state : { progress, phase, log };
}

/**
 * Progress and phase of the game's loading, for a page set with `loadscreen` in `fxmanifest.lua`. Listens to the
 * messages FiveM posts to the loading screen (`loadProgress`, `startInitFunction`, `startDataFileEntries`,
 * `performMapLoadFunction`, `endInitFunction`, `onLogLine`). In a browser nothing arrives: use `debugLoadscreen()`.
 *
 * ```tsx
 * const { progress, phase } = useLoadscreen();
 * <Progress value={progress * 100} />
 * ```
 */
export function useLoadscreen(): LoadscreenState {
  const [state, setState] = useState<LoadscreenState>(initialLoadscreenState);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data: unknown = event.data;
      if (isLoadscreenMessage(data)) setState((current) => reduceLoadscreen(current, data));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return state;
}

declare global {
  interface Window {
    /** What the server passed to `deferrals.handover(...)`, set by FiveM on the loading screen. */
    nuiHandoverData?: unknown;
  }
}

/**
 * The data the server handed over with `deferrals.handover({ ... })` (`window.nuiHandoverData`), or `null` when
 * there is none (a browser, or before FiveM set it). With `key`, only that field: `getNuiHandover<Theme>("theme")`.
 * Not checked at runtime: validate what you read.
 */
export function getNuiHandover<T = Record<string, unknown>>(): T | null;
export function getNuiHandover<T = unknown>(key: string): T | null;
export function getNuiHandover(key?: string): unknown {
  if (typeof window === "undefined") return null;
  const data = window.nuiHandoverData;
  if (data === undefined || data === null) return null;
  if (key === undefined) return data;
  if (typeof data !== "object") return null;
  return (data as Record<string, unknown>)[key] ?? null;
}

/**
 * Plays the game's loading messages on `window` as if the game was loading: the phases in order, `loadProgress` from
 * 0 to 1 over `seconds`, and the end of `INIT_SESSION` half a second later. Works inside FiveM too (e.g. a preview
 * of the loading screen in an admin tool). Returns a function that stops it.
 */
export function playLoadscreenDemo(seconds = 10): () => void {
  if (typeof window === "undefined") return () => {};

  const steps: LoadscreenMessage[] = [
    { eventName: "startInitFunction", type: "INIT_CORE" },
    { eventName: "startInitFunction", type: "INIT_BEFORE_MAP_LOADED" },
    { eventName: "startDataFileEntries" },
    { eventName: "performMapLoadFunction" },
    { eventName: "startInitFunction", type: "INIT_AFTER_MAP_LOADED" },
    { eventName: "startInitFunction", type: "INIT_SESSION" },
  ];
  const ticks = 40;
  const total = Math.max(seconds, 0) * 1000;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const post = (message: LoadscreenMessage) => window.postMessage(message, "*");

  for (let tick = 1; tick <= ticks; tick++) {
    const step = steps[Math.floor(((tick - 1) / ticks) * steps.length)];
    timers.push(
      setTimeout(() => {
        post(step);
        post({ eventName: "loadProgress", loadFraction: tick / ticks });
      }, (tick / ticks) * total),
    );
  }
  timers.push(setTimeout(() => post({ eventName: "endInitFunction", type: "INIT_SESSION" }), total + 500));

  return () => timers.forEach(clearTimeout);
}

export interface DebugLoadscreenOptions {
  /** Length of the simulated load. @default 10 */
  seconds?: number;
  /** Set as `window.nuiHandoverData`, what `getNuiHandover()` returns. */
  handover?: unknown;
}

/**
 * Browser development only (no-op inside FiveM, returns a no-op): sets `handover` as the handed over data and plays
 * a simulated load (`playLoadscreenDemo`). Call it at the top of `main.tsx`, before rendering, so `getNuiHandover()`
 * already has the data on the first render. Returns a function that stops the demo.
 */
export function debugLoadscreen({ seconds = 10, handover }: DebugLoadscreenOptions = {}): () => void {
  if (typeof window === "undefined" || !isEnvBrowser()) return () => {};
  if (handover !== undefined) window.nuiHandoverData = handover;
  return playLoadscreenDemo(seconds);
}
