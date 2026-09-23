import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "../../utils/cn";
import { Kbd } from "../Kbd/Kbd";

// ---------------------------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------------------------

/** Size of the target zone in degrees and a multiplier for the indicator speed (`baseSpeed`). */
export interface SkillCheckDifficultyConfig {
  areaSize: number;
  speedMultiplier: number;
}

/** A preset (same values as ox_lib's skillCheck) or a custom `{ areaSize, speedMultiplier }`. */
export type SkillCheckDifficulty = "easy" | "medium" | "hard" | SkillCheckDifficultyConfig;

/** `"idle"` before the first start (or while `active` is false), then `running`, `success` or `failed`. */
export type SkillCheckState = "idle" | "running" | "success" | "failed";

export type SkillCheckSize = "sm" | "default" | "lg";

export interface SkillCheckResult {
  /** 1-based round the check ended in (the last round on success). */
  round: number;
}

export interface SkillCheckRoundResult {
  /** 1-based round that just ended. */
  round: number;
  success: boolean;
}

export interface SkillCheckLabels {
  /** Accessible name of the check. */
  label: string;
  /** Hint above the key in the centre. */
  press: string;
  /** Announced (live region) when every round was hit. */
  success: string;
  /** Announced (live region) when a round was missed. */
  failed: string;
  /** Visible round counter below the key (only shown with more than one round). */
  round: (current: number, total: number) => string;
  /** Screen-reader instructions while running. */
  instructions: (key: string) => string;
}

export const defaultSkillCheckLabels: SkillCheckLabels = {
  label: "Skill check",
  press: "Press",
  success: "Success",
  failed: "Failed",
  round: (current, total) => `${current}/${total}`,
  instructions: (key) => `Press ${key} when the marker is inside the highlighted zone.`,
};

/** ox_lib's presets. */
export const skillCheckDifficulties: Record<"easy" | "medium" | "hard", SkillCheckDifficultyConfig> = {
  easy: { areaSize: 50, speedMultiplier: 1 },
  medium: { areaSize: 40, speedMultiplier: 1.5 },
  hard: { areaSize: 25, speedMultiplier: 1.75 },
};

export function resolveSkillCheckDifficulty(difficulty: SkillCheckDifficulty): SkillCheckDifficultyConfig {
  const config = typeof difficulty === "string" ? skillCheckDifficulties[difficulty] : difficulty;
  return {
    areaSize: Math.min(300, Math.max(1, config.areaSize)),
    speedMultiplier: Math.max(0.01, config.speedMultiplier),
  };
}

const namedSizes: Record<SkillCheckSize, number> = { sm: 96, default: 128, lg: 160 };
/** Bar length in px for the named sizes of `variant="bar"`. */
const namedBarSizes: Record<SkillCheckSize, number> = { sm: 160, default: 224, lg: 288 };

/** How far (degrees) the zone starts after the indicator at least, and how much room it leaves before a full turn. */
const ZONE_LEAD = 90;
const ZONE_TAIL = 15;
const FLASH_MS = 250;

interface RunState {
  status: SkillCheckState;
  /** 0-based round index. */
  round: number;
  zoneStart: number;
  /** The resolved rounds of the current run. */
  plan: SkillCheckDifficultyConfig[];
  /** Key to press this round when `randomKey` is on. */
  roundKey: string | null;
  /** Brief feedback after a hit that is not the last round. */
  flash: boolean;
}

function resolvePlan(rounds: UseSkillCheckGameOptions["rounds"], difficulty: SkillCheckDifficulty): SkillCheckDifficultyConfig[] {
  if (Array.isArray(rounds)) {
    return (rounds.length ? rounds : [difficulty]).map(resolveSkillCheckDifficulty);
  }
  const count = Math.max(1, Math.floor(rounds ?? 1));
  const config = resolveSkillCheckDifficulty(difficulty);
  return Array.from({ length: count }, () => config);
}

function randomZoneStart(areaSize: number, random: () => number): number {
  const max = 360 - areaSize - ZONE_TAIL;
  if (max <= ZONE_LEAD) return Math.max(0, Math.min(ZONE_LEAD, 360 - areaSize));
  const r = Math.min(0.999999, Math.max(0, random()));
  return ZONE_LEAD + r * (max - ZONE_LEAD);
}

/** `key` / `code` of a key event (or a plain key string) against one configured key. */
function matchesKey(key: string, code: string | undefined, configured: string): boolean {
  return key.toLowerCase() === configured.toLowerCase() || code === configured;
}

function defaultKeyDisplay(key: string): string {
  if (key === " " || key === "Space") return "Space";
  if (/^Key[A-Z]$/.test(key)) return key.slice(3);
  if (/^Digit[0-9]$/.test(key)) return key.slice(5);
  return key.length === 1 ? key.toUpperCase() : key;
}

/**
 * Position of the indicator within the current turn, 0 … 1 (1 exactly at the end of a turn, so a bar indicator
 * stays at the right end when the round times out).
 */
export function getSkillCheckProgress(angle: number): number {
  if (!(angle > 0)) return 0;
  const rest = angle % 360;
  return rest === 0 ? 1 : rest / 360;
}

// ---------------------------------------------------------------------------------------------------------------------
// useSkillCheckGame (headless)
// ---------------------------------------------------------------------------------------------------------------------

export interface UseSkillCheckGameOptions {
  /** Difficulty of every round when `rounds` is a number (or omitted). Default `"easy"`. */
  difficulty?: SkillCheckDifficulty;
  /** Either the difficulty of each round (`["easy", "easy", "hard"]`) or a round count using `difficulty`. Default 1. */
  rounds?: SkillCheckDifficulty[] | number;
  /**
   * Keys that count as a press, compared case-insensitively with `KeyboardEvent.key` or exactly with
   * `KeyboardEvent.code` (`"e"`, `"KeyE"`, `" "`, `"Space"`). Default `["e"]`. Other keys are ignored.
   */
  keys?: string[];
  /** ox_lib style: each round picks one of `keys` at random; pressing another of the `keys` fails. Default `false`. */
  randomKey?: boolean;
  /**
   * Starts a run when it becomes `true`, stops it (state `idle`, no `onComplete`) when it becomes `false`.
   * Default `false` for the hook (call `start()`), `true` for `<SkillCheck>`.
   */
  active?: boolean;
  /** Changing this value restarts the run while `active` is `true`. */
  runKey?: string | number;
  /** Called once when a run ends. */
  onComplete?: (success: boolean, result: SkillCheckResult) => void;
  /** Called after every round. */
  onRoundComplete?: (result: SkillCheckRoundResult) => void;
  /** Indicator speed in degrees per second at `speedMultiplier: 1`. Default 180 (one turn in 2 s). */
  baseSpeed?: number;
  /** Full turns without a press before the round fails. Default 1. */
  timeoutTurns?: number;
  /** Random source in [0, 1) for zone positions and `randomKey` (seed it in tests). Default `Math.random`. */
  random?: () => number;
  /** Listens to `keydown` on `window` while running and calls `press` for the configured keys. Default `true`. */
  keyboard?: boolean;
  /**
   * Re-renders on every animation frame so `angle` / `progress` are current. Default `true`. Set it to `false` and
   * draw imperatively in `onFrame` (or read `getAngle()`) to avoid 60 renders per second.
   */
  frameUpdates?: boolean;
  /** Called on every animation frame (and on resets) with the indicator angle in degrees. */
  onFrame?: (angle: number) => void;
}

export interface SkillCheckZone {
  /** Start of the target zone in degrees (0 = 12 o'clock / left end of a bar). Divide by 360 for a 0–1 position. */
  start: number;
  /** Width of the zone in degrees (the round's `areaSize`). */
  size: number;
}

export interface SkillCheckGame {
  state: SkillCheckState;
  /** 1-based current round (the round the run ended in once it is over). */
  round: number;
  /** Number of rounds of the current (or next) run. */
  rounds: number;
  /** Target zone of the current round. */
  zone: SkillCheckZone;
  /** Indicator position in degrees since the round started (`0 … 360 × timeoutTurns`). */
  angle: number;
  /** Indicator position within the current turn, `0 … 1` (`getSkillCheckProgress(angle)`). */
  progress: number;
  /** Key to press this round (the random key with `randomKey`, otherwise the first of `keys`). */
  key: string;
  /** `true` for a short moment after a hit that is not the last round. */
  flash: boolean;
  /** Difficulty of the current round. */
  difficulty: SkillCheckDifficultyConfig;
  /**
   * Counts a press. Without `key` (click, tap, gamepad) only the zone matters; with `key` it must be one of `keys`
   * (otherwise ignored) and, with `randomKey`, the round's key. Returns whether the round was hit, or `null` when
   * nothing happened (not running, key not configured).
   */
  press: (key?: string) => boolean | null;
  /** Starts a new run (also restarts a running one). */
  start: () => void;
  /** Stops the run without calling `onComplete`; state becomes `idle`. */
  cancel: () => void;
  /** Current angle, read without waiting for a render (for imperative drawing). */
  getAngle: () => number;
}

/**
 * Headless skill-check game: rounds, difficulties, keys, random zones, timeouts and callbacks — the same logic
 * `<SkillCheck>` uses — so you can draw a completely custom minigame (lock pins, a fishing bar, a meter …).
 * The indicator advances with `requestAnimationFrame` while running.
 */
export function useSkillCheckGame(options: UseSkillCheckGameOptions = {}): SkillCheckGame {
  const {
    difficulty = "easy",
    rounds,
    keys = defaultKeys,
    randomKey = false,
    active = false,
    runKey,
    onComplete,
    onRoundComplete,
    baseSpeed = 180,
    timeoutTurns = 1,
    random = Math.random,
    keyboard = true,
    frameUpdates = true,
    onFrame,
  } = options;

  const [run, setRun] = useState<RunState>(() => ({
    status: "idle",
    round: 0,
    zoneStart: 0,
    plan: resolvePlan(rounds, difficulty),
    roundKey: null,
    flash: false,
  }));
  const [, setFrame] = useState(0);

  // Latest options for the effects and listeners, so a re-render with new inline callbacks doesn't restart anything.
  const latestValues = {
    rounds,
    difficulty,
    keys,
    randomKey,
    random,
    onComplete,
    onRoundComplete,
    baseSpeed,
    timeoutTurns,
    frameUpdates,
    onFrame,
  };
  const latest = useRef(latestValues);
  latest.current = latestValues;
  const runRef = useRef(run);
  runRef.current = run;
  const angleRef = useRef(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setAngle = useCallback((angle: number) => {
    angleRef.current = angle;
    latest.current.onFrame?.(angle);
    if (latest.current.frameUpdates) setFrame(angle);
  }, []);

  const pickKey = useCallback((): string | null => {
    const { keys: k, randomKey: rk, random: rnd } = latest.current;
    if (!rk || k.length === 0) return null;
    return k[Math.min(k.length - 1, Math.floor(Math.max(0, rnd()) * k.length))];
  }, []);

  const commit = useCallback((next: RunState) => {
    // Update the ref right away so a second key event in the same tick can't finish the round twice.
    runRef.current = next;
    setRun(next);
  }, []);

  const start = useCallback(() => {
    clearTimeout(flashTimer.current);
    setAngle(0);
    const { rounds: r, difficulty: d, random: rnd } = latest.current;
    const plan = resolvePlan(r, d);
    commit({ status: "running", round: 0, zoneStart: randomZoneStart(plan[0].areaSize, rnd), plan, roundKey: pickKey(), flash: false });
  }, [commit, pickKey, setAngle]);

  const cancel = useCallback(() => {
    clearTimeout(flashTimer.current);
    setAngle(0);
    commit({ ...runRef.current, status: "idle", round: 0, flash: false });
  }, [commit, setAngle]);

  // Start / restart / stop via `active` and `runKey`.
  useEffect(() => {
    if (active) start();
    else cancel();
  }, [active, runKey, start, cancel]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const finishRound = useCallback(
    (success: boolean): boolean => {
      const current = runRef.current;
      const roundNumber = current.round + 1;
      const { onRoundComplete: onRound, onComplete: onDone, random: rnd } = latest.current;
      const last = roundNumber >= current.plan.length;
      let next: RunState;
      if (!success) next = { ...current, status: "failed", flash: false };
      else if (last) next = { ...current, status: "success", flash: false };
      else {
        const nextRound = current.round + 1;
        next = {
          ...current,
          round: nextRound,
          zoneStart: randomZoneStart(current.plan[nextRound].areaSize, rnd),
          roundKey: pickKey(),
          flash: true,
        };
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setRun((previous) => ({ ...previous, flash: false })), FLASH_MS);
        setAngle(0);
      }
      commit(next);
      onRound?.({ round: roundNumber, success });
      if (!success || last) onDone?.(success, { round: roundNumber });
      return success;
    },
    [commit, pickKey, setAngle],
  );

  const inZone = useCallback(() => {
    const current = runRef.current;
    const config = current.plan[current.round];
    const angle = ((angleRef.current % 360) + 360) % 360;
    return angle >= current.zoneStart && angle <= current.zoneStart + config.areaSize;
  }, []);

  const press = useCallback(
    (key?: string, code?: string): boolean | null => {
      const current = runRef.current;
      if (current.status !== "running") return null;
      if (key === undefined && code === undefined) return finishRound(inZone());
      const eventKey = key ?? "";
      if (!latest.current.keys.some((configured) => matchesKey(eventKey, code, configured))) return null;
      const rightKey = current.roundKey === null || matchesKey(eventKey, code, current.roundKey);
      return finishRound(rightKey && inZone());
    },
    [finishRound, inZone],
  );

  // Animation: one requestAnimationFrame loop per round.
  const running = run.status === "running";
  useEffect(() => {
    if (!running) return;
    const config = run.plan[run.round];
    let begin: number | null = null;
    let frame = 0;
    const tick = (time: number) => {
      if (begin === null) begin = time;
      const { baseSpeed: speed, timeoutTurns: turns } = latest.current;
      const angle = ((time - begin) / 1000) * speed * config.speedMultiplier;
      const limit = 360 * Math.max(0.1, turns);
      if (angle >= limit) {
        setAngle(limit);
        finishRound(false);
        return;
      }
      setAngle(angle);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // `run.zoneStart` restarts the loop when a new round begins (also when the round index repeats after a restart).
  }, [running, run.round, run.zoneStart, run.plan, finishRound, setAngle]);

  // Keyboard: window listener only while running.
  useEffect(() => {
    if (!running || !keyboard) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const configured = latest.current.keys.some((key) => matchesKey(event.key, event.code, key));
      if (!configured) return;
      event.preventDefault();
      if (event.repeat) return;
      press(event.key, event.code);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [running, keyboard, press]);

  const publicPress = useCallback((key?: string) => press(key), [press]);
  const getAngle = useCallback(() => angleRef.current, []);

  const config = run.plan[Math.min(run.round, run.plan.length - 1)];
  const angle = angleRef.current;
  return {
    state: run.status,
    round: run.round + 1,
    rounds: run.plan.length,
    zone: { start: run.zoneStart, size: config.areaSize },
    angle,
    progress: getSkillCheckProgress(angle),
    key: run.roundKey ?? keys[0] ?? "",
    flash: run.flash,
    difficulty: config,
    press: publicPress,
    start,
    cancel,
    getAngle,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// SkillCheck
// ---------------------------------------------------------------------------------------------------------------------

export type SkillCheckVariant = "ring" | "bar";
export type SkillCheckZoneTone = "primary" | "positive" | "warning";
export type SkillCheckIndicatorTone = "foreground" | "primary" | "positive" | "warning";
export type SkillCheckPart = "root" | "svg" | "track" | "zone" | "indicator" | "content" | "hint" | "key" | "round" | "status";

/** What `renderContent` receives. */
export interface SkillCheckRenderState {
  state: SkillCheckState;
  /** 1-based current round. */
  round: number;
  rounds: number;
  /** Key to press this round (raw value from `keys`, e.g. `"e"` or `" "`). */
  key: string;
  /** Indicator position within the current turn, `0 … 1`. */
  progress: number;
}

export interface SkillCheckProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    Omit<UseSkillCheckGameOptions, "keyboard" | "frameUpdates" | "onFrame"> {
  /** `"ring"` (default): marker runs around a ring · `"bar"`: marker slides left → right along a horizontal bar. */
  variant?: SkillCheckVariant;
  /** Runs the check while `true`. Switching to `false` stops it without calling `onComplete`. Default `true`. */
  active?: boolean;
  /**
   * Ring: `"sm"` 96px, `"default"` 128px, `"lg"` 160px, or a number in px.
   * Bar: the bar length — `"sm"` 160px, `"default"` 224px, `"lg"` 288px, or a number in px.
   */
  size?: SkillCheckSize | number;
  /** Stroke width of the ring / height of the bar in px. Default: ring size / 16, bar length / 24. */
  thickness?: number;
  /** Colour of the target zone while running. Default `"primary"` (success/failure still show positive/negative). */
  zoneTone?: SkillCheckZoneTone;
  /** Colour of the marker while running. Default `"foreground"`. */
  indicatorTone?: SkillCheckIndicatorTone;
  /** Shows the key to press (Kbd style). Default `true`. */
  showKey?: boolean;
  /** Custom display of a key, e.g. `(key) => key === " " ? "Leertaste" : undefined`. */
  formatKey?: (key: string) => ReactNode | undefined;
  /**
   * Replaces the centre content (hint, key, round counter). With it the component re-renders on every animation frame
   * so `progress` is current.
   */
  renderContent?: (state: SkillCheckRenderState) => ReactNode;
  /** Extra classes per part, merged after the defaults. */
  classNames?: Partial<Record<SkillCheckPart, string>>;
  /** Visible and screen-reader texts (English defaults). */
  labels?: Partial<SkillCheckLabels>;
  /** Also count a primary pointer press on the check (click / tap). Default `true`. */
  pointer?: boolean;
}

const zoneToneClasses: Record<SkillCheckZoneTone, string> = {
  primary: "stroke-pui-primary",
  positive: "stroke-pui-positive",
  warning: "stroke-pui-warning",
};

const indicatorToneClasses: Record<SkillCheckIndicatorTone, string> = {
  foreground: "stroke-pui-foreground",
  primary: "stroke-pui-primary",
  positive: "stroke-pui-positive",
  warning: "stroke-pui-warning",
};

/**
 * "Press the key at the right moment" minigame (lockpicking, repairing, fishing — like ox_lib's `skillCheck`).
 * A marker runs around a ring (or along a bar); the player presses one of `keys` (or clicks/taps the check) while it is
 * inside the highlighted zone. Missing the zone, pressing too early/late or letting the marker complete
 * `timeoutTurns` turns fails the whole check. The marker keeps moving with `prefers-reduced-motion` — the movement
 * is the game. For a completely custom look use `useSkillCheckGame`.
 */
export const SkillCheck = /* @__PURE__ */ forwardRef<HTMLDivElement, SkillCheckProps>(function SkillCheck(
  {
    className,
    style,
    variant = "ring",
    difficulty = "easy",
    rounds,
    keys = defaultKeys,
    randomKey = false,
    active = true,
    runKey,
    onComplete,
    onRoundComplete,
    size = "default",
    thickness,
    baseSpeed = 180,
    timeoutTurns = 1,
    random = Math.random,
    zoneTone = "primary",
    indicatorTone = "foreground",
    showKey = true,
    formatKey,
    renderContent,
    classNames,
    labels: labelsProp,
    pointer = true,
    onPointerDown,
    ...props
  },
  ref,
) {
  const labels = { ...defaultSkillCheckLabels, ...labelsProp };
  const isBar = variant === "bar";

  // Ring geometry.
  const px = isBar
    ? typeof size === "number"
      ? Math.max(48, size)
      : namedBarSizes[size]
    : typeof size === "number"
      ? Math.max(24, size)
      : namedSizes[size];
  const stroke = isBar
    ? Math.min(thickness ?? Math.max(6, Math.round(px / 24)), px / 4)
    : Math.min(thickness ?? Math.max(3, px / 16), px / 4);
  const needleOverhang = Math.max(3, stroke * 0.75);
  const radius = px / 2 - stroke / 2 - needleOverhang;
  const centre = px / 2;
  const circumference = 2 * Math.PI * radius;
  // Bar geometry: the marker is centred on the position, so the track leaves half a marker of room at both ends.
  const needleWidth = Math.max(2, stroke / 2);
  const barInset = needleWidth / 2;
  const barLength = px - needleWidth;
  const barHeight = stroke + needleOverhang * 2;
  const barMid = barHeight / 2;

  const needleRef = useRef<SVGGElement>(null);
  const needleTransform = useCallback(
    (angle: number) =>
      isBar ? `translate(${getSkillCheckProgress(angle) * barLength} 0)` : `rotate(${angle} ${centre} ${centre})`,
    [isBar, barLength, centre],
  );
  const onFrame = useCallback(
    (angle: number) => {
      needleRef.current?.setAttribute("transform", needleTransform(angle));
    },
    [needleTransform],
  );

  const game = useSkillCheckGame({
    difficulty,
    rounds,
    keys,
    randomKey,
    active,
    runKey,
    onComplete,
    onRoundComplete,
    baseSpeed,
    timeoutTurns,
    random,
    // Draw the marker imperatively; re-render per frame only when renderContent needs `progress`.
    frameUpdates: renderContent != null,
    onFrame,
  });

  const running = game.state === "running";
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (event.defaultPrevented || !pointer || event.button !== 0 || !running) return;
    event.preventDefault();
    game.press();
  };

  const displayKey = game.key;
  const keyContent = displayKey ? (formatKey?.(displayKey) ?? defaultKeyDisplay(displayKey)) : null;
  const keyText = typeof keyContent === "string" ? keyContent : defaultKeyDisplay(displayKey);
  const showZone = game.state !== "idle";
  const total = game.rounds;

  const zoneColor =
    game.state === "failed"
      ? "stroke-pui-negative"
      : game.state === "success" || game.flash
        ? "stroke-pui-positive"
        : zoneToneClasses[zoneTone];
  const needleColor =
    game.state === "failed"
      ? "stroke-pui-negative"
      : game.state === "success"
        ? "stroke-pui-positive"
        : indicatorToneClasses[indicatorTone];

  const sizeStyle: CSSProperties = isBar ? { width: px, ...style } : { width: px, height: px, ...style };
  const initialTransform = needleTransform(game.getAngle());

  const zoneClass = cn("fill-none transition-colors duration-pui-fast ease-pui", zoneColor, classNames?.zone);
  const trackClass = cn("fill-none stroke-pui-muted", classNames?.track);
  const needleClass = cn("transition-colors duration-pui-fast ease-pui", needleColor, classNames?.indicator);

  const defaultContent = (
    <>
      {showKey && keyContent != null && (
        <>
          <span
            data-slot="skill-check-hint"
            className={cn("text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground", classNames?.hint)}
          >
            {labels.press}
          </span>
          <Kbd data-slot="skill-check-key" className={cn("h-7 min-w-7 px-1.5 text-sm text-pui-foreground", classNames?.key)}>
            {keyContent}
          </Kbd>
        </>
      )}
      {total > 1 && game.state !== "idle" && (
        <span
          data-slot="skill-check-round"
          className={cn("text-xs tabular-nums text-pui-muted-foreground", isBar && "ml-auto", classNames?.round)}
        >
          {labels.round(game.round, total)}
        </span>
      )}
    </>
  );
  const content = renderContent
    ? renderContent({ state: game.state, round: game.round, rounds: total, key: displayKey, progress: game.progress })
    : defaultContent;

  return (
    <div
      ref={ref}
      role="group"
      aria-label={labels.label}
      data-slot="skill-check"
      data-variant={variant}
      data-state={game.state}
      data-size={typeof size === "number" ? "custom" : size}
      data-round={game.round}
      data-rounds={total}
      data-flash={game.flash ? "" : undefined}
      className={cn(
        isBar
          ? "relative inline-flex shrink-0 select-none flex-col items-stretch gap-2"
          : "relative inline-flex shrink-0 select-none items-center justify-center",
        pointer && running && "cursor-pointer",
        className,
        classNames?.root,
      )}
      style={sizeStyle}
      onPointerDown={handlePointerDown}
      {...props}
    >
      {isBar ? (
        <svg
          data-slot="skill-check-svg"
          viewBox={`0 0 ${px} ${barHeight}`}
          width={px}
          height={barHeight}
          aria-hidden="true"
          focusable="false"
          className={cn("block overflow-visible", classNames?.svg)}
        >
          <line
            data-slot="skill-check-track"
            x1={barInset}
            y1={barMid}
            x2={barInset + barLength}
            y2={barMid}
            strokeWidth={stroke}
            className={trackClass}
          />
          {showZone && (
            <line
              data-slot="skill-check-zone"
              x1={barInset + (game.zone.start / 360) * barLength}
              y1={barMid}
              x2={barInset + (Math.min(360, game.zone.start + game.zone.size) / 360) * barLength}
              y2={barMid}
              strokeWidth={stroke}
              className={zoneClass}
            />
          )}
          <g data-slot="skill-check-indicator" ref={needleRef} transform={initialTransform}>
            <line
              x1={barInset}
              y1={0}
              x2={barInset}
              y2={barHeight}
              strokeWidth={needleWidth}
              className={needleClass}
            />
          </g>
        </svg>
      ) : (
        <svg
          data-slot="skill-check-svg"
          viewBox={`0 0 ${px} ${px}`}
          aria-hidden="true"
          focusable="false"
          className={cn("absolute inset-0 size-full overflow-visible", classNames?.svg)}
        >
          <circle data-slot="skill-check-track" cx={centre} cy={centre} r={radius} strokeWidth={stroke} className={trackClass} />
          {showZone && (
            <circle
              data-slot="skill-check-zone"
              cx={centre}
              cy={centre}
              r={radius}
              strokeWidth={stroke}
              // The circle's stroke starts at 3 o'clock; -90 moves it to 12 o'clock, then clockwise to the zone.
              transform={`rotate(${game.zone.start - 90} ${centre} ${centre})`}
              strokeDasharray={`${(game.zone.size / 360) * circumference} ${circumference}`}
              className={zoneClass}
            />
          )}
          <g data-slot="skill-check-indicator" ref={needleRef} transform={initialTransform}>
            <line
              x1={centre}
              y1={centre - radius - stroke / 2 - needleOverhang}
              x2={centre}
              y2={centre - radius + stroke / 2 + needleOverhang}
              strokeWidth={needleWidth}
              strokeLinecap="round"
              className={needleClass}
            />
          </g>
        </svg>
      )}
      <div
        data-slot="skill-check-content"
        className={cn(
          isBar
            ? "flex items-center gap-2 text-pui-foreground"
            : "relative flex flex-col items-center justify-center gap-1 text-center text-pui-foreground",
          classNames?.content,
        )}
      >
        {content}
      </div>
      <span
        data-slot="skill-check-status"
        className={cn("sr-only", classNames?.status)}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {game.state === "success"
          ? labels.success
          : game.state === "failed"
            ? labels.failed
            : running
              ? labels.instructions(keyText)
              : ""}
      </span>
    </div>
  );
});

const defaultKeys = ["e"];

// ---------------------------------------------------------------------------------------------------------------------
// useSkillCheck
// ---------------------------------------------------------------------------------------------------------------------

/** Props `useSkillCheck` passes to `<SkillCheck {...props} />`. */
export interface SkillCheckControlledProps {
  active: boolean;
  runKey: number;
  rounds: SkillCheckDifficulty[];
  keys?: string[];
  onComplete: (success: boolean, result: SkillCheckResult) => void;
}

export interface UseSkillCheckReturn {
  /**
   * Starts a check and resolves with `true` when every round was hit, `false` on a miss, on `cancel()`, when
   * `start` is called again before the previous check ended, or when the component using the hook unmounts.
   */
  start: (difficulties: SkillCheckDifficulty | SkillCheckDifficulty[], keys?: string[]) => Promise<boolean>;
  /** Stops the running check; its promise resolves with `false`. */
  cancel: () => void;
  /** `true` while a started check hasn't ended (use it to show/hide the SkillCheck). */
  running: boolean;
  /** Spread onto `<SkillCheck {...props} />`. */
  props: SkillCheckControlledProps;
}

/**
 * Imperative, ox_lib-style skill check: `const ok = await skillCheck.start(["easy", "medium"], ["e"])` while
 * rendering `<SkillCheck {...skillCheck.props} />`. After the check ends the SkillCheck stays in its
 * `success`/`failed` state until the next `start()` — hide it with `running` (or after a short delay).
 */
export function useSkillCheck(): UseSkillCheckReturn {
  const [state, setState] = useState<{ active: boolean; running: boolean; runKey: number; rounds: SkillCheckDifficulty[]; keys?: string[] }>(
    { active: false, running: false, runKey: 0, rounds: ["easy"] },
  );
  const resolveRef = useRef<((success: boolean) => void) | null>(null);

  const settle = useCallback((success: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(success);
  }, []);

  const start = useCallback<UseSkillCheckReturn["start"]>(
    (difficulties, keys) =>
      new Promise<boolean>((resolve) => {
        settle(false);
        resolveRef.current = resolve;
        const rounds = Array.isArray(difficulties) ? difficulties : [difficulties];
        setState((previous) => ({ active: true, running: true, runKey: previous.runKey + 1, rounds, keys }));
      }),
    [settle],
  );

  const cancel = useCallback(() => {
    settle(false);
    setState((previous) => ({ ...previous, active: false, running: false }));
  }, [settle]);

  const onComplete = useCallback(
    (success: boolean) => {
      setState((previous) => ({ ...previous, running: false }));
      settle(success);
    },
    [settle],
  );

  useEffect(() => () => settle(false), [settle]);

  const props = useMemo<SkillCheckControlledProps>(
    () => ({ active: state.active, runKey: state.runKey, rounds: state.rounds, keys: state.keys, onComplete }),
    [state.active, state.runKey, state.rounds, state.keys, onComplete],
  );

  return { start, cancel, running: state.running, props };
}
