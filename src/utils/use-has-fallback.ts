import { useCallback, useEffect, useRef, type Ref, type RefObject } from "react";

/**
 * One `:has()` rule to emulate: every `target` element (default: the root itself) gets the attribute `attr` while
 * `target.querySelector(has)` finds something. Write `has` relative to the target, e.g. `":scope > textarea"`.
 */
export interface HasFallbackRule {
  attr: string;
  has: string;
  /** Selector of the elements (inside the root) that get the attribute. Omit for the root itself. */
  target?: string;
}

/** `true` when the browser understands `:has()` (Chromium 105+, Safari 15.4+, Firefox 121+). */
export function supportsHasSelector(): boolean {
  try {
    return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("selector(:has(*))");
  } catch {
    return false;
  }
}

const OBSERVED_ATTRIBUTES = [
  "disabled",
  "data-disabled",
  "data-invalid",
  "aria-invalid",
  "data-align",
  "data-slot",
  "data-sidebar",
  "data-variant",
  "role",
];

/**
 * `:has()` fallback for browsers without it — notably Chromium < 105, the engine of CEF / FiveM NUI (Chromium 103).
 * Components keep their `has-[…]` classes (modern browsers) and add the same styles under a data attribute
 * (`data-[has-x]:…`); this hook sets those attributes from the DOM after mounting and keeps them up to date
 * (child/attribute mutations, focus changes). It does nothing where `:has()` is supported and never runs during
 * the server render, so it can't cause hydration mismatches. Internal helper.
 */
export function useHasFallback(ref: RefObject<HTMLElement | null>, rules: readonly HasFallbackRule[]): void {
  // Rules are static per component; a string key keeps the effect from re-running on every render.
  const key = JSON.stringify(rules);
  useEffect(() => {
    const root = ref.current;
    if (!root || supportsHasSelector()) return;
    const parsed = JSON.parse(key) as HasFallbackRule[];

    const update = () => {
      for (const { target, has, attr } of parsed) {
        const elements: Element[] = target ? Array.from(root.querySelectorAll(target)) : [root];
        for (const element of elements) {
          let match = false;
          try {
            match = element.querySelector(has) !== null;
          } catch {
            match = false;
          }
          if (match !== element.hasAttribute(attr)) {
            if (match) element.setAttribute(attr, "");
            else element.removeAttribute(attr);
          }
        }
      }
    };

    update();
    // Our own attribute writes don't trigger it: they aren't in the attribute filter.
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: OBSERVED_ATTRIBUTES });
    // `:focus-visible` rules: re-check once focus has settled.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onFocusChange = () => {
      clearTimeout(timer);
      timer = setTimeout(update, 0);
    };
    root.addEventListener("focusin", onFocusChange);
    root.addEventListener("focusout", onFocusChange);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      root.removeEventListener("focusin", onFocusChange);
      root.removeEventListener("focusout", onFocusChange);
    };
  }, [ref, key]);
}

/**
 * `useHasFallback` for a `forwardRef` component: returns a callback ref that feeds both the forwarded ref and the
 * fallback. Internal helper.
 */
export function useHasFallbackRef<T extends HTMLElement>(forwardedRef: Ref<T> | undefined, rules: readonly HasFallbackRule[]) {
  const innerRef = useRef<T | null>(null);
  useHasFallback(innerRef, rules);
  return useCallback(
    (node: T | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as { current: T | null }).current = node;
    },
    [forwardedRef],
  );
}
