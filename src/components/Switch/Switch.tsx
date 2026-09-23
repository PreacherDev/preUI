import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { forwardRef } from "react";
import { mergeClassName, type StateClassName } from "../../utils/cn";

export interface SwitchProps extends BaseSwitch.Root.Props {
  /** Classes for the thumb. */
  thumbClassName?: StateClassName<BaseSwitch.Thumb.State>;
}

/** 36x20 track with a 16px thumb; checked fills the track with primary. */
export const Switch = /* @__PURE__ */ forwardRef<HTMLElement, SwitchProps>(function Switch(
  { className, thumbClassName, ...props },
  ref,
) {
  return (
    <BaseSwitch.Root
      ref={ref}
      data-slot="switch"
      className={mergeClassName(
        [
          "peer relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-pui-input p-0",
          "outline-none transition-colors duration-pui-fast ease-pui",
          // 1px gap before the ring, otherwise it vanishes against the primary track when checked.
          "focus-visible:ring-pui focus-visible:ring-pui-ring focus-visible:ring-offset-pui focus-visible:ring-offset-pui-background",
          "data-[checked]:bg-pui-primary",
          "data-[invalid]:border-pui-negative",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        ],
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        data-slot="switch-thumb"
        className={mergeClassName(
          [
            "pointer-events-none block size-4 translate-x-0 rounded-full bg-pui-thumb shadow-pui-thumb",
            "transition-[transform,background-color] duration-pui-fast ease-pui data-[checked]:translate-x-4",
            // On the primary track the thumb takes the primary foreground, so it stays visible when a theme uses a light accent colour.
            "data-[checked]:bg-pui-primary-foreground",
          ],
          thumbClassName,
        )}
      />
    </BaseSwitch.Root>
  );
});
