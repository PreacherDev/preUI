/*! Default icon paths from Lucide (https://lucide.dev) — ISC License, Copyright (c) Lucide Contributors */
import type { ReactNode } from "react";
import type { IconComponent, IconProps, IconSet } from "./types";

function createIcon(path: ReactNode): IconComponent {
  return function DefaultIcon({ size = 16, ...props }: IconProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {path}
      </svg>
    );
  };
}

/** Dependency-free fallback icons, used when no icon library is configured. */
export const defaultIcons: IconSet = {
  spinner: createIcon(<path d="M21 12a9 9 0 1 1-6.219-8.56" />),
  check: createIcon(<path d="M20 6 9 17l-5-5" />),
  close: createIcon(<path d="M18 6 6 18M6 6l12 12" />),
  chevronDown: createIcon(<path d="m6 9 6 6 6-6" />),
  chevronUp: createIcon(<path d="m18 15-6-6-6 6" />),
  chevronLeft: createIcon(<path d="m15 18-6-6 6-6" />),
  chevronRight: createIcon(<path d="m9 18 6-6-6-6" />),
  chevronsUpDown: createIcon(<path d="m7 15 5 5 5-5M7 9l5-5 5 5" />),
  chevronsLeft: createIcon(<path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />),
  chevronsRight: createIcon(<path d="m6 17 5-5-5-5M13 17l5-5-5-5" />),
  minus: createIcon(<path d="M5 12h14" />),
  plus: createIcon(<path d="M5 12h14M12 5v14" />),
  search: createIcon(
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>,
  ),
  more: createIcon(
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </>,
  ),
  lock: createIcon(
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>,
  ),
  info: createIcon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>,
  ),
  success: createIcon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>,
  ),
  error: createIcon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>,
  ),
  warning: createIcon(
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3ZM12 9v4M12 17h.01" />,
  ),
  calendar: createIcon(
    <>
      <path d="M8 2v4M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </>,
  ),
  panelLeft: createIcon(
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </>,
  ),
  arrowUp: createIcon(<path d="m5 12 7-7 7 7M12 19V5" />),
  arrowDown: createIcon(<path d="M12 5v14M19 12l-7 7-7-7" />),
  arrowUpDown: createIcon(<path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16" />),
  gripVertical: createIcon(
    <>
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </>,
  ),
  copy: createIcon(
    <>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>,
  ),
  bold: createIcon(<path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8" />),
  italic: createIcon(
    <>
      <line x1="19" x2="10" y1="4" y2="4" />
      <line x1="14" x2="5" y1="20" y2="20" />
      <line x1="15" x2="9" y1="4" y2="20" />
    </>,
  ),
  underline: createIcon(
    <>
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="4" x2="20" y1="20" y2="20" />
    </>,
  ),
  strikethrough: createIcon(
    <>
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <line x1="4" x2="20" y1="12" y2="12" />
    </>,
  ),
  code: createIcon(
    <>
      <path d="m16 18 6-6-6-6" />
      <path d="m8 6-6 6 6 6" />
    </>,
  ),
  codeBlock: createIcon(
    <>
      <path d="m10 9-3 3 3 3" />
      <path d="m14 15 3-3-3-3" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </>,
  ),
  heading1: createIcon(
    <>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="m17 12 3-2v8" />
    </>,
  ),
  heading2: createIcon(
    <>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
    </>,
  ),
  heading3: createIcon(
    <>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
      <path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" />
    </>,
  ),
  list: createIcon(
    <>
      <path d="M3 5h.01" />
      <path d="M3 12h.01" />
      <path d="M3 19h.01" />
      <path d="M8 5h13" />
      <path d="M8 12h13" />
      <path d="M8 19h13" />
    </>,
  ),
  listOrdered: createIcon(
    <>
      <path d="M11 5h10" />
      <path d="M11 12h10" />
      <path d="M11 19h10" />
      <path d="M4 4h1v5" />
      <path d="M4 9h2" />
      <path d="M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02" />
    </>,
  ),
  quote: createIcon(
    <>
      <path d="M17 5H3" />
      <path d="M21 12H8" />
      <path d="M21 19H8" />
      <path d="M3 12v7" />
    </>,
  ),
  link: createIcon(
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>,
  ),
  undo: createIcon(
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
    </>,
  ),
  redo: createIcon(
    <>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" />
    </>,
  ),
  eye: createIcon(
    <>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
};
