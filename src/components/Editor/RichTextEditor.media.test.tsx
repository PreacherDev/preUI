import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { TextSelection } from "@tiptap/pm/state";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";
import { defaultRichTextEditorToolbar } from "./RichTextEditorToolbar";

// ProseMirror measures layout that jsdom doesn't implement.
beforeAll(() => {
  const rect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) };
  const rectList = Object.assign([], { item: () => null }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  Range.prototype.getClientRects = () => rectList;
  Element.prototype.getClientRects = () => rectList;
  if (!document.elementFromPoint) document.elementFromPoint = () => null;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

function roundTrip(markdown: string) {
  const ref = createRef<RichTextEditorHandle>();
  const result = render(<RichTextEditor ref={ref} aria-label="Seite" immediatelyRender defaultValue={markdown} />);
  return { ref, ...result, output: ref.current!.getMarkdown() };
}

/** Puts the cursor into the first text position after `text` occurs in the document. */
function placeCursorIn(ref: { current: RichTextEditorHandle | null }, text: string) {
  const editor = ref.current!.editor!;
  let target = -1;
  editor.state.doc.descendants((node, pos) => {
    if (target < 0 && node.isText && node.text?.includes(text)) target = pos + node.text.indexOf(text) + 1;
    return target < 0;
  });
  act(() => {
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, target)));
  });
}

const table = [
  "| Name | Preis | Menge |",
  "| :--- | :---: | ---: |",
  "| Apfel | **1 €** | 3 |",
  "| Birne `a\\|b` und a\\|b | [Link](https://a.b) | 4 |",
].join("\n");

describe("RichTextEditor: images and GFM tables", () => {
  it.each([
    ["an inline image with title", 'Text ![Logo](https://example.com/logo.png "Titel") danach'],
    ["an image on its own line", "![](/img/a.png)"],
    ["a linked image", "[![Bild](https://x.y/b.png)](https://x.y)"],
    ["an image URL with spaces", "![Bild](</bilder/mein bild.png>)"],
    ["images in a list and a quote", "- Liste\n\n  ![Bild](https://x.y/c.png)\n\n> ![Zitat](https://x.y/d.png)"],
    ["a table with alignment, marks, links and escaped pipes", table],
    ["a table between paragraphs, with an image in a cell", "Vorher\n\n| A | B |\n| --- | --- |\n| ![i](/i.png) | *kursiv* |\n\nNachher"],
    ["a table with only a header row", "| Nur | Kopf |\n| --- | --- |"],
    ["a hard break in a cell", "| A |\n| --- |\n| x<br>y |"],
    ["plain links next to them", "Ein [Link](https://a.b \"Titel\") und ![Bild](/b.png)"],
  ])("keeps %s through a round trip", (_, markdown) => {
    expect(roundTrip(markdown).output).toBe(markdown);
  });

  it("renders images and tables in the editor", () => {
    roundTrip(`![Logo](/logo.png)\n\n${table}`);
    const content = screen.getByRole("textbox", { name: "Seite" });
    const image = content.querySelector("img")!;
    expect(image).toHaveAttribute("src", "/logo.png");
    expect(image).toHaveAttribute("alt", "Logo");
    expect(image).toHaveAttribute("data-slot", "rich-text-editor-image");
    const tableElement = content.querySelector("table")!;
    expect(tableElement).toHaveAttribute("data-slot", "rich-text-editor-table");
    expect(tableElement.querySelectorAll("th")).toHaveLength(3);
    expect(tableElement.querySelectorAll("tr")).toHaveLength(3);
    expect(tableElement.querySelectorAll("th")[1]).toHaveStyle({ textAlign: "center" });
    expect(tableElement.querySelector("td strong")).toHaveTextContent("1 €");
    // Styled like the rest of preUI (tokens only).
    expect(content.className).toContain("[&_:is(td,th)]:border-pui-border");
    expect(content.className).toContain("[&_img]:max-w-full");
  });

  it("has image and table buttons in the default toolbar, with labels", () => {
    expect(defaultRichTextEditorToolbar).toEqual(expect.arrayContaining(["image", "table"]));
    render(<RichTextEditor aria-label="Seite" labels={{ image: "Bild", table: "Tabelle" }} />);
    expect(screen.getByRole("button", { name: "Bild" })).toHaveAttribute("data-item", "image");
    expect(screen.getByRole("button", { name: "Tabelle" })).toHaveAttribute("data-item", "table");
  });

  it("inserts and edits an image through the toolbar", async () => {
    const user = userEvent.setup();
    const ref = createRef<RichTextEditorHandle>();
    render(<RichTextEditor ref={ref} aria-label="Seite" defaultValue="Hallo " toolbar={["image"]} />);
    act(() => ref.current!.focus("end"));
    await user.click(screen.getByRole("button", { name: "Image" }));
    await user.type(await screen.findByRole("textbox", { name: "Image URL" }), "/bilder/auto.png");
    await user.type(screen.getByRole("textbox", { name: "Description (alt text)" }), "Mein Auto");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(ref.current!.getMarkdown()).toBe("Hallo ![Mein Auto](/bilder/auto.png)"));

    // Select the image: the popover is prefilled and changes it in place.
    const editor = ref.current!.editor!;
    act(() => {
      editor.commands.setNodeSelection(editor.state.doc.content.size - 2);
    });
    expect(editor.isActive("image")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Image" }));
    const alt = await screen.findByRole("textbox", { name: "Description (alt text)" });
    expect(alt).toHaveValue("Mein Auto");
    await user.clear(alt);
    await user.type(alt, "Neues Auto");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(ref.current!.getMarkdown()).toBe("Hallo ![Neues Auto](/bilder/auto.png)"));
  });

  it("inserts a table and edits rows and columns through the table menu", async () => {
    const user = userEvent.setup();
    const ref = createRef<RichTextEditorHandle>();
    render(<RichTextEditor ref={ref} aria-label="Seite" defaultValue="Text" toolbar={["table"]} />);
    act(() => ref.current!.focus("end"));

    await user.click(screen.getByRole("button", { name: "Table" }));
    // Outside a table only "Insert table" is available.
    expect(await screen.findByRole("menuitem", { name: "Add row below" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("menuitem", { name: "Insert table" }));
    await waitFor(() =>
      expect(ref.current!.getMarkdown()).toBe("Text\n\n|  |  |  |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |"),
    );
    // The cursor is in the first header cell.
    const editor = ref.current!.editor!;
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
    expect(editor.state.selection.$from.node(-1).type.name).toBe("tableHeader");
    expect(screen.getByRole("button", { name: "Table" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Table" }));
    expect(await screen.findByRole("menuitem", { name: "Insert table" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("menuitem", { name: "Add column right" }));
    await waitFor(() => expect(ref.current!.getMarkdown().split("\n")[2]).toBe("|  |  |  |  |"));

    await user.click(screen.getByRole("button", { name: "Table" }));
    await user.click(await screen.findByRole("menuitem", { name: "Add row below" }));
    await waitFor(() => expect(ref.current!.getMarkdown().split("\n")).toHaveLength(7));

    await user.click(screen.getByRole("button", { name: "Table" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete table" }));
    await waitFor(() => expect(ref.current!.getMarkdown()).toBe("Text"));
  });

  it("moves between cells with Tab and adds a row after the last cell", () => {
    const ref = createRef<RichTextEditorHandle>();
    render(<RichTextEditor ref={ref} aria-label="Seite" defaultValue={"| A | B |\n| --- | --- |\n| 1 | 2 |"} />);
    placeCursorIn(ref, "1");
    const editor = ref.current!.editor!;
    const tab = (shiftKey = false) =>
      act(() => {
        editor.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true }));
      });
    tab();
    expect(editor.state.selection.$from.parent.textContent).toBe("2");
    tab(true);
    expect(editor.state.selection.$from.parent.textContent).toBe("1");
    tab();
    tab();
    expect(ref.current!.getMarkdown()).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |\n|  |  |");
  });

  it("keeps working read-only (no toolbar)", () => {
    render(<RichTextEditor aria-label="Seite" editable={false} defaultValue={table} />);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Seite" }).querySelector("table")).toBeInTheDocument();
  });
});
