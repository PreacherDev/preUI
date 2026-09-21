import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CodeBlock, CodeEditor, CodeInline, type CodeEditorHandle } from ".";
import { openSearchPanel } from "@codemirror/search";

// CodeMirror measures text via ranges; jsdom doesn't implement layout.
beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) } as DOMRect;
  const rectList = Object.assign([], { item: () => null }) as unknown as DOMRectList;
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => rect;
  }
  Range.prototype.getClientRects = () => rectList;
  if (!Element.prototype.getClientRects) Element.prototype.getClientRects = () => rectList;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const TS = `const answer: number = 42;\n// comment\nfunction greet(name: string) {\n  return "Hallo " + name;\n}`;

describe("CodeBlock", () => {
  it("renders plain code immediately and highlighted tokens after load", async () => {
    const { container } = render(<CodeBlock code={TS} language="ts" />);
    const block = container.querySelector('[data-slot="code-block"]')!;
    expect(block).toHaveAttribute("data-state", "plain");
    expect(container.querySelector("code")).toHaveTextContent("const answer: number = 42;");
    expect(container.querySelectorAll("[data-line]")).toHaveLength(5);

    await waitFor(() => expect(block).toHaveAttribute("data-state", "highlighted"), { timeout: 10_000 });
    const keyword = [...container.querySelectorAll("code span[style]")].find((el) => el.textContent === "const");
    expect(keyword).toBeDefined();
    expect((keyword as HTMLElement).style.color).toContain("--pui-syntax-keyword");
    const comment = [...container.querySelectorAll("code span[style]")].find((el) => el.textContent?.includes("comment"));
    expect((comment as HTMLElement).style.fontStyle).toBe("italic");
    // Text content is unchanged by highlighting.
    expect(container.querySelector("code")).toHaveTextContent('return "Hallo " + name;');
    expect(container.querySelectorAll("[data-line]")).toHaveLength(5);
  });

  it("falls back to plain text for unknown languages", async () => {
    const { container } = render(<CodeBlock code={"foo bar\nbaz"} language="definitely-not-a-language" />);
    const block = container.querySelector('[data-slot="code-block"]')!;
    await waitFor(() => expect(block).toHaveAttribute("data-state", "highlighted"), { timeout: 10_000 });
    expect(container.querySelector("code")).toHaveTextContent("foo bar");
    const colored = [...container.querySelectorAll("code span[style]")].filter((el) =>
      (el as HTMLElement).style.color.includes("--pui-syntax-keyword"),
    );
    expect(colored).toHaveLength(0);
  });

  it("supports line numbers, highlighted lines, filename header and className", () => {
    const { container } = render(
      <CodeBlock
        code={"a\nb\nc\n"}
        language="text"
        filename="notes.txt"
        showLineNumbers
        highlightLines={[2]}
        className="custom-class"
      />,
    );
    const block = container.querySelector('[data-slot="code-block"]')!;
    expect(block).toHaveClass("custom-class", "rounded-pui");
    expect(screen.getByText("notes.txt")).toBeInTheDocument();
    expect(screen.getByText("text")).toBeInTheDocument();
    const lines = container.querySelectorAll("[data-line]");
    // Trailing newline doesn't add an empty line.
    expect(lines).toHaveLength(3);
    expect(lines[0].className).toContain("before:content-[counter(line)]");
    expect(container.querySelector("code")!.className).toContain("[counter-reset:line]");
    expect(lines[1]).toHaveAttribute("data-highlighted");
    expect(lines[0]).not.toHaveAttribute("data-highlighted");
    expect(lines[1]).toHaveClass("bg-pui-primary/10");
  });

  it("scrolls long lines in a horizontal preUI ScrollArea, the copy button stays outside", () => {
    const { container } = render(<CodeBlock code={"const x = 1\n"} language="text" />);
    const pre = container.querySelector("pre")!;
    const viewport = pre.closest("[data-slot=scroll-area-viewport]");
    expect(viewport).not.toBeNull();
    // No native scroll container and no hand-made Tab stop: Base UI makes the viewport focusable when it overflows.
    expect(pre.className).not.toContain("overflow");
    expect(pre).not.toHaveAttribute("tabindex");
    expect(viewport).not.toContainElement(screen.getByRole("button", { name: "Copy code" }));
  });

  it("copies the code to the clipboard and shows the copied state", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const onCopy = vi.fn();
    render(<CodeBlock code="npm i @pre_scripts/preui" language="bash" onCopy={onCopy} />);

    await user.click(screen.getByRole("button", { name: "Copy code" }));
    expect(writeText).toHaveBeenCalledWith("npm i @pre_scripts/preui");
    expect(onCopy).toHaveBeenCalledWith("npm i @pre_scripts/preui");
    expect(await screen.findByRole("button", { name: "Copied" })).toHaveAttribute("data-copied");
  });

  it("resets the copied state after a moment and hides the button when not copyable", async () => {
    vi.useFakeTimers();
    try {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
      const { rerender } = render(<CodeBlock code="x" copyLabel="Kopieren" copiedLabel="Kopiert" />);
      await act(async () => {
        screen.getByRole("button", { name: "Kopieren" }).click();
      });
      expect(screen.getByRole("button", { name: "Kopiert" })).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(1600);
      });
      expect(screen.getByRole("button", { name: "Kopieren" })).toBeInTheDocument();
      rerender(<CodeBlock code="x" copyable={false} />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("CodeInline", () => {
  it("renders a styled code element", () => {
    render(
      <p>
        Nutze <CodeInline className="extra">useState</CodeInline> hier.
      </p>,
    );
    const code = screen.getByText("useState");
    expect(code.tagName).toBe("CODE");
    expect(code).toHaveClass("font-mono", "bg-pui-muted", "extra");
  });
});

describe("CodeEditor", () => {
  it("mounts CodeMirror with the initial value and exposes the view", () => {
    const ref = createRef<CodeEditorHandle>();
    const onMount = vi.fn();
    const { container } = render(
      <CodeEditor ref={ref} defaultValue={"local x = 1"} aria-label="Skript" onMount={onMount} className="my-editor" />,
    );
    expect(container.querySelector(".cm-editor")).toBeInTheDocument();
    expect(container.querySelector(".cm-content")).toHaveTextContent("local x = 1");
    expect(container.querySelector(".cm-content")).toHaveAttribute("aria-label", "Skript");
    expect(container.querySelector('[data-slot="code-editor"]')).toHaveClass("my-editor", "rounded-pui-md");
    expect(ref.current?.view?.state.doc.toString()).toBe("local x = 1");
    expect(onMount).toHaveBeenCalledWith(ref.current?.view);
    expect(container.querySelector(".cm-lineNumbers")).toBeInTheDocument();
  });

  it("scrolls in a preUI ScrollArea with the panels outside of it", () => {
    const ref = createRef<CodeEditorHandle>();
    const { container, rerender } = render(<CodeEditor ref={ref} defaultValue="a" maxHeight={200} />);
    const root = container.querySelector('[data-slot="code-editor"]') as HTMLElement;
    const frame = root.querySelector('[data-slot="code-editor-frame"]') as HTMLElement;
    expect(frame.style.maxHeight).toBe("200px");
    const viewport = frame.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
    expect(viewport).toContainElement(root.querySelector(".cm-editor") as HTMLElement);
    // The viewport isn't an extra Tab stop; CodeMirror's content is the focus target.
    expect(viewport).toHaveAttribute("tabindex", "-1");
    rerender(<CodeEditor ref={ref} defaultValue="a" maxHeight={200} wrap />);
    // Top panels (search) are mounted above the scroll area.
    act(() => {
      openSearchPanel(ref.current!.view!);
    });
    const panels = root.querySelectorAll('[data-slot="code-editor-panels"]');
    expect(panels[0].querySelector(".cm-search")).toBeInTheDocument();
    expect(viewport.querySelector(".cm-search")).toBeNull();
  });

  it("calls onValueChange when typing", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { container } = render(<CodeEditor defaultValue="" onValueChange={onValueChange} />);
    const content = container.querySelector(".cm-content") as HTMLElement;
    await user.click(content);
    await user.type(content, "abc");
    await waitFor(() => expect(onValueChange).toHaveBeenLastCalledWith("abc"));
  });

  it("readOnly prevents edits", async () => {
    const ref = createRef<CodeEditorHandle>();
    const onValueChange = vi.fn();
    const { container } = render(<CodeEditor ref={ref} defaultValue="fest" readOnly onValueChange={onValueChange} />);
    const view = ref.current!.view!;
    expect(view.state.readOnly).toBe(true);
    const content = container.querySelector(".cm-content") as HTMLElement;
    await userEvent.setup().type(content, "xyz");
    expect(view.state.doc.toString()).toBe("fest");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("applies controlled value updates without echoing them back", async () => {
    const ref = createRef<CodeEditorHandle>();
    const onValueChange = vi.fn();
    const { rerender } = render(<CodeEditor ref={ref} value="eins" onValueChange={onValueChange} />);
    rerender(<CodeEditor ref={ref} value="eins zwei" onValueChange={onValueChange} />);
    expect(ref.current!.view!.state.doc.toString()).toBe("eins zwei");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keeps the cursor when the parent echoes the value", async () => {
    const ref = createRef<CodeEditorHandle>();
    function Controlled() {
      const [value, setValue] = useState("ab");
      return <CodeEditor ref={ref} value={value} onValueChange={setValue} />;
    }
    render(<Controlled />);
    const view = ref.current!.view!;
    act(() => {
      view.dispatch({ selection: { anchor: 1 } });
      view.dispatch(view.state.replaceSelection("X"));
    });
    expect(view.state.doc.toString()).toBe("aXb");
    expect(view.state.selection.main.head).toBe(2);
  });

  it("ignores late echoes so fast typing is never lost", async () => {
    const ref = createRef<CodeEditorHandle>();
    let echo: (value: string) => void = () => {};
    function LateParent() {
      const [value, setValue] = useState("");
      echo = setValue;
      return <CodeEditor ref={ref} value={value} onValueChange={() => {}} />;
    }
    render(<LateParent />);
    const view = ref.current!.view!;
    // The editor reports "H", "Ha", "Hal" … but the parent only re-renders afterwards, one by one.
    const reported: string[] = [];
    const listener = (text: string) => {
      view.dispatch({ changes: { from: view.state.doc.length, insert: text } });
      reported.push(view.state.doc.toString());
    };
    // Re-wire onValueChange through a controlled parent that echoes stale values late.
    for (const char of "Hallo") listener(char);
    for (const stale of reported) act(() => echo(stale));
    expect(view.state.doc.toString()).toBe("Hallo");
    // A real external change afterwards is still applied.
    act(() => echo("Neu"));
    expect(view.state.doc.toString()).toBe("Neu");
  });

  it("redoes with Ctrl+Shift+Z", async () => {
    // Real browsers send keyCode 90; CodeMirror needs it to see the unshifted base key "z".
    const key = (init: KeyboardEventInit) => {
      const event = new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true });
      Object.defineProperty(event, "keyCode", { value: 90 });
      return event;
    };
    const ref = createRef<CodeEditorHandle>();
    render(<CodeEditor ref={ref} defaultValue="" />);
    const view = ref.current!.view!;
    act(() => view.dispatch(view.state.replaceSelection("abc")));
    const content = view.contentDOM;
    act(() => {
      content.focus();
      content.dispatchEvent(key({ key: "z", ctrlKey: true }));
    });
    expect(view.state.doc.toString()).toBe("");
    act(() => {
      content.dispatchEvent(key({ key: "Z", ctrlKey: true, shiftKey: true }));
    });
    expect(view.state.doc.toString()).toBe("abc");
  });

  it("switches languages without throwing", async () => {
    const ref = createRef<CodeEditorHandle>();
    const { rerender } = render(<CodeEditor ref={ref} defaultValue={'{"a": 1}'} language="json" />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    rerender(<CodeEditor ref={ref} defaultValue={'{"a": 1}'} language="lua" />);
    rerender(<CodeEditor ref={ref} defaultValue={'{"a": 1}'} language="not-a-language" />);
    rerender(<CodeEditor ref={ref} defaultValue={'{"a": 1}'} language="typescript" />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(ref.current!.view!.state.doc.toString()).toBe('{"a": 1}');
  });

  it("toggles line numbers and destroys the view on unmount", () => {
    const ref = createRef<CodeEditorHandle>();
    const { container, rerender, unmount } = render(<CodeEditor ref={ref} defaultValue="x" />);
    rerender(<CodeEditor ref={ref} defaultValue="x" lineNumbers={false} />);
    expect(container.querySelector(".cm-lineNumbers")).not.toBeInTheDocument();
    const view = ref.current!.view!;
    const destroy = vi.spyOn(view, "destroy");
    unmount();
    expect(destroy).toHaveBeenCalled();
  });
});

describe("Code tokens + slots", () => {
  it("marks the CodeBlock parts and reads syntax colours only from --pui-syntax-* tokens", () => {
    const { container } = render(<CodeBlock code={"a\nb"} language="text" filename="notes.txt" />);
    const block = container.querySelector('[data-slot="code-block"]')!;
    for (const slot of ["code-block-header", "code-block-filename", "code-block-language", "code-block-copy", "code-block-content"]) {
      expect(block.querySelector(`[data-slot="${slot}"]`), slot).toBeInTheDocument();
    }
    expect(block.querySelectorAll('[data-slot="code-block-line"]')).toHaveLength(2);
    expect((block as HTMLElement).style.color).toContain("var(--pui-syntax-foreground");
    // No theme-specific class overrides: syntax colours come only from the --pui-syntax-* tokens.
    expect(block.className).not.toContain("data-theme=carbon");
  });

  it("uses the motion tokens on the CodeEditor frame", () => {
    const { container } = render(<CodeEditor defaultValue="x" aria-label="Skript" />);
    const editor = container.querySelector('[data-slot="code-editor"]')!;
    expect(editor).toHaveClass("duration-pui-fast", "ease-pui");
    expect(editor.className).not.toContain("data-theme=carbon");
    expect(editor.querySelector('[data-slot="code-editor-content"]')).toBeInTheDocument();
  });
});
