// Pointer-event drag helpers shared by Kanban, SortableList and the DataTable row reorder. Pointer events instead of
// HTML5 drag & drop, which is unreliable in FiveM's CEF. Everything here runs in event handlers, never during render.

/** Pixels the pointer has to travel before a press turns into a drag (a shorter move stays a click). */
export const DRAG_THRESHOLD = 4;
const AUTO_SCROLL_EDGE = 40;
const AUTO_SCROLL_STEP = 12;

export interface ScrollInsets {
  /** Space at the top of the scroll box covered by something sticky (e.g. a table header), in px. */
  top?: number;
}

/**
 * Scrolls `element` by a step when the point is within 40px of its edge on `axis`. Returns whether it scrolled.
 * `document.scrollingElement` uses the viewport as its box.
 */
export function autoScroll(
  element: HTMLElement | null,
  x: number,
  y: number,
  axis: "x" | "y",
  insets: ScrollInsets = {},
): boolean {
  if (!element) return false;
  const doc = element.ownerDocument;
  const isPage = element === doc.scrollingElement;
  const view = doc.defaultView;
  const rect = isPage
    ? { top: 0, left: 0, bottom: view?.innerHeight ?? 0, right: view?.innerWidth ?? 0 }
    : element.getBoundingClientRect();
  if (axis === "y") {
    const before = element.scrollTop;
    if (y < rect.top + (insets.top ?? 0) + AUTO_SCROLL_EDGE) element.scrollTop -= AUTO_SCROLL_STEP;
    else if (y > rect.bottom - AUTO_SCROLL_EDGE) element.scrollTop += AUTO_SCROLL_STEP;
    return element.scrollTop !== before;
  }
  const before = element.scrollLeft;
  if (x < rect.left + AUTO_SCROLL_EDGE) element.scrollLeft -= AUTO_SCROLL_STEP;
  else if (x > rect.right - AUTO_SCROLL_EDGE) element.scrollLeft += AUTO_SCROLL_STEP;
  return element.scrollLeft !== before;
}

/** The nearest ancestor that scrolls vertically, else the page's scrolling element. */
export function findScrollParent(element: HTMLElement): HTMLElement | null {
  const doc = element.ownerDocument;
  for (let node = element.parentElement; node && node !== doc.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return (doc.scrollingElement as HTMLElement | null) ?? null;
}

export interface DragPreviewOptions {
  /** `data-slot` of the copy (e.g. `"kanban-drag-preview"`), so users can style it. */
  slot: string;
  /** CSS opacity of the copy, e.g. `"var(--pui-drag-preview-opacity, 0.6)"`. Opaque when left out. */
  opacity?: string;
}

/**
 * A detached copy of `element` that follows the pointer (fixed, on top of everything, no pointer events). It keeps
 * the scheme / theme of `scope` and the element's size. A table row is wrapped in a one-row table with the original
 * cell widths. Move it with `style.transform`, remove it with `.remove()`.
 */
export function createDragPreview(element: HTMLElement, scope: HTMLElement, { slot, opacity }: DragPreviewOptions) {
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true) as HTMLElement;
  for (const node of [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("[id]"))]) node.removeAttribute("id");
  for (const attribute of ["tabindex", "aria-describedby", "data-dragging", "data-sortable-id", "data-card-id"]) {
    clone.removeAttribute(attribute);
  }
  clone.style.transform = "";
  clone.style.transition = "";
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-slot", slot);

  const doc = element.ownerDocument;
  const wrapper = doc.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.setAttribute("inert", "");
  const scheme = scope.closest("[data-scheme]");
  if (scheme) wrapper.setAttribute("data-scheme", scheme.getAttribute("data-scheme")!);
  const theme = scope.closest("[data-theme]");
  if (theme) wrapper.setAttribute("data-theme", theme.getAttribute("data-theme")!);
  Object.assign(wrapper.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    pointerEvents: "none",
    zIndex: "2147483647",
    margin: "0",
    willChange: "transform",
  });
  if (opacity) wrapper.style.opacity = opacity;

  if (element.tagName === "TR") {
    // A <tr> outside a table loses its layout: rebuild a one-row table with the same classes and cell widths.
    const sourceTable = element.closest("table");
    const table = doc.createElement("table");
    if (sourceTable?.className) table.className = sourceTable.className;
    Object.assign(table.style, {
      width: `${rect.width}px`,
      minWidth: "0",
      tableLayout: "fixed",
      borderCollapse: "collapse",
      background: "hsl(var(--pui-card))",
      color: "hsl(var(--pui-card-foreground))",
    });
    const cells = Array.from(element.children) as HTMLElement[];
    Array.from(clone.children).forEach((cell, index) => {
      const width = cells[index]?.getBoundingClientRect().width;
      if (width) (cell as HTMLElement).style.width = `${width}px`;
    });
    clone.style.borderBottomWidth = "0";
    const body = doc.createElement("tbody");
    body.appendChild(clone);
    table.appendChild(body);
    Object.assign(wrapper.style, {
      border: "1px solid hsl(var(--pui-border))",
      borderRadius: "var(--pui-radius)",
      overflow: "hidden",
      boxShadow: "var(--pui-shadow-floating)",
    });
    wrapper.appendChild(table);
  } else {
    clone.style.boxShadow = "var(--pui-shadow-floating)";
    wrapper.appendChild(clone);
  }
  doc.body.appendChild(wrapper);
  return wrapper;
}

export interface PointerDragHandlers {
  /** The pointer passed the threshold: the press is now a drag. */
  onActivate: (event: PointerEvent) => void;
  /** Every pointer move after activation, with the distance from the press. */
  onMove: (event: PointerEvent, dx: number, dy: number) => void;
  /**
   * The drag ended: `commit` on pointer up, not on pointercancel / window blur / Escape. Only called after
   * `onActivate` (a press that never became a drag ends silently).
   */
  onEnd: (commit: boolean) => void;
  /** Always called once when the listeners are removed (after `onEnd`, or for a press that stayed a click). */
  onCleanup?: () => void;
}

/**
 * Starts tracking a press (`pointerdown` with x/y): window listeners for move / up / cancel / blur and Escape (which
 * cancels an active drag without reaching a surrounding dialog). Returns a cleanup that removes everything without
 * calling `onEnd` (for unmounts).
 */
export function startPointerDrag(
  start: { clientX: number; clientY: number },
  { onActivate, onMove, onEnd, onCleanup }: PointerDragHandlers,
  threshold = DRAG_THRESHOLD,
): () => void {
  const startX = start.clientX;
  const startY = start.clientY;
  let active = false;
  let done = false;

  const move = (event: PointerEvent) => {
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!active) {
      if (Math.hypot(dx, dy) < threshold) return;
      active = true;
      window.getSelection?.()?.removeAllRanges();
      onActivate(event);
    }
    onMove(event, dx, dy);
  };
  const end = (commit: boolean) => {
    const wasActive = active;
    cleanup();
    if (wasActive) onEnd(commit);
  };
  const up = () => end(true);
  const cancel = () => end(false);
  const key = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !active) return;
    // Don't let the Escape also close a surrounding dialog.
    event.stopPropagation();
    event.preventDefault();
    end(false);
  };

  function cleanup() {
    if (done) return;
    done = true;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("blur", cancel);
    window.removeEventListener("keydown", key, true);
    onCleanup?.();
  }

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("blur", cancel);
  window.addEventListener("keydown", key, true);
  return cleanup;
}
