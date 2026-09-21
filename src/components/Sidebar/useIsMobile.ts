import { useEffect, useState } from "react";

/** Below this viewport width (px) the sidebar renders as a sheet. Matches Tailwind's `md` breakpoint. */
export const SIDEBAR_MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width: ${SIDEBAR_MOBILE_BREAKPOINT - 1}px)`;

function getMatches(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(QUERY).matches;
}

/** `true` while the viewport is narrower than 768px. Internal to the sidebar. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(getMatches);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    // Safari < 14
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return isMobile;
}
