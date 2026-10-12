import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  EditorCloseButton,
  EditorContent,
  EditorDeleteButton,
  EditorDetail,
  EditorDiscardButton,
  EditorFieldCounter,
  EditorHeader,
  EditorList,
  EditorListAdd,
  EditorListContent,
  EditorListGroup,
  EditorListHeader,
  EditorListItem,
  EditorListTitle,
  EditorRedoButton,
  EditorSaveButton,
  EditorSection,
  EditorTextField,
  EditorUndoButton,
  EditorWindow,
} from "./EditorWindow";
import { renderToStringAndHydrate } from "../../test-utils/ssr";
import { useDraftHistory } from "./use-draft-history";

describe("EditorWindow layout", () => {
  it("renders window, list and detail with their slots", () => {
    render(
      <EditorWindow data-testid="window" className="h-full w-full">
        <EditorList data-testid="list">
          <EditorListHeader>
            <EditorListTitle>Filialen</EditorListTitle>
            <EditorListAdd>Neu</EditorListAdd>
          </EditorListHeader>
          <EditorListContent data-testid="content">
            <EditorListGroup>
              <EditorListItem label="Einstellungen" icon={<svg data-testid="icon" />} />
            </EditorListGroup>
            <EditorListGroup label="Filialen">
              <EditorListItem label="Nord" summary="Hamburg" selected />
            </EditorListGroup>
          </EditorListContent>
        </EditorList>
        <EditorDetail data-testid="detail">
          <EditorHeader title="Nord" />
          <EditorContent>Formular</EditorContent>
        </EditorDetail>
      </EditorWindow>,
    );
    const win = screen.getByTestId("window");
    expect(win).toHaveAttribute("data-slot", "editor-window");
    expect(win).toHaveClass("bg-pui-shell", "rounded-pui-window", "shadow-pui-window", "h-full", "w-full");
    // The default size is replaced, not stacked.
    expect(win.className).not.toContain("h-[min(");
    expect(screen.getByTestId("list").tagName).toBe("ASIDE");
    expect(screen.getByTestId("list")).toHaveClass("w-64", "border-r", "border-pui-border");
    expect(screen.getByRole("heading", { level: 2, name: "Filialen" })).toHaveAttribute("data-slot", "editor-list-title");
    const add = screen.getByRole("button", { name: "Neu" });
    expect(add).toHaveAttribute("data-slot", "editor-list-add");
    expect(add.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByTestId("content")).toHaveAttribute("data-slot", "editor-list-content");
    expect(screen.getByRole("group", { name: "Filialen" })).toHaveAttribute("data-slot", "editor-list-group");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByTestId("detail").tagName).toBe("SECTION");
    expect(screen.getByText("Formular").closest("[data-slot=editor-content]")).toBeInTheDocument();
  });

  it("has a fixed default size that respects the viewport variable", () => {
    render(<EditorWindow data-testid="window" />);
    expect(screen.getByTestId("window")).toHaveClass(
      "h-[min(48rem,calc(var(--pui-viewport-height,100vh)-4rem))]",
      "w-[min(80rem,calc(100vw-4rem))]",
    );
  });

  it("merges className on ScrollArea parts, also the function form", () => {
    render(
      <>
        <EditorListContent data-testid="list" className={() => "list-state"} contentClassName="gap-2" />
        <EditorContent data-testid="content" className="bg-pui-card" contentClassName="py-6" />
      </>,
    );
    expect(screen.getByTestId("list")).toHaveClass("min-h-0", "flex-1", "list-state");
    expect(screen.getByTestId("content")).toHaveClass("min-h-0", "flex-1", "bg-pui-card");
    const listContent = screen.getByTestId("list").querySelector("[data-slot=scroll-area-content]");
    expect(listContent).toHaveClass("gap-2", "p-2");
    expect(listContent).not.toHaveClass("gap-1");
    const formContent = screen.getByTestId("content").querySelector("[data-slot=scroll-area-content]");
    expect(formContent).toHaveClass("py-6", "px-6");
  });
});

describe("EditorListItem", () => {
  it("is a button with label, summary and aria-current when selected", async () => {
    const onClick = vi.fn();
    render(<EditorListItem label="Filiale Nord" summary="Hamburg · 12 Produkte" selected onClick={onClick} className="extra" />);
    const row = screen.getByRole("button", { name: /Filiale Nord/ });
    expect(row).toHaveAttribute("type", "button");
    expect(row).toHaveAttribute("aria-current", "true");
    expect(row).toHaveAttribute("data-slot", "editor-list-item");
    expect(row).toHaveAttribute("data-selected");
    expect(row).toHaveClass("data-[selected]:bg-pui-accent", "extra");
    expect(within(row).getByText("Hamburg · 12 Produkte")).toHaveClass("truncate", "text-xs");
    await userEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("reserves the unsaved marker's space and names it for screen readers", () => {
    const { rerender } = render(<EditorListItem label="Nord" />);
    const row = screen.getByRole("button");
    const marker = row.querySelector("[data-slot=editor-list-item-marker]");
    expect(marker).toHaveClass("invisible", "size-2", "bg-pui-warning");
    expect(row).not.toHaveAttribute("aria-current");
    expect(row).toHaveAccessibleName("Nord");

    rerender(<EditorListItem label="Nord" dirty labels={{ unsavedChanges: "Ungespeichert" }} />);
    expect(marker).not.toHaveClass("invisible");
    expect(row).toHaveAttribute("data-dirty");
    expect(row).toHaveAccessibleName("Nord Ungespeichert");
  });

  it("dims muted entries and supports disabled", () => {
    render(<EditorListItem label="Alt" muted disabled />);
    const row = screen.getByRole("button");
    expect(row).toBeDisabled();
    expect(row).toHaveAttribute("data-muted");
    expect(within(row).getByText("Alt")).toHaveClass("text-pui-muted-foreground");
  });
});

describe("EditorHeader", () => {
  it("shows title, a reserved unsaved badge and the saved status", () => {
    const { rerender } = render(<EditorHeader title="Filiale Nord" actions={<button type="button">X</button>} />);
    expect(screen.getByRole("heading", { level: 2, name: "Filiale Nord" })).toHaveAttribute("data-slot", "editor-title");
    const badge = screen.getByText("Unsaved");
    expect(badge).toHaveClass("invisible");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("All changes saved");
    expect(status).not.toHaveClass("invisible");

    rerender(<EditorHeader title="Filiale Nord" dirty actions={<button type="button">X</button>} />);
    expect(badge).not.toHaveClass("invisible");
    // Still in its place, only hidden.
    expect(status).toHaveClass("invisible");
    expect(screen.getByRole("banner", { hidden: true })).toHaveAttribute("data-dirty");
  });

  it("shows a problem in the warning colour instead of the status", () => {
    render(<EditorHeader title="Neu" dirty problem="Braucht einen Namen" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Braucht einen Namen");
    expect(status).toHaveClass("text-pui-warning");
    expect(status).not.toHaveClass("invisible");
    expect(status).toHaveAttribute("data-problem");
  });

  it("takes a custom status, status={false} and a middle slot", () => {
    const { rerender } = render(<EditorHeader title="Log" status="Gerade synchronisiert" />);
    expect(screen.getByRole("status")).toHaveTextContent("Gerade synchronisiert");
    rerender(
      <EditorHeader title="Log" status={false}>
        <span>Aktiv</span>
      </EditorHeader>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Aktiv").parentElement).toHaveAttribute("data-slot", "editor-header-content");
  });

  it("takes its texts from EditorWindow labels, its own labels win", () => {
    render(
      <EditorWindow labels={{ unsaved: "Ungespeichert", saved: "Alles gespeichert" }}>
        <EditorHeader title="A" />
        <EditorHeader title="B" labels={{ saved: "Gesichert" }} />
      </EditorWindow>,
    );
    expect(screen.getAllByText("Ungespeichert")).toHaveLength(2);
    expect(screen.getByText("Alles gespeichert")).toBeInTheDocument();
    expect(screen.getByText("Gesichert")).toBeInTheDocument();
  });
});

describe("header buttons", () => {
  it("have English defaults and keep their space when hidden", () => {
    render(
      <>
        <EditorSaveButton icon={<svg data-testid="save-icon" />} />
        <EditorDeleteButton hidden />
        <EditorDiscardButton />
        <EditorCloseButton />
      </>,
    );
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("data-slot", "editor-save");
    expect(save).toHaveAttribute("data-variant", "default");
    expect(screen.getByTestId("save-icon")).toBeInTheDocument();
    const remove = screen.getByRole("button", { name: "Delete", hidden: true });
    expect(remove).toHaveClass("invisible");
    expect(remove).not.toHaveAttribute("hidden");
    expect(remove).toHaveAttribute("data-variant", "ghost");
    expect(screen.getByRole("button", { name: "Discard" })).toHaveAttribute("data-slot", "editor-discard");
    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toHaveAttribute("data-size", "icon-sm");
    expect(close.querySelector("svg")).toBeInTheDocument();
  });

  it("save keeps its width while loading and takes children over the label", () => {
    render(<EditorSaveButton loading>Speichern</EditorSaveButton>);
    const save = screen.getByRole("button", { name: "Speichern" });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute("aria-busy", "true");
  });

  it("undo / redo without history: disabled without a step, tooltip names the step and the keys", async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    const { rerender } = render(
      <>
        <EditorUndoButton />
        <EditorRedoButton />
      </>,
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toHaveAttribute("data-size", "icon-sm");

    rerender(
      <EditorWindow labels={{ undoStep: (step) => `Rückgängig: ${step}`, undoKeys: ["Strg", "Z"] }}>
        <EditorUndoButton step="Name geändert" onClick={onUndo} />
      </EditorWindow>,
    );
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toBeEnabled();
    await user.hover(undo);
    const tip = await screen.findByText("Rückgängig: Name geändert");
    const keys = tip.parentElement!.querySelectorAll("kbd[data-slot=kbd]");
    expect([...keys].map((key) => key.textContent)).toEqual(["Strg", "Z"]);
    await user.click(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("undo / redo follow a history object", async () => {
    const user = userEvent.setup();
    function Example() {
      const history = useDraftHistory({ name: "Nord" });
      return (
        <>
          <button type="button" onClick={() => history.setDraft({ name: "Süd" }, "Name")}>
            Ändern
          </button>
          <EditorUndoButton history={history} />
          <EditorRedoButton history={history} iconOnly={false} />
          <output>{history.draft.name}</output>
        </>
      );
    }
    render(<Example />);
    const undo = screen.getByRole("button", { name: "Undo" });
    const redo = screen.getByRole("button", { name: "Redo" });
    expect(undo).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Ändern" }));
    expect(undo).toBeEnabled();
    await user.click(undo);
    expect(screen.getByRole("status")).toHaveTextContent("Nord");
    expect(redo).toBeEnabled();
    await user.click(redo);
    expect(screen.getByRole("status")).toHaveTextContent("Süd");
  });
});

describe("EditorSection", () => {
  it("is a labelled section with description and action", () => {
    render(
      <EditorSection title="Öffnungszeiten" description="Wann die Filiale offen hat" action={<button type="button">Hinzufügen</button>} className="gap-4">
        <p>Inhalt</p>
      </EditorSection>,
    );
    const section = screen.getByRole("region", { name: "Öffnungszeiten" });
    expect(section).toHaveAttribute("data-slot", "editor-section");
    expect(section).toHaveClass("rounded-pui", "border-pui-border", "gap-4");
    expect(within(section).getByText("Wann die Filiale offen hat")).toHaveClass("text-xs");
    expect(within(section).getByRole("button", { name: "Hinzufügen" })).toBeInTheDocument();
  });

  it("renders no header row without title, description or action", () => {
    render(<EditorSection data-testid="section">Nur Inhalt</EditorSection>);
    expect(screen.getByTestId("section").querySelector("[data-slot=editor-section-header]")).toBeNull();
  });
});

describe("EditorTextField and EditorFieldCounter", () => {
  function Controlled(props: { maxLength?: number; multiline?: boolean; error?: string }) {
    const [value, setValue] = useState("Nord");
    return <EditorTextField label="Name" value={value} onValueChange={setValue} description="Steht auf dem Schild" {...props} />;
  }

  it("labels the input and counts live up to maxLength", async () => {
    const user = userEvent.setup();
    render(<Controlled maxLength={6} />);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("maxlength", "6");
    expect(input).toHaveAttribute("autocomplete", "off");
    expect(input).toHaveAttribute("data-size", "sm");
    const counter = document.querySelector("[data-slot=editor-field-counter]")!;
    expect(counter).toHaveTextContent("4/6");
    expect(input).toHaveAccessibleDescription(expect.stringContaining("4 of 6 characters"));
    expect(input).toHaveAccessibleDescription(expect.stringContaining("Steht auf dem Schild"));

    await user.type(input, "en");
    expect(input).toHaveValue("Norden");
    expect(counter).toHaveTextContent("6/6");
    expect(counter).toHaveAttribute("data-state", "full");
    expect(counter).toHaveClass("text-pui-warning");
  });

  it("counts emoji as one character and marks a too long value", () => {
    render(<EditorFieldCounter value={"Café 🍰🍰"} max={6} labels={{ characterCount: (n, max) => `${n} von ${max} Zeichen` }} />);
    const counter = document.querySelector("[data-slot=editor-field-counter]")!;
    expect(counter).toHaveTextContent("7/6");
    expect(counter).toHaveAttribute("data-state", "over");
    expect(counter).toHaveClass("text-pui-negative");
    expect(screen.getByText("7 von 6 Zeichen")).toHaveClass("sr-only");
  });

  it("has no counter without maxLength, renders a textarea and an error", () => {
    render(<Controlled multiline error="Zu kurz" />);
    const textarea = screen.getByRole("textbox", { name: "Name" });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(document.querySelector("[data-slot=editor-field-counter]")).toBeNull();
    expect(screen.getByText("Zu kurz")).toHaveAttribute("data-slot", "field-error");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    fireEvent.change(textarea, { target: { value: "Nordstadt" } });
    expect(textarea).toHaveValue("Nordstadt");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// A whole editor, the way an app builds it
// ---------------------------------------------------------------------------------------------------------------------

interface Branch {
  id: number;
  name: string;
  city: string;
}

function BranchEditor({ onClose = () => {} }: { onClose?: () => void }) {
  const [branches, setBranches] = useState<Branch[]>([
    { id: 1, name: "Nord", city: "Hamburg" },
    { id: 2, name: "Süd", city: "München" },
  ]);
  const [selected, setSelected] = useState<number | "new" | "log">(1);
  const savedBranch = typeof selected === "number" ? (branches.find((b) => b.id === selected) ?? null) : null;
  const history = useDraftHistory<Branch | null, number | "new" | "log">(savedBranch, {
    key: selected,
    onKeyChange: setSelected,
  });
  const draft = history.draft;
  const isNew = selected === "new";
  const problem = draft && draft.name.trim() === "" ? "Braucht einen Namen" : undefined;

  const save = async () => {
    if (!draft) return;
    const stored = { ...draft, id: draft.id || 3, name: draft.name.trim() };
    await history.run(() => {
      setBranches((list) => [...list.filter((b) => b.id !== stored.id), stored].sort((a, b) => a.id - b.id));
      setSelected(stored.id);
      history.reset();
    });
  };

  return (
    <EditorWindow className="h-full w-full">
      <EditorList>
        <EditorListHeader>
          <EditorListTitle>Filialen</EditorListTitle>
          <EditorListAdd
            onClick={() =>
              history.request(() => {
                setSelected("new");
                history.load({ id: 0, name: "", city: "" }, "new");
              })
            }
          >
            Neu
          </EditorListAdd>
        </EditorListHeader>
        <EditorListContent>
          <EditorListGroup>
            <EditorListItem label="Protokoll" selected={selected === "log"} onClick={() => history.request(() => setSelected("log"))} />
          </EditorListGroup>
          <EditorListGroup label="Filialen">
            {isNew && <EditorListItem label={draft?.name || "Ohne Namen"} summary="Neu" selected dirty />}
            {branches.map((branch) => (
              <EditorListItem
                key={branch.id}
                label={branch.name}
                summary={branch.city}
                selected={selected === branch.id}
                dirty={selected === branch.id && history.dirty}
                onClick={() => selected !== branch.id && history.request(() => setSelected(branch.id))}
              />
            ))}
          </EditorListGroup>
        </EditorListContent>
      </EditorList>
      <EditorDetail>
        <EditorHeader
          title={draft ? draft.name || "Ohne Namen" : "Protokoll"}
          dirty={history.dirty}
          problem={problem}
          status={draft ? undefined : false}
          actions={
            <>
              <EditorUndoButton history={history} />
              <EditorRedoButton history={history} />
              <EditorDeleteButton hidden={!savedBranch} />
              <EditorSaveButton hidden={!draft} disabled={!history.dirty || !!problem} loading={history.busy} onClick={save} />
              <EditorCloseButton onClick={() => history.request(onClose)} />
            </>
          }
        />
        <EditorContent key={String(selected)}>
          {draft && (
            <EditorSection title="Allgemein">
              <EditorTextField
                label="Name"
                maxLength={20}
                value={draft.name}
                onValueChange={(name) => history.setDraft({ ...draft, name }, "Name geändert")}
              />
            </EditorSection>
          )}
        </EditorContent>
      </EditorDetail>
      <ConfirmDialog
        {...history.confirmProps}
        title="Änderungen verwerfen?"
        confirmLabel="Verwerfen"
        cancelLabel="Abbrechen"
        destructive
      />
    </EditorWindow>
  );
}

describe("a whole editor", () => {
  it("edits, marks unsaved, saves and stays put", async () => {
    const user = userEvent.setup();
    render(<BranchEditor />);
    const header = screen.getByRole("heading", { level: 2, name: "Nord" }).closest("header")!;
    const badge = within(header).getByText("Unsaved");
    expect(badge).toHaveClass("invisible");
    const save = within(header).getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "stadt");
    expect(screen.getByRole("heading", { level: 2, name: "Nordstadt" })).toBeInTheDocument();
    expect(badge).not.toHaveClass("invisible");
    const row = screen.getByRole("button", { name: /Nord.*Hamburg/ });
    expect(row).toHaveAttribute("data-dirty");
    // Typing is one step.
    expect(within(header).getByRole("button", { name: "Undo" })).toBeEnabled();

    await user.click(save);
    await waitFor(() => expect(badge).toHaveClass("invisible"));
    expect(screen.getByRole("button", { name: /Nordstadt.*Hamburg/ })).not.toHaveAttribute("data-dirty");
    expect(within(header).getByRole("status")).toHaveTextContent("All changes saved");
  });

  it("asks before switching away from unsaved changes", async () => {
    const user = userEvent.setup();
    render(<BranchEditor />);
    await user.type(screen.getByRole("textbox", { name: "Name" }), "x");
    await user.click(screen.getByRole("button", { name: /Süd/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName("Änderungen verwerfen?");

    await user.click(within(dialog).getByRole("button", { name: "Abbrechen" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Nordx");

    await user.click(screen.getByRole("button", { name: /Süd/ }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Verwerfen" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Süd"));
    expect(screen.getByRole("button", { name: /Süd/ })).toHaveAttribute("aria-current", "true");
  });

  it("Ctrl+Z goes back into the entry the change was made in", async () => {
    const user = userEvent.setup();
    render(<BranchEditor />);
    await user.type(screen.getByRole("textbox", { name: "Name" }), "x");
    await user.click(screen.getByRole("button", { name: /Süd/ }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Verwerfen" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Süd");

    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
    fireEvent.keyDown(document.body, { key: "z", ctrlKey: true });
    await waitFor(() => expect(screen.getByRole("button", { name: /Nord/ })).toHaveAttribute("aria-current", "true"));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Nord");
    fireEvent.keyDown(document.body, { key: "y", ctrlKey: true });
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Nordx");
  });

  it("creates a new entry with a problem, a hidden delete button and a fixed log row", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BranchEditor onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Neu" }));
    expect(screen.getByRole("button", { name: /Ohne Namen.*Neu/ })).toHaveAttribute("aria-current", "true");
    const header = screen.getByRole("heading", { level: 2, name: "Ohne Namen" }).closest("header")!;
    expect(within(header).getByRole("status")).toHaveTextContent("Braucht einen Namen");
    expect(within(header).getByRole("button", { name: "Delete", hidden: true })).toHaveClass("invisible");
    expect(within(header).getByRole("button", { name: "Save" })).toBeDisabled();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "West");
    await user.click(within(header).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /West/ })).toHaveAttribute("aria-current", "true"));
    expect(screen.getByRole("heading", { level: 2, name: "West" }).closest("header")).not.toHaveAttribute("data-dirty");

    await user.click(screen.getByRole("button", { name: "Protokoll" }));
    expect(screen.getByRole("heading", { level: 2, name: "Protokoll" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("All changes saved")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("SSR", () => {
  it("renders on the server and hydrates without errors", async () => {
    const result = await renderToStringAndHydrate(<BranchEditor />);
    expect(result.html).toContain('data-slot="editor-window"');
    expect(result.html).toContain('data-slot="editor-field-counter"');
    expect(result.errors).toEqual([]);
    result.unmount();
  });
});
