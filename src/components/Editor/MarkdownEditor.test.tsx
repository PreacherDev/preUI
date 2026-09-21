import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { CodeEditorHandle } from "../Code/CodeEditor";
import { MarkdownEditor } from "./MarkdownEditor";

// CodeMirror measures text via ranges; jsdom doesn't implement layout.
beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) } as DOMRect;
  const rectList = Object.assign([], { item: () => null }) as unknown as DOMRectList;
  if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = () => rect;
  Range.prototype.getClientRects = () => rectList;
  if (!Element.prototype.getClientRects) Element.prototype.getClientRects = () => rectList;
});

const content = (container: HTMLElement) => container.querySelector(".cm-content") as HTMLElement;

function select(ref: React.RefObject<CodeEditorHandle | null>, anchor: number, head: number) {
  act(() => {
    ref.current!.view!.dispatch({ selection: { anchor, head } });
  });
}

describe("MarkdownEditor", () => {
  it("renders a framed Markdown CodeEditor without its own frame, no line numbers by default", () => {
    const { container } = render(<MarkdownEditor defaultValue="# Hallo" className="extra" />);
    const frame = container.querySelector('[data-slot="markdown-editor"]')!;
    expect(frame).toHaveClass("extra", "rounded-pui-md", "border-pui-input", "focus-within:border-pui-ring");
    expect(frame).toHaveAttribute("data-layout", "tabs");
    const inner = container.querySelector('[data-slot="code-editor"]')!;
    expect(inner).toHaveClass("border-0", "rounded-none", "bg-transparent");
    expect(container.querySelector(".cm-lineNumbers")).toBeNull();
    expect(container.querySelector(".cm-lineWrapping")).toBeInTheDocument();
    expect(content(container)).toHaveTextContent("# Hallo");
    expect(content(container)).toHaveAttribute("aria-label", "Markdown");
  });

  it("typing updates the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<MarkdownEditor defaultValue="" onValueChange={onValueChange} />);
    await user.click(content(container));
    await user.type(content(container), "Hallo");
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith("Hallo"));
  });

  it("controlled: typing isn't lost to late echoes, outside changes are applied without emitting", async () => {
    const user = userEvent.setup();
    const ref = createRef<CodeEditorHandle>();
    const onValueChange = vi.fn();
    function Controlled({ external }: { external?: string }) {
      const [value, setValue] = useState("");
      return (
        <>
          <button type="button" onClick={() => setValue(external ?? "")}>
            reset
          </button>
          <MarkdownEditor
            ref={ref}
            value={value}
            onValueChange={(next) => {
              setValue(next);
              onValueChange(next);
            }}
          />
        </>
      );
    }
    const { container } = render(<Controlled external="# Neu" />);
    await user.click(content(container));
    await user.type(content(container), "Hallo");
    expect(onValueChange.mock.calls.map((call) => call[0])).toEqual(["H", "Ha", "Hal", "Hall", "Hallo"]);
    onValueChange.mockClear();
    await user.click(screen.getByRole("button", { name: "reset" }));
    expect(ref.current!.view!.state.doc.toString()).toBe("# Neu");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("switches to the preview tab and shows the rendered Markdown", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("## Titel\n\nEin **fetter** Satz");
      return <MarkdownEditor value={value} onValueChange={setValue} labels={{ write: "Schreiben", preview: "Vorschau" }} />;
    }
    const { container } = render(<Controlled />);
    expect(screen.getByRole("tab", { name: "Schreiben" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("toolbar")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Vorschau" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Titel" })).toBeInTheDocument();
    const preview = container.querySelector('[data-slot="markdown-editor-preview"]') as HTMLElement;
    expect(preview.querySelector("strong")).toHaveTextContent("fetter");
    // The toolbar only belongs to the write tab; the editor stays mounted (keeps undo history).
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(container.querySelector(".cm-editor")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Schreiben" }));
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("shows a placeholder text in an empty preview", async () => {
    render(<MarkdownEditor defaultValue="" defaultTab="preview" labels={{ emptyPreview: "Nichts da" }} />);
    expect(screen.getByText("Nichts da")).toBeInTheDocument();
  });

  it("toolbar bold wraps the selection and toggles it off again", async () => {
    const user = userEvent.setup();
    const ref = createRef<CodeEditorHandle>();
    const onValueChange = vi.fn();
    render(<MarkdownEditor ref={ref} defaultValue="ein Wort hier" onValueChange={onValueChange} />);
    select(ref, 4, 8);
    await user.click(screen.getByRole("button", { name: "Bold" }));
    expect(ref.current!.view!.state.doc.toString()).toBe("ein **Wort** hier");
    expect(onValueChange).toHaveBeenLastCalledWith("ein **Wort** hier");
    const { from, to } = ref.current!.view!.state.selection.main;
    expect(ref.current!.view!.state.sliceDoc(from, to)).toBe("Wort");

    await user.click(screen.getByRole("button", { name: "Bold" }));
    expect(ref.current!.view!.state.doc.toString()).toBe("ein Wort hier");
  });

  it("other toolbar actions insert Markdown syntax", async () => {
    const user = userEvent.setup();
    const ref = createRef<CodeEditorHandle>();
    render(<MarkdownEditor ref={ref} defaultValue={"eins\nzwei"} />);
    const doc = () => ref.current!.view!.state.doc.toString();

    select(ref, 0, 9);
    await user.click(screen.getByRole("button", { name: "Numbered list" }));
    expect(doc()).toBe("1. eins\n2. zwei");
    await user.click(screen.getByRole("button", { name: "Bulleted list" }));
    expect(doc()).toBe("- eins\n- zwei");
    await user.click(screen.getByRole("button", { name: "Bulleted list" }));
    expect(doc()).toBe("eins\nzwei");

    select(ref, 0, 0);
    await user.click(screen.getByRole("button", { name: "Heading" }));
    expect(doc()).toBe("# eins\nzwei");
    await user.click(screen.getByRole("button", { name: "Quote" }));
    expect(doc()).toBe("> # eins\nzwei");

    select(ref, 9, 13);
    await user.click(screen.getByRole("button", { name: "Link" }));
    expect(doc()).toBe("> # eins\n[zwei]()");
    expect(ref.current!.view!.state.selection.main.head).toBe(16);

    act(() => ref.current!.view!.dispatch({ changes: { from: 0, to: doc().length, insert: "x" }, selection: { anchor: 0, head: 1 } }));
    await user.click(screen.getByRole("button", { name: "Code block" }));
    expect(doc()).toBe("```\nx\n```");
    select(ref, 4, 5);
    await user.click(screen.getByRole("button", { name: "Inline code" }));
    await user.click(screen.getByRole("button", { name: "Strikethrough" }));
    await user.click(screen.getByRole("button", { name: "Italic" }));
    // Each action wraps the (still selected) inner text.
    expect(doc()).toBe("```\n`~~_x_~~`\n```");
  });

  it("formatting shortcuts work in the editor", () => {
    const ref = createRef<CodeEditorHandle>();
    const { container } = render(<MarkdownEditor ref={ref} defaultValue="Wort" />);
    select(ref, 0, 4);
    act(() => {
      content(container).dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }));
    });
    expect(ref.current!.view!.state.doc.toString()).toBe("**Wort**");
  });

  it("split layout renders editor and preview side by side and updates the preview", async () => {
    const ref = createRef<CodeEditorHandle>();
    const { container } = render(<MarkdownEditor ref={ref} layout="split" defaultValue="# Links" maxHeight={300} />);
    expect(container.querySelector('[data-slot="markdown-editor"]')).toHaveAttribute("data-layout", "split");
    expect(container.querySelector(".cm-editor")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
    const preview = container.querySelector('[data-slot="markdown-editor-preview"]') as HTMLElement;
    // The preview scrolls in a preUI ScrollArea, not natively.
    expect(preview).toHaveClass("border-l");
    expect(preview).toHaveAttribute("data-slot", "markdown-editor-preview");
    expect(preview.querySelector('[data-slot="scroll-area-viewport"]')).toBeInTheDocument();
    expect(preview).not.toHaveClass("overflow-y-auto");
    // The editor side scrolls in its own ScrollArea too.
    expect(container.querySelector('[data-slot="code-editor"] [data-slot="scroll-area-viewport"] .cm-editor')).toBeInTheDocument();
    expect(preview.style.maxHeight).toBe("300px");
    expect(screen.getByRole("heading", { level: 1, name: "Links" })).toBeInTheDocument();
    act(() => ref.current!.view!.dispatch({ changes: { from: 7, insert: " und rechts" } }));
    expect(await screen.findByRole("heading", { level: 1, name: "Links und rechts" })).toBeInTheDocument();
  });

  it("editor layout has no preview; toolbar={false} hides the toolbar", () => {
    const { container, rerender } = render(<MarkdownEditor layout="editor" defaultValue="# X" />);
    expect(container.querySelector('[data-slot="markdown-editor-preview"]')).toBeNull();
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    rerender(<MarkdownEditor layout="editor" defaultValue="# X" toolbar={false} />);
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(container.querySelector('[data-slot="markdown-editor-header"]')).toBeNull();
  });

  it("toolbar accepts a subset of items", () => {
    render(<MarkdownEditor toolbar={["bold", "link"]} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("readOnly prevents edits and disables the toolbar", async () => {
    const user = userEvent.setup();
    const ref = createRef<CodeEditorHandle>();
    const onValueChange = vi.fn();
    const { container } = render(
      <MarkdownEditor ref={ref} defaultValue="fest" readOnly onValueChange={onValueChange} />,
    );
    expect(container.querySelector('[data-slot="markdown-editor"]')).toHaveAttribute("data-readonly");
    expect(ref.current!.view!.state.readOnly).toBe(true);
    await user.type(content(container), "xyz");
    const bold = screen.getByRole("button", { name: "Bold" });
    expect(bold).toHaveAttribute("data-disabled");
    select(ref, 0, 4);
    act(() => {
      content(container).dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }));
    });
    expect(ref.current!.view!.state.doc.toString()).toBe("fest");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("MarkdownEditor slots", () => {
  it("marks header, body, labels and preview in the split layout", () => {
    const { container } = render(<MarkdownEditor layout="split" defaultValue="" toolbar={false} />);
    const frame = container.querySelector('[data-slot="markdown-editor"]')!;
    expect(frame).toHaveClass("duration-pui-fast", "ease-pui");
    for (const slot of ["markdown-editor-header", "markdown-editor-body", "markdown-editor-label", "markdown-editor-preview", "markdown-editor-empty"]) {
      expect(frame.querySelector(`[data-slot="${slot}"]`), slot).toBeInTheDocument();
    }
  });
});
