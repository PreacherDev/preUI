import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";

export type SeparatorProps = ComponentPropsWithoutRef<typeof BaseSeparator>;

/**
 * 1px hairline in the border colour, horizontal (default) or `orientation="vertical"`.
 *
 * A vertical separator has no height of its own: it stretches to the height of its flex row or grid row
 * (`self-stretch`), also when the row's height comes from its content. Give it a height for a shorter line
 * (`className="h-5"`, also shadcn's `data-[orientation=vertical]:h-5`): it is then centred in the row (`self-center`).
 * Outside a flex/grid container it needs an explicit height.
 */
// A height utility in the user's classes, also behind variants (`h-5`, `data-[orientation=vertical]:h-4`), not `min-h-*`.
const HEIGHT_CLASS = /(?:^|\s)(?:[^\s:]+:)*h-/;

export const Separator = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSeparator>, SeparatorProps>(function Separator(
  { className, orientation = "horizontal", ...props },
  ref,
) {
  return (
    <BaseSeparator
      ref={ref}
      orientation={orientation}
      data-slot="separator"
      className={mergeClassName(
        [
          "shrink-0 bg-pui-border",
          // Plain classes (not data-[orientation] variants), so tailwind-merge lets a user's `self-*` / `w-24` replace
          // them. Vertical: no height — `h-full` of a content-sized row is 0 and would block stretching; with a
          // height of its own (which stretching would pin to the top) it is centred instead.
          orientation === "vertical"
            ? typeof className === "string" && HEIGHT_CLASS.test(className)
              ? "w-px self-center"
              : "w-px self-stretch"
            : "h-px w-full",
        ],
        className,
      )}
      {...props}
    />
  );
});
