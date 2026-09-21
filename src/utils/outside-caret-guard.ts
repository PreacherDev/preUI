type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/** The DOM node a click at (x, y) would put the caret into — the same hit test the browser uses on mousedown. */
function caretNodeFromPoint(doc: CaretDocument, x: number, y: number): Node | null {
  if (doc.caretPositionFromPoint) return doc.caretPositionFromPoint(x, y)?.offsetNode ?? null;
  return doc.caretRangeFromPoint?.(x, y)?.startContainer ?? null;
}

/**
 * Chrome places the caret into the nearest text line when you press on the empty area of an *ancestor* of
 * an editable element — so a click beside an editor (in the page, right of its frame) focused it and moved
 * its cursor. This guard cancels such a mousedown when it started outside `boundary` (the editor frame)
 * on one of its ancestors but would land inside `editable`, and drops focus like a click on empty space
 * normally does.
 *
 * Framework-agnostic: used by the CodeMirror `CodeEditor` and the ProseMirror `RichTextEditor`.
 *
 * @param editable The contenteditable element (CodeMirror's `contentDOM`, ProseMirror's `view.dom`).
 * @param getBoundary The editor frame; presses inside it behave natively. Default: `editable` itself.
 * @returns Cleanup that removes the listener.
 */
export function guardOutsideCaret(editable: HTMLElement, getBoundary: () => Element | null = () => editable): () => void {
  const doc = editable.ownerDocument as CaretDocument;
  const onMouseDown = (event: MouseEvent) => {
    const target = event.target;
    const boundary = getBoundary() ?? editable;
    if (!(target instanceof Node) || boundary.contains(target)) return;
    // Only presses on an ancestor's empty area are affected; anything else hit a real element.
    if (!target.contains(boundary)) return;
    const caretNode = caretNodeFromPoint(doc, event.clientX, event.clientY);
    if (!caretNode || !editable.contains(caretNode)) return;
    event.preventDefault();
    const active = doc.activeElement;
    if (active instanceof HTMLElement) active.blur();
  };
  doc.addEventListener("mousedown", onMouseDown, true);
  return () => doc.removeEventListener("mousedown", onMouseDown, true);
}
