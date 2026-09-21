import { useCallback, useLayoutEffect, useRef, useState } from "react";

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "summary",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable=false])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Props for a preUI `ScrollArea` so its viewport is a Tab stop only while the content has nothing focusable.
 * Base UI makes every overflowing viewport tabbable (so keyboard users can scroll it); when the content has its
 * own focusable elements that extra stop is redundant — focusing them scrolls the area and the arrow keys scroll
 * their scroll parent — and it would steal a modal's initial focus from its first control.
 * @internal
 */
export function useScrollTabStop() {
  const [hasFocusable, setHasFocusable] = useState(false);
  const observer = useRef<MutationObserver | null>(null);

  const viewportRef = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const check = () => setHasFocusable(node.querySelector(FOCUSABLE) != null);
    check();
    if (typeof MutationObserver === "undefined") return;
    observer.current = new MutationObserver(check);
    observer.current.observe(node, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "tabindex", "href", "contenteditable", "type", "controls"],
    });
  }, []);

  useLayoutEffect(() => () => observer.current?.disconnect(), []);

  return { viewportRef, viewportProps: hasFocusable ? { tabIndex: -1 } : undefined };
}
