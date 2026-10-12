import { useEffect, useMemo, useReducer, useRef } from "react";
import { isOverlayOpen } from "../../utils/escape";

/**
 * JSON with sorted object keys, so two values that only differ in key order (or came back from a server in another
 * order) compare equal. `undefined` properties are left out like in `JSON.stringify`; `toJSON` (e.g. `Date`) is used.
 */
export function stableStringify(value: unknown): string {
  const json = JSON.stringify(value, (_key, entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
    const record = entry as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) sorted[key] = record[key];
    return sorted;
  });
  return json === undefined ? "undefined" : json;
}

/** A deep copy, so editing the draft can never touch the saved value. Values that can't be cloned are kept. */
function cloneValue<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  try {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

/** Step labels the hook adds by itself (English defaults). */
export interface DraftHistoryLabels {
  /** Label of a `setDraft` call without a label of its own. */
  edit: string;
  /** Label of the step `discard()` adds. */
  discard: string;
}

export const defaultDraftHistoryLabels: DraftHistoryLabels = {
  edit: "Edit",
  discard: "Discard changes",
};

export interface DraftChangeOptions {
  /** Shown in the undo / redo tooltip, e.g. "Name changed". Defaults to `labels.edit`. */
  label?: string;
  /**
   * Changes of the same group that follow each other within `mergeMs` become one step (typing in one field).
   * Defaults to the label, so give each field its own label or group.
   */
  group?: string;
  /** `false` always starts a new step (a button press, a picked value). @default true */
  merge?: boolean;
}

/**
 * A step the app takes back itself, e.g. a save or delete the server can undo. Return `false` (or a promise of
 * `false`) when it failed: the step then stays where it was. Both run inside `run`, so `busy` is on meanwhile.
 */
export interface DraftHistoryAction {
  undo: () => unknown;
  redo: () => unknown;
}

export interface UseDraftHistoryOptions<T, K> {
  /**
   * The entry the draft belongs to (master-detail). When it changes, the draft is loaded from `saved`. Steps remember
   * their entry: undoing a change made in another entry calls `onKeyChange` with it, so the app selects it again.
   * Don't use `undefined` as a key (it means "no entries"); use `null` for "nothing selected".
   */
  key?: K;
  /** Called when undo / redo goes back to a change in another entry; select `key` there. */
  onKeyChange?: (key: K) => void;
  /** Turns a value into the string that decides "unsaved". @default stableStringify */
  serialize?: (value: T) => string;
  /** Changes of one group within this many ms are one step. @default 400 */
  mergeMs?: number;
  /** Oldest steps are dropped beyond this many. @default 100 */
  maxSteps?: number;
  /** `run` keeps `busy` on at least this long after it started (ms), e.g. a server cooldown. @default 0 */
  cooldown?: number;
  /**
   * Ctrl+Z undoes, Ctrl+Y and Ctrl+Shift+Z redo (also with ⌘). Not while a text field has the focus (it keeps its own
   * typing undo) or a dialog, menu or popup is open. @default true
   */
  keyboard?: boolean;
  labels?: Partial<DraftHistoryLabels>;
}

export interface DraftHistoryConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export interface DraftHistory<T, K = string> {
  /** The value being edited. */
  draft: T;
  /** The draft differs from `saved`. */
  dirty: boolean;
  /** The entry the draft belongs to (`options.key`, or where undo / redo / `load` went). */
  key: K | undefined;
  /** Changes the draft as one undoable step (merged with the previous one while typing). */
  setDraft: (next: T | ((draft: T) => T), options?: string | DraftChangeOptions) => void;
  /** Replaces the draft without a step, e.g. a new, unsaved entry. Pass the key you select along with it. */
  load: (value: T, key?: K) => void;
  /** From the next render the draft is `saved` again (call it after a successful save). Keeps the steps. */
  reset: () => void;
  /** Sets the draft back to `saved` as an undoable step. */
  discard: () => void;
  /** Adds a step the app takes back itself (see `DraftHistoryAction`). Clears the redo steps. */
  record: (label: string, action: DraftHistoryAction) => void;
  /** Takes the newest step back. Resolves `false` when there was nothing to undo, it was busy, or the action failed. */
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  canUndo: boolean;
  canRedo: boolean;
  /** Label of the step `undo` would take back. */
  undoLabel: string | undefined;
  redoLabel: string | undefined;
  /** Labels of all undo steps, oldest first. */
  past: readonly string[];
  /** Labels of all redo steps, the next one last. */
  future: readonly string[];
  /** Drops all undo and redo steps. */
  clearHistory: () => void;
  /** `run` is working or its cooldown hasn't run out. Undo and redo wait meanwhile. */
  busy: boolean;
  /** Runs a task (e.g. a server request) with `busy` on, at least `cooldown` ms long. */
  run: <R>(task: () => R | Promise<R>, options?: { cooldown?: number }) => Promise<R>;
  /** Runs `action` at once, or — with unsaved changes — after the user confirmed dropping them. */
  request: (action: () => void) => void;
  /** A `request` waits for the confirmation. */
  pending: boolean;
  confirmPending: () => void;
  cancelPending: () => void;
  /** Spread into `ConfirmDialog` to ask before `request` drops unsaved changes. */
  confirmProps: DraftHistoryConfirmProps;
}

type Step<T, K> =
  | {
      kind: "draft";
      label: string;
      group: string;
      /** The draft before and after the change (after grows while merging), so undo and redo never depend on what is open now. */
      before: T;
      beforeJson: string;
      after: T;
      afterJson: string;
      key: K | undefined;
      at: number;
    }
  | { kind: "action"; label: string; action: DraftHistoryAction };

interface Store<T, K> {
  draft: T;
  draftJson: string;
  saved: T;
  /** `null` right after the draft was replaced without `saved` (undo into another entry, `load`): adopt the next. */
  savedJson: string | null;
  key: K | undefined;
  past: Step<T, K>[];
  future: Step<T, K>[];
  /** The step the next change may merge into. */
  mergeable: Step<T, K> | null;
  resetPending: boolean;
  pending: (() => void) | null;
  busy: number;
}

// Text fields keep their own typing undo. Checkboxes, radios and buttons don't, so the shortcut works there.
const TEXT_TARGET =
  "textarea, select, [contenteditable]:not([contenteditable='false']), " +
  "input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=reset]):not([type=color]):not([type=file])";

/**
 * Undo / redo of a key press, or `null`. FiveM's CEF sends Ctrl+letter as a control character (Ctrl+Z as `\u001a`),
 * so those are mapped back to their letter. The letter comes from `key`, so it follows the keyboard layout (QWERTZ).
 */
export function getHistoryShortcut(event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">): "undo" | "redo" | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null;
  let key = event.key ?? "";
  if (key.length === 1 && key.charCodeAt(0) < 32) key = String.fromCharCode(key.charCodeAt(0) + 96);
  else if ((key === "" || key === "Unidentified") && event.code?.startsWith("Key")) key = event.code.slice(3);
  key = key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && !event.shiftKey) return "redo";
  return null;
}

/**
 * Draft, unsaved check and undo / redo for an editor of `saved`. Every `setDraft` is an undoable step with a label;
 * typing in one field within `mergeMs` is one step. With `key` it serves a master-detail editor: switching the entry
 * loads its saved value, and undo goes back across entries. `request` asks before dropping unsaved changes, `run`
 * keeps a busy state for server calls (optionally with a cooldown).
 *
 * ```tsx
 * const editor = useDraftHistory(savedBranch, { key: selectedId, onKeyChange: setSelectedId });
 * <Input value={editor.draft.name} onChange={(e) => editor.setDraft({ ...editor.draft, name: e.target.value }, "Name")} />
 * ```
 */
export function useDraftHistory<T, K = string>(saved: T, options: UseDraftHistoryOptions<T, K> = {}): DraftHistory<T, K> {
  const { key, serialize = stableStringify, keyboard = true } = options;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const [, rerender] = useReducer((version: number) => version + 1, 0);

  const savedJson = useMemo(() => serialize(saved), [saved, serialize]);
  const storeRef = useRef<Store<T, K> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = {
      draft: cloneValue(saved),
      draftJson: savedJson,
      saved,
      savedJson,
      key,
      past: [],
      future: [],
      mergeable: null,
      resetPending: false,
      pending: null,
      busy: 0,
    };
  }
  const store = storeRef.current;

  // Follow the props. Idempotent, so a repeated render (Strict Mode) ends in the same state.
  const keyed = key !== undefined;
  if (keyed && !Object.is(key, store.key)) {
    // The app selected another entry: start from its saved value.
    store.key = key;
    store.draft = cloneValue(saved);
    store.draftJson = savedJson;
    store.mergeable = null;
    store.resetPending = false;
  } else if (store.resetPending) {
    store.draft = cloneValue(saved);
    store.draftJson = savedJson;
    store.mergeable = null;
    store.resetPending = false;
  } else if (store.savedJson !== null && store.savedJson !== savedJson && store.draftJson === store.savedJson) {
    // A clean draft follows a new saved value (another save, a server undo, a refresh).
    store.draft = cloneValue(saved);
    store.draftJson = savedJson;
    store.mergeable = null;
  }
  store.saved = saved;
  store.savedJson = savedJson;

  const mounted = useRef(true);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    mounted.current = true;
    const pendingTimers = timers.current;
    return () => {
      mounted.current = false;
      for (const timer of pendingTimers) clearTimeout(timer);
      pendingTimers.clear();
    };
  }, []);

  const api = useMemo(() => {
    const labels = () => ({ ...defaultDraftHistoryLabels, ...optionsRef.current.labels });
    const toJson = (value: T) => (optionsRef.current.serialize ?? stableStringify)(value);
    const trim = (steps: Step<T, K>[]) => {
      const max = Math.max(1, optionsRef.current.maxSteps ?? 100);
      if (steps.length > max) steps.splice(0, steps.length - max);
    };

    const setDraft = (next: T | ((draft: T) => T), changeOptions?: string | DraftChangeOptions) => {
      const opts: DraftChangeOptions = typeof changeOptions === "string" ? { label: changeOptions } : (changeOptions ?? {});
      const value = typeof next === "function" ? (next as (draft: T) => T)(store.draft) : next;
      const json = toJson(value);
      if (json === store.draftJson) return;

      const label = opts.label ?? labels().edit;
      const group = opts.group ?? label;
      const now = Date.now();
      const last = store.past[store.past.length - 1];
      const mergeMs = optionsRef.current.mergeMs ?? 400;
      if (
        opts.merge !== false &&
        last !== undefined &&
        last === store.mergeable &&
        last.kind === "draft" &&
        last.group === group &&
        Object.is(last.key, store.key) &&
        now - last.at <= mergeMs
      ) {
        last.at = now;
        last.after = value;
        last.afterJson = json;
      } else {
        const step: Step<T, K> = {
          kind: "draft",
          label,
          group,
          before: store.draft,
          beforeJson: store.draftJson,
          after: value,
          afterJson: json,
          key: store.key,
          at: now,
        };
        store.past.push(step);
        trim(store.past);
        store.mergeable = step;
      }
      store.future = [];
      store.draft = value;
      store.draftJson = json;
      rerender();
    };

    const load = (value: T, nextKey?: K) => {
      store.draft = cloneValue(value);
      store.draftJson = toJson(value);
      if (nextKey !== undefined) store.key = nextKey;
      store.savedJson = null;
      store.mergeable = null;
      store.resetPending = false;
      rerender();
    };

    const run = async <R,>(task: () => R | Promise<R>, runOptions?: { cooldown?: number }): Promise<R> => {
      const started = Date.now();
      store.busy += 1;
      if (store.busy === 1) rerender();
      const finish = () => {
        store.busy = Math.max(0, store.busy - 1);
        if (store.busy === 0 && mounted.current) rerender();
      };
      try {
        return await task();
      } finally {
        const rest = (runOptions?.cooldown ?? optionsRef.current.cooldown ?? 0) - (Date.now() - started);
        if (rest > 0 && mounted.current) {
          const timer = setTimeout(() => {
            timers.current.delete(timer);
            finish();
          }, rest);
          timers.current.add(timer);
        } else {
          finish();
        }
      }
    };

    // Moves the newest step of one stack to the other and applies it.
    const travel = async (direction: "undo" | "redo"): Promise<boolean> => {
      if (store.busy > 0) return false;
      const from = direction === "undo" ? store.past : store.future;
      const step = from.pop();
      if (!step) return false;
      const to = () => (direction === "undo" ? store.future : store.past);
      store.mergeable = null;

      if (step.kind === "draft") {
        to().push(step);
        store.draft = direction === "undo" ? step.before : step.after;
        store.draftJson = direction === "undo" ? step.beforeJson : step.afterJson;
        if (step.key !== undefined && !Object.is(step.key, store.key)) {
          store.key = step.key;
          store.savedJson = null;
          optionsRef.current.onKeyChange?.(step.key);
        }
        rerender();
        return true;
      }

      rerender();
      let ok = false;
      try {
        const result = await run(() => (direction === "undo" ? step.action.undo() : step.action.redo()));
        ok = result !== false;
      } catch {
        ok = false;
      }
      // Not taken back: it stays where it was.
      if (ok) to().push(step);
      else from.push(step);
      if (mounted.current) rerender();
      return ok;
    };

    const isDirty = () => store.draftJson !== (store.savedJson ?? toJson(store.saved));

    return {
      setDraft,
      load,
      run,
      undo: () => travel("undo"),
      redo: () => travel("redo"),
      reset: () => {
        store.resetPending = true;
        rerender();
      },
      discard: () => setDraft(cloneValue(store.saved), { label: labels().discard, merge: false }),
      record: (label: string, action: DraftHistoryAction) => {
        store.past.push({ kind: "action", label, action });
        trim(store.past);
        store.future = [];
        store.mergeable = null;
        rerender();
      },
      clearHistory: () => {
        store.past = [];
        store.future = [];
        store.mergeable = null;
        rerender();
      },
      request: (action: () => void) => {
        if (isDirty()) {
          store.pending = action;
          rerender();
        } else {
          action();
        }
      },
      confirmPending: () => {
        const action = store.pending;
        store.pending = null;
        rerender();
        action?.();
      },
      cancelPending: () => {
        if (!store.pending) return;
        store.pending = null;
        rerender();
      },
    };
  }, [store]);

  const { undo, redo } = api;
  useEffect(() => {
    if (!keyboard || typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const shortcut = getHistoryShortcut(event);
      if (!shortcut) return;
      const target = event.target;
      if (target instanceof Element && target.closest(TEXT_TARGET)) return;
      if (isOverlayOpen()) return;
      event.preventDefault();
      void (shortcut === "undo" ? undo() : redo());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboard, undo, redo]);

  const { confirmPending, cancelPending } = api;
  const pending = store.pending !== null;
  const confirmProps = useMemo<DraftHistoryConfirmProps>(
    () => ({
      open: pending,
      onOpenChange: (open) => {
        if (!open) cancelPending();
      },
      onConfirm: confirmPending,
    }),
    [pending, confirmPending, cancelPending],
  );

  const lastPast = store.past[store.past.length - 1];
  const lastFuture = store.future[store.future.length - 1];
  return {
    ...api,
    draft: store.draft,
    dirty: store.draftJson !== savedJson,
    key: store.key,
    canUndo: lastPast !== undefined,
    canRedo: lastFuture !== undefined,
    undoLabel: lastPast?.label,
    redoLabel: lastFuture?.label,
    past: store.past.map((step) => step.label),
    future: store.future.map((step) => step.label),
    busy: store.busy > 0,
    pending,
    confirmProps,
  };
}
