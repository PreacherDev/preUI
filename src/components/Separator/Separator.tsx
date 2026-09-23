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
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        ],
        className,
      )}
      {...props}
    />
  );
});
