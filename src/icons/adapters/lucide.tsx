import { Check, ChevronDown, Loader2, X } from "lucide-react";
import type { IconSet } from "../types";

/**
 * Ready-made icon set for lucide-react.
 * Usage: <IconProvider icons={lucideIcons}>
 */
export const lucideIcons: IconSet = {
  spinner: Loader2,
  check: Check,
  close: X,
  chevronDown: ChevronDown,
};
