import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom theme keys from the preset, so e.g. `rounded-full` replaces `rounded-pui`
// and `text-sm` replaces `text-pui-eyebrow`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      borderRadius: ["pui", "pui-md", "pui-sm", "pui-window"],
      // Control-height tokens live in the spacing scale (h-pui-control, size-pui-control-sm …).
      spacing: ["pui-control", "pui-control-sm", "pui-control-lg"],
      opacity: ["tint", "tint-hover", "tint-border", "scrim"],
    },
    classGroups: {
      "font-size": [{ text: ["pui-2xs", "pui-eyebrow"] }],
      shadow: [{ shadow: ["pui-window", "pui-floating", "pui-tooltip", "pui-thumb"] }],
      "ring-w": [{ ring: ["pui"] }],
      "ring-offset-w": [{ "ring-offset": ["pui"] }],
      duration: [{ duration: ["pui-fast", "pui-base", "pui-slow"] }],
      ease: [{ ease: ["pui"] }],
    },
  },
});

/** Joins class names and resolves conflicting Tailwind classes (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Base UI's `className` prop: a string or a function of the component state. */
export type StateClassName<State> = string | ((state: State) => string | undefined) | undefined;

/**
 * Merges preUI's classes with a Base UI `className`, keeping support for the function form.
 * `base` may itself be a function of the state (e.g. for variant classes).
 */
export function mergeClassName<State>(
  base: ClassValue | ((state: State) => ClassValue),
  className: StateClassName<State>,
): string | ((state: State) => string) {
  if (typeof base !== "function" && typeof className !== "function") {
    return cn(base, className);
  }
  return (state: State) =>
    cn(
      typeof base === "function" ? base(state) : base,
      typeof className === "function" ? className(state) : className,
    );
}
