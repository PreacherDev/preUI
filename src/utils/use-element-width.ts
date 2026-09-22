import { useEffect, useState, type RefObject } from "react";

/**
 * The element's current border-box width in px (via `ResizeObserver`), `undefined` until it has been measured —
 * so server render and hydration agree and layouts derived from it apply right after mounting. Internal helper.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number | undefined {
  const [width, setWidth] = useState<number | undefined>(undefined);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
