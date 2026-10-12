import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getHistoryShortcut,
  stableStringify,
  useDraftHistory,
  type DraftHistory,
  type UseDraftHistoryOptions,
} from "./use-draft-history";

interface Branch {
  name: string;
  city: string;
  tags?: string[];
}

const nord: Branch = { name: "Filiale Nord", city: "Hamburg" };
const sued: Branch = { name: "Filiale Süd", city: "München" };

interface HookProps<T, K> {
  saved: T;
  options?: UseDraftHistoryOptions<T, K>;
}

function setup<T, K = string>(saved: T, options?: UseDraftHistoryOptions<T, K>) {
  return renderHook<DraftHistory<T, K>, HookProps<T, K>>(({ saved: value, options: opts }) => useDraftHistory(value, opts), {
    initialProps: { saved, options },
  });
}

let now = 1_000_000;
beforeEach(() => {
  now = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("stableStringify", () => {
  it("ignores the key order, keeps array order and leaves out undefined", () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
    expect(stableStringify([1, 2])).not.toBe(stableStringify([2, 1]));
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
    expect(stableStringify({ a: null })).not.toBe(stableStringify({}));
    expect(stableStringify(undefined)).toBe("undefined");
    expect(stableStringify(new Date(0))).toBe(JSON.stringify(new Date(0)));
  });
});

describe("getHistoryShortcut", () => {
  const key = (init: Partial<KeyboardEvent>) =>
    getHistoryShortcut({ key: "", code: "", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...init });

  it("maps Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z (also ⌘)", () => {
    expect(key({ key: "z", ctrlKey: true })).toBe("undo");
    expect(key({ key: "z", metaKey: true })).toBe("undo");
    expect(key({ key: "y", ctrlKey: true })).toBe("redo");
    expect(key({ key: "Z", ctrlKey: true, shiftKey: true })).toBe("redo");
    expect(key({ key: "z" })).toBeNull();
    expect(key({ key: "s", ctrlKey: true })).toBeNull();
    expect(key({ key: "Y", ctrlKey: true, shiftKey: true })).toBeNull();
  });

  it("ignores AltGr (Ctrl+Alt) and follows the layout through `key`, not `code`", () => {
    expect(key({ key: "z", ctrlKey: true, altKey: true })).toBeNull();
    // QWERTZ: the Z key sits where QWERTY has Y.
    expect(key({ key: "z", code: "KeyY", ctrlKey: true })).toBe("undo");
  });

  it("understands control characters (FiveM CEF) and an unidentified key", () => {
    expect(key({ key: "\u001a", ctrlKey: true })).toBe("undo");
    expect(key({ key: "\u0019", ctrlKey: true })).toBe("redo");
    expect(key({ key: "\u001a", ctrlKey: true, shiftKey: true })).toBe("redo");
    expect(key({ key: "Unidentified", code: "KeyZ", ctrlKey: true })).toBe("undo");
  });
});

describe("useDraftHistory", () => {
  it("starts with a copy of the saved value, clean and without steps", () => {
    const { result } = setup(nord);
    expect(result.current.draft).toEqual(nord);
    expect(result.current.draft).not.toBe(nord);
    expect(result.current.dirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoLabel).toBeUndefined();
  });

  it("undoes and redoes labelled steps and tracks dirty", async () => {
    const { result } = setup(nord);
    act(() => result.current.setDraft({ ...nord, name: "Nord" }, "Name changed"));
    expect(result.current.draft.name).toBe("Nord");
    expect(result.current.dirty).toBe(true);
    expect(result.current.undoLabel).toBe("Name changed");

    await act(() => result.current.undo());
    expect(result.current.draft).toEqual(nord);
    expect(result.current.dirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.redoLabel).toBe("Name changed");

    await act(() => result.current.redo());
    expect(result.current.draft.name).toBe("Nord");
    expect(result.current.undoLabel).toBe("Name changed");
    expect(result.current.canRedo).toBe(false);
  });

  it("uses the default label and takes custom labels", () => {
    const { result, rerender } = setup(nord);
    act(() => result.current.setDraft({ ...nord, city: "Kiel" }));
    expect(result.current.undoLabel).toBe("Edit");
    rerender({ saved: nord, options: { labels: { edit: "Bearbeitet", discard: "Verworfen" } } });
    now += 1000;
    act(() => result.current.setDraft((draft) => ({ ...draft, city: "Lübeck" })));
    expect(result.current.undoLabel).toBe("Bearbeitet");
    act(() => result.current.discard());
    expect(result.current.undoLabel).toBe("Verworfen");
  });

  it("dirty uses stable JSON: a different key order is not a change", () => {
    const { result } = setup(nord);
    act(() => result.current.setDraft({ city: "Hamburg", name: "Filiale Nord" }));
    expect(result.current.dirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
  });

  it("accepts its own serialize", () => {
    const { result } = setup(nord, { serialize: (value) => value.name.toLowerCase() });
    act(() => result.current.setDraft({ ...nord, name: "FILIALE NORD", city: "Bremen" }));
    expect(result.current.dirty).toBe(false);
  });

  it("merges typing in one group within mergeMs into one step", async () => {
    const { result } = setup(nord);
    act(() => result.current.setDraft({ ...nord, name: "F" }, "Name"));
    now += 300;
    act(() => result.current.setDraft({ ...nord, name: "Fi" }, "Name"));
    now += 300; // 600 ms after the first, but only 300 after the last: the window slides
    act(() => result.current.setDraft({ ...nord, name: "Fil" }, "Name"));
    expect(result.current.past).toEqual(["Name"]);

    now += 500;
    act(() => result.current.setDraft({ ...nord, name: "Fili" }, "Name"));
    expect(result.current.past).toEqual(["Name", "Name"]);

    await act(() => result.current.undo());
    expect(result.current.draft.name).toBe("Fil");
    await act(() => result.current.undo());
    expect(result.current.draft.name).toBe("Filiale Nord");
  });

  it("keeps groups, merge: false and custom mergeMs apart", () => {
    const { result } = setup(nord, { mergeMs: 1000 });
    act(() => result.current.setDraft((d) => ({ ...d, name: "A" }), "Name"));
    now += 100;
    act(() => result.current.setDraft((d) => ({ ...d, city: "B" }), "City"));
    now += 100;
    act(() => result.current.setDraft((d) => ({ ...d, city: "C" }), { label: "City", merge: false }));
    now += 900;
    act(() => result.current.setDraft((d) => ({ ...d, city: "D" }), "City"));
    expect(result.current.past).toEqual(["Name", "City", "City"]);
    now += 100;
    act(() => result.current.setDraft((d) => ({ ...d, tags: ["x"] }), { label: "Tag added", group: "City" }));
    expect(result.current.past).toEqual(["Name", "City", "City"]);
  });

  it("never merges into a step after undo, and a new change clears redo", async () => {
    const { result } = setup(nord);
    act(() => result.current.setDraft({ ...nord, name: "A" }, "Name"));
    act(() => result.current.setDraft({ ...nord, name: "AB" }, { label: "Name", merge: false }));
    await act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.setDraft({ ...nord, name: "AC" }, "Name"));
    expect(result.current.canRedo).toBe(false);
    expect(result.current.past).toEqual(["Name", "Name"]);
  });

  it("updater functions see the latest draft, even twice in one event", () => {
    const { result } = setup({ count: 0 });
    act(() => {
      result.current.setDraft((d) => ({ count: d.count + 1 }));
      result.current.setDraft((d) => ({ count: d.count + 1 }), { merge: false });
    });
    expect(result.current.draft.count).toBe(2);
    expect(result.current.past).toHaveLength(2);
  });

  it("drops the oldest steps beyond maxSteps", () => {
    const { result } = setup({ count: 0 }, { maxSteps: 3 });
    for (let i = 1; i <= 5; i++) act(() => result.current.setDraft({ count: i }, { label: `#${i}`, merge: false }));
    expect(result.current.past).toEqual(["#3", "#4", "#5"]);
  });

  it("a clean draft follows a new saved value, a dirty one keeps the user's changes", () => {
    const { result, rerender } = setup(nord);
    rerender({ saved: { ...nord, city: "Bremen" } });
    expect(result.current.draft.city).toBe("Bremen");
    expect(result.current.dirty).toBe(false);

    act(() => result.current.setDraft((d) => ({ ...d, name: "Mein Name" })));
    rerender({ saved: { ...nord, city: "Kiel" } });
    expect(result.current.draft).toEqual({ ...nord, city: "Bremen", name: "Mein Name" });
    expect(result.current.dirty).toBe(true);
  });

  it("reset() loads the saved value of the next render, keeping the steps", () => {
    const { result, rerender } = setup(nord);
    act(() => result.current.setDraft({ ...nord, name: " Nord " }, "Name"));
    // The server trims the name on save.
    act(() => result.current.reset());
    rerender({ saved: { ...nord, name: "Nord" } });
    expect(result.current.draft.name).toBe("Nord");
    expect(result.current.dirty).toBe(false);
    expect(result.current.past).toEqual(["Name"]);
    act(() => result.current.clearHistory());
    expect(result.current.canUndo).toBe(false);
  });

  it("discard() is an undoable step back to saved", async () => {
    const { result } = setup(nord);
    act(() => result.current.setDraft({ ...nord, city: "Kiel" }, "City"));
    act(() => result.current.discard());
    expect(result.current.draft).toEqual(nord);
    expect(result.current.dirty).toBe(false);
    await act(() => result.current.undo());
    expect(result.current.draft.city).toBe("Kiel");
  });

  describe("entries (key)", () => {
    const saved: Record<string, Branch> = { nord, sued };

    function useEditor(onKeyChange: (key: string) => void, selected: string) {
      return useDraftHistory(saved[selected] ?? null, { key: selected, onKeyChange });
    }

    it("loads the saved value when the key changes and keeps the history", () => {
      const { result, rerender } = renderHook(({ selected }) => useEditor(() => {}, selected), {
        initialProps: { selected: "nord" },
      });
      act(() => result.current.setDraft({ ...nord, city: "Kiel" }, "City"));
      rerender({ selected: "sued" });
      expect(result.current.draft).toEqual(sued);
      expect(result.current.key).toBe("sued");
      expect(result.current.dirty).toBe(false);
      expect(result.current.past).toEqual(["City"]);
    });

    it("undo goes back to the entry of the step and calls onKeyChange", async () => {
      let selected = "nord";
      const onKeyChange = vi.fn((key: string) => {
        selected = key;
      });
      const { result, rerender } = renderHook(() => useEditor(onKeyChange, selected));
      act(() => result.current.setDraft({ ...nord, city: "Kiel" }, "City"));
      selected = "sued";
      rerender();
      expect(result.current.draft).toEqual(sued);

      await act(() => result.current.undo());
      expect(onKeyChange).toHaveBeenCalledWith("nord");
      rerender();
      // Back in Nord, before the change: the step brought the old draft back.
      expect(result.current.key).toBe("nord");
      expect(result.current.draft).toEqual(nord);
      expect(result.current.dirty).toBe(false);

      await act(() => result.current.redo());
      rerender();
      expect(result.current.draft.city).toBe("Kiel");
      expect(result.current.dirty).toBe(true);
      expect(result.current.key).toBe("nord");

      // Redo from another entry goes to the step's entry as well.
      selected = "sued";
      rerender();
      await act(() => result.current.undo());
      rerender();
      selected = "sued";
      rerender();
      onKeyChange.mockClear();
      await act(() => result.current.redo());
      expect(onKeyChange).toHaveBeenCalledWith("nord");
      rerender();
      expect(result.current.draft.city).toBe("Kiel");
    });

    it("load(value, key) shows a new entry without a reset or a step", () => {
      let selected = "nord";
      const { result, rerender } = renderHook(() => useEditor(() => {}, selected));
      act(() => {
        selected = "new";
        result.current.load({ name: "", city: "" }, "new");
      });
      rerender();
      expect(result.current.key).toBe("new");
      expect(result.current.draft).toEqual({ name: "", city: "" });
      expect(result.current.dirty).toBe(true);
      expect(result.current.canUndo).toBe(false);
    });
  });

  describe("request", () => {
    it("runs at once without unsaved changes", () => {
      const { result } = setup(nord);
      const action = vi.fn();
      act(() => result.current.request(action));
      expect(action).toHaveBeenCalledTimes(1);
      expect(result.current.pending).toBe(false);
    });

    it("waits for the confirmation with unsaved changes", () => {
      const { result } = setup(nord);
      const action = vi.fn();
      act(() => result.current.setDraft({ ...nord, city: "Kiel" }));
      act(() => result.current.request(action));
      expect(action).not.toHaveBeenCalled();
      expect(result.current.pending).toBe(true);
      expect(result.current.confirmProps.open).toBe(true);

      act(() => result.current.confirmProps.onConfirm());
      expect(action).toHaveBeenCalledTimes(1);
      expect(result.current.pending).toBe(false);
    });

    it("drops the request on cancel", () => {
      const { result } = setup(nord);
      const action = vi.fn();
      act(() => result.current.setDraft({ ...nord, city: "Kiel" }));
      act(() => result.current.request(action));
      act(() => result.current.confirmProps.onOpenChange(false));
      expect(result.current.pending).toBe(false);
      act(() => result.current.confirmPending());
      expect(action).not.toHaveBeenCalled();
    });
  });

  describe("actions and busy", () => {
    it("record() steps run their own undo / redo", async () => {
      const { result } = setup(nord);
      const action = { undo: vi.fn(() => true), redo: vi.fn() };
      act(() => result.current.record("Saved", action));
      expect(result.current.undoLabel).toBe("Saved");
      await act(() => result.current.undo());
      expect(action.undo).toHaveBeenCalledTimes(1);
      expect(result.current.redoLabel).toBe("Saved");
      await act(() => result.current.redo());
      expect(action.redo).toHaveBeenCalledTimes(1);
      expect(result.current.undoLabel).toBe("Saved");
    });

    it("a failing action stays where it was", async () => {
      const { result } = setup(nord);
      act(() => result.current.record("Deleted", { undo: async () => false, redo: () => {} }));
      let ok = true;
      await act(async () => {
        ok = await result.current.undo();
      });
      expect(ok).toBe(false);
      expect(result.current.undoLabel).toBe("Deleted");
      expect(result.current.canRedo).toBe(false);

      act(() =>
        result.current.record("Thrown", {
          undo: () => {
            throw new Error("server down");
          },
          redo: () => {},
        }),
      );
      await act(() => result.current.undo());
      expect(result.current.undoLabel).toBe("Thrown");
    });

    it("is busy while an action runs and ignores undo meanwhile", async () => {
      const { result } = setup(nord);
      let finish: (value: boolean) => void = () => {};
      act(() =>
        result.current.record("Saved", {
          undo: () => new Promise<boolean>((resolve) => (finish = resolve)),
          redo: () => {},
        }),
      );
      act(() => result.current.setDraft({ ...nord, city: "Kiel" }, "City"));
      // undo of the draft step first
      await act(() => result.current.undo());
      let undoing: Promise<boolean> = Promise.resolve(false);
      act(() => {
        undoing = result.current.undo();
      });
      expect(result.current.busy).toBe(true);
      expect(await result.current.redo()).toBe(false);
      await act(async () => {
        finish(true);
        await undoing;
      });
      expect(result.current.busy).toBe(false);
      expect(result.current.future).toEqual(["City", "Saved"]);
    });

    it("run() keeps busy for the cooldown", async () => {
      vi.restoreAllMocks();
      vi.useFakeTimers();
      const { result } = setup(nord, { cooldown: 1000 });
      let value = "";
      await act(async () => {
        value = await result.current.run(async () => "ok");
      });
      expect(value).toBe("ok");
      expect(result.current.busy).toBe(true);
      await act(async () => {
        vi.advanceTimersByTime(999);
      });
      expect(result.current.busy).toBe(true);
      await act(async () => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.busy).toBe(false);

      // A per-call cooldown wins.
      await act(async () => {
        await result.current.run(() => 1, { cooldown: 0 });
      });
      expect(result.current.busy).toBe(false);
    });

    it("clears the cooldown timer on unmount", async () => {
      vi.restoreAllMocks();
      vi.useFakeTimers();
      const { result, unmount } = setup(nord, { cooldown: 1000 });
      await act(async () => {
        await result.current.run(() => null);
      });
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("keyboard", () => {
    function Editor({ keyboard }: { keyboard?: boolean }) {
      const history = useDraftHistory({ name: "Nord" }, { keyboard });
      return (
        <div>
          <input
            aria-label="Name"
            value={history.draft.name}
            onChange={(event) => history.setDraft({ name: event.target.value })}
          />
          <input type="checkbox" aria-label="Aktiv" />
          <button type="button" onClick={() => history.setDraft({ name: "Süd" }, "Picked")}>
            Süd
          </button>
          <output data-testid="name">{history.draft.name}</output>
        </div>
      );
    }

    it("Ctrl+Z undoes and Ctrl+Y / Ctrl+Shift+Z redo outside text fields", () => {
      render(<Editor />);
      fireEvent.click(screen.getByRole("button", { name: "Süd" }));
      expect(screen.getByTestId("name")).toHaveTextContent("Süd");

      fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
      expect(screen.getByTestId("name")).toHaveTextContent("Nord");
      fireEvent.keyDown(document.body, { key: "y", ctrlKey: true });
      expect(screen.getByTestId("name")).toHaveTextContent("Süd");
      fireEvent.keyDown(screen.getByRole("button", { name: "Süd" }), { key: "z", ctrlKey: true });
      expect(screen.getByTestId("name")).toHaveTextContent("Nord");
      fireEvent.keyDown(screen.getByRole("checkbox"), { key: "Z", ctrlKey: true, shiftKey: true });
      expect(screen.getByTestId("name")).toHaveTextContent("Süd");
    });

    it("leaves Ctrl+Z to a focused text field", () => {
      render(<Editor />);
      fireEvent.click(screen.getByRole("button", { name: "Süd" }));
      const event = fireEvent.keyDown(screen.getByRole("textbox"), { key: "z", ctrlKey: true });
      expect(event).toBe(true); // not prevented
      expect(screen.getByTestId("name")).toHaveTextContent("Süd");
    });

    it("prevents the default and skips prevented events and open overlays", () => {
      render(<Editor />);
      fireEvent.click(screen.getByRole("button", { name: "Süd" }));
      const prevented = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true });
      prevented.preventDefault();
      act(() => {
        document.body.dispatchEvent(prevented);
      });
      expect(screen.getByTestId("name")).toHaveTextContent("Süd");

      const dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("data-open", "");
      document.body.append(dialog);
      fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
      expect(screen.getByTestId("name")).toHaveTextContent("Süd");
      dialog.remove();

      expect(fireEvent.keyDown(document.body, { key: "z", ctrlKey: true })).toBe(false);
      expect(screen.getByTestId("name")).toHaveTextContent("Nord");
    });

    it("keyboard: false turns the shortcuts off", () => {
      render(<Editor keyboard={false} />);
      fireEvent.click(screen.getByRole("button", { name: "Süd" }));
      fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
      expect(screen.getByTestId("name")).toHaveTextContent("Süd");
    });
  });
});
