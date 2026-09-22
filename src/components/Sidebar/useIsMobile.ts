import { useMediaQuery } from "../../utils/use-media-query";

/** Below this viewport width (px) the sidebar renders as a sheet. Matches Tailwind's `md` breakpoint. */
export const SIDEBAR_MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width: ${SIDEBAR_MOBILE_BREAKPOINT - 1}px)`;

/**
 * `true` while the viewport is narrower than 768px. Internal to the sidebar.
 *
 * SSR-safe: `false` on the server and during hydration (the desktop markup is hidden below `md` by CSS, so a
 * phone never sees it), the real value right after hydration.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(QUERY);
}
