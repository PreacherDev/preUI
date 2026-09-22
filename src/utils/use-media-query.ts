import { useCallback, useSyncExternalStore } from "react";

function canMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

const getServerSnapshot = () => false;

/**
 * `true` while the media query matches. SSR-safe: the server render and the hydration pass use `false`
 * (React re-renders with the real value right after hydrating), a plain client render reads the query
 * directly — so there is neither a hydration mismatch nor a flash in client-only apps. Internal helper.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatchMedia()) return () => {};
      const mql = window.matchMedia(query);
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
      }
      // Safari < 14
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => canMatchMedia() && window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
