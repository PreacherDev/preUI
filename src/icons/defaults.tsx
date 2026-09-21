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
};
