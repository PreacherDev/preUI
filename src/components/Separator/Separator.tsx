import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { mergeClassName } from "../../utils/cn";

export type SeparatorProps = ComponentPropsWithoutRef<typeof BaseSeparator>;

/** 1px hairline in the border colour, horizontal (default) or `orientation="vertical"`. */
export const Separator = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseSeparator>, SeparatorProps>(function Separator(
  { className, ...props },
  ref,
) {
  return (
    <BaseSeparator
      ref={ref}
      data-slot="separator"
      className={mergeClassName(
        [
          "shrink-0 bg-pui-border",
          "data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full",
          // self-stretch: in a flex row whose height comes from its content, h-full resolves to auto (0 for an
          // empty element); stretching gives it the row's height. An explicit h-* still wins.
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
        ],
        className,
      )}
      {...props}
    />
  );
});
