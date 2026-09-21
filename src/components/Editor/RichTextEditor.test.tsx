import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";
import { proseClassName } from "./prose";
import { normalizeLinkUrl, formatShortcut } from "./RichTextEditorToolbar";

// ProseMirror measures layout that jsdom doesn't implement.
beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
  const rectList = Object.assign([], { item: () => null }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  Range.prototype.getClientRects = () => rectList;
  Element.prototype.getClientRects = () => rectList;
  if (!document.elementFromPoint) {
    document.elementFromPoint = () => null;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

/** jsdom has no layout, so a click can't place the cursor: put it at the end via the handle. */
function focusEnd(ref: { current: RichTextEditorHandle | null }) {
  act(() => ref.current!.focus("end"));
}

/**
 * Types like ProseMirror's own text input path (runs input rules such as "## "); user-event's DOM
 * mutations don't map reliably onto ProseMirror's selection in jsdom. Real typing is covered by e2e.
 */
function typeText(ref: { current: RichTextEditorHandle | null }, text: string) {
  const view = ref.current!.editor!.view;
  act(() => {
    for (const char of text) {
      const { from, to } = view.state.selection;
      const handled = view.someProp("handleTextInput", (handler) => handler(view, from, to, char, () => view.state.tr));
      if (!handled) view.dispatch(view.state.tr.insertText(char, from, to));
    }
  });
}

function getContent() {
  return screen.getByRole("textbox", { name: "Notiz" });
}

describe("RichTextEditor", () => {
  it("renders defaultValue Markdown as HTML", () => {
    render(
      <RichTextEditor aria-label="Notiz" defaultValue={"# Auftrag\n\nText mit **fett**.\n\n- eins\n- zwei"} />,
    );
    const content = getContent();
    expect(content.querySelector("h1")).toHaveTextContent("Auftrag");
    expect(content.querySelector("strong")).toHaveTextContent("fett");
    expect(content.querySelectorAll("ul > li")).toHaveLength(2);
    expect(content.className).toContain("[&_h1]:text-xl");
    expect(proseClassName).toContain("[&_blockquote]:border-l-2");
  });

  it("emits Markdown while typing", async () => {
    const onValueChange = vi.fn();
    const ref = createRef<RichTextEditorHandle>();
    render(<RichTextEditor ref={ref} aria-label="Notiz" defaultValue="Hallo" onValueChange={onValueChange} />);
    focusEnd(ref);
    typeText(ref, " Welt");
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith("Hallo Welt"));
  });

  it("turns Markdown shortcuts into formatting while typing", async () => {
    const onValueChange = vi.fn();
    const ref = createRef<RichTextEditorHandle>();
    render(<RichTextEditor ref={ref} aria-label="Notiz" onValueChange={onValueChange} />);
    focusEnd(ref);
    typeText(ref, "## Titel");
    expect(getContent().querySelector("h2")).toHaveTextContent("Titel");
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith("## Titel"));

    // Keyboard shortcut (Mod+B) through ProseMirror's keymap.
    act(() => ref.current!.editor!.commands.selectAll());
    fireEvent.keyDown(getContent(), { key: "b", ctrlKey: true });
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith("## **Titel**"));
  });

  it("toggles bold from the toolbar and reflects the pressed state", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const ref = createRef<RichTextEditorHandle>();
    render(<RichTextEditor ref={ref} aria-label="Notiz" defaultValue="Wichtig" onValueChange={onValueChange} />);

    const bold = screen.getByRole("button", { name: "Bold" });
    expect(bold).toHaveAttribute("aria-pressed", "false");

    act(() => {
      ref.current!.editor!.commands.selectAll();
    });
    await user.click(bold);

    await waitFor(() => expect(bold).toHaveAttribute("aria-pressed", "true"));
    expect(getContent().querySelector("strong")).toHaveTextContent("Wichtig");
    expect(onValueChange).toHaveBeenLastCalledWith("**Wichtig**");

    await user.click(bold);
    await waitFor(() => expect(bold).toHaveAttribute("aria-pressed", "false"));
    expect(onValueChange).toHaveBeenLastCalledWith("Wichtig");
  });

  it("disables undo until there is history", async () => {
    const ref = createRef<RichTextEditorHandle>();
    render(<RichTextEditor ref={ref} aria-label="Notiz" defaultValue="Text" />);
    const undo = screen.getByRole("button", { name: "Undo" });
    expect(undo).toHaveAttribute("data-disabled");
    act(() => {
      ref.current!.editor!.chain().focus("end").insertContent("!").run();
    });
    await waitFor(() => expect(undo).not.toHaveAttribute("data-disabled"));
  });

  it("replaces the content when the controlled value changes", async () => {
    const user = userEvent.setup();
    const ref = createRef<RichTextEditorHandle>();
    function Controlled() {
      const [value, setValue] = useState("Erster Stand");
      return (
        <>
          <RichTextEditor ref={ref} aria-label="Notiz" value={value} onValueChange={setValue} />
          <button type="button" onClick={() => setValue("**Neuer** Stand")}>
            Ersetzen
          </button>
          <output data-testid="out">{value}</output>
        </>
      );
    }
    render(<Controlled />);
    expect(getContent()).toHaveTextContent("Erster Stand");

    await user.click(screen.getByRole("button", { name: "Ersetzen" }));
    await waitFor(() => expect(getContent().querySelector("strong")).toHaveTextContent("Neuer"));
    expect(getContent()).toHaveTextContent("Neuer Stand");

    // Typing in controlled mode round-trips through the parent without losing the text.
    focusEnd(ref);
    typeText(ref, "!");
    await waitFor(() => expect(screen.getByTestId("out")).toHaveTextContent("**Neuer** Stand!"));
    expect(getContent()).toHaveTextContent("Neuer Stand!");
    expect(getContent().querySelectorAll("p")).toHaveLength(1);
  });

  it("is read-only with editable=false", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<RichTextEditor aria-label="Notiz" defaultValue="Fest" editable={false} onValueChange={onValueChange} />);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    const content = getContent();
    expect(content).toHaveAttribute("contenteditable", "false");
    expect(content).toHaveAttribute("aria-readonly", "true");
    await user.click(content);
    await user.keyboard("abc");
    expect(content).toHaveTextContent("Fest");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("hides the toolbar with toolbar={false} and shows only listed items", () => {
    const { unmount } = render(<RichTextEditor aria-label="Notiz" toolbar={false} />);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    unmount();

    render(<RichTextEditor aria-label="Notiz" toolbar={["bold", "italic", "link"]} labels={{ bold: "Fett" }} />);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fett" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
  });

  it("shows the placeholder when empty", () => {
    render(<RichTextEditor aria-label="Notiz" placeholder="Schreib etwas …" />);
    const paragraph = getContent().querySelector("p");
    expect(paragraph).toHaveAttribute("data-placeholder", "Schreib etwas …");
    expect(paragraph).toHaveClass("is-editor-empty");
  });

  it("counts characters against the limit", async () => {
    const ref = createRef<RichTextEditorHandle>();
    render(<RichTextEditor ref={ref} aria-label="Notiz" defaultValue="Hallo" characterLimit={10} />);
    expect(screen.getByLabelText("Characters: 5 / 10")).toHaveTextContent("5 / 10");
    focusEnd(ref);
    typeText(ref, " Welt!!!");
    await waitFor(() => expect(screen.getByText("10 / 10")).toBeInTheDocument());
    expect(getContent()).toHaveTextContent("Hallo Welt");
  });

  it("exposes a handle and calls onEditorReady", async () => {
    const ref = createRef<RichTextEditorHandle>();
    const onEditorReady = vi.fn();
    render(<RichTextEditor ref={ref} aria-label="Notiz" defaultValue="*kursiv*" onEditorReady={onEditorReady} />);
    await waitFor(() => expect(onEditorReady).toHaveBeenCalledTimes(1));
    expect(ref.current!.getMarkdown()).toBe("*kursiv*");
    act(() => ref.current!.setMarkdown("> Zitat"));
    expect(getContent().querySelector("blockquote")).toHaveTextContent("Zitat");
  });

  it("scrolls the content in a preUI ScrollArea below the toolbar", () => {
    const { container } = render(<RichTextEditor aria-label="Notiz" minHeight={120} maxHeight={300} />);
    const scroll = container.querySelector('[data-slot="rich-text-editor-scroll"]') as HTMLElement;
    expect(scroll.style.maxHeight).toBe("300px");
    expect(scroll).not.toHaveClass("overflow-y-auto");
    const viewport = scroll.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
    expect(viewport).toContainElement(getContent());
    expect(viewport).toHaveAttribute("tabindex", "-1");
    // The toolbar stays outside the scrolling area.
    expect(scroll.querySelector('[data-slot="rich-text-editor-toolbar"]')).toBeNull();
    expect(container.querySelector('[data-slot="rich-text-editor-toolbar"]')).toBeInTheDocument();
  });

  it("merges className and contentClassName", () => {
    const { container } = render(
      <RichTextEditor aria-label="Notiz" className="max-w-md" contentClassName="px-4" />,
    );
    expect(container.firstChild).toHaveClass("max-w-md", "rounded-pui-md");
    expect(getContent()).toHaveClass("px-4");
    expect(getContent()).not.toHaveClass("px-3");
  });
});

describe("helpers", () => {
  it("normalizes link URLs", () => {
    expect(normalizeLinkUrl("example.com")).toBe("https://example.com");
    expect(normalizeLinkUrl("http://a.de")).toBe("http://a.de");
    expect(normalizeLinkUrl("info@firma.de")).toBe("mailto:info@firma.de");
    expect(normalizeLinkUrl("  ")).toBe("");
  });

  it("formats shortcuts per platform", () => {
    expect(formatShortcut("Mod+Shift+Z", false)).toBe("Ctrl+Shift+Z");
    expect(formatShortcut("Mod+B", true)).toBe("⌘B");
  });
});

describe("RichTextEditor slots", () => {
  it("marks frame, toolbar, content and character count", () => {
    const { container } = render(<RichTextEditor aria-label="Notiz" defaultValue="Hallo" characterLimit={10} />);
    const frame = container.querySelector('[data-slot="rich-text-editor"]')!;
    expect(frame).toHaveClass("duration-pui-fast", "ease-pui");
    for (const slot of ["rich-text-editor-toolbar", "rich-text-editor-content", "rich-text-editor-footer", "rich-text-editor-character-count"]) {
      expect(frame.querySelector(`[data-slot="${slot}"]`), slot).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("data-item", "bold");
  });
});
