/**
 * Internal helper shared by Select, Combobox and Autocomplete — not exported from the package index.
 */
import type { HTMLAttributes, ReactElement, Ref } from "react";
import { ScrollArea } from "../ScrollArea/ScrollArea";

type ListRenderProps = HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> };

/**
 * Base UI `render` function for `Select.List` / `Combobox.List` / `Autocomplete.List`: the list element
 * itself becomes the viewport of a preUI `ScrollArea`, so it stays the scroll container Base UI expects
 * (highlight scroll-into-view, Select scroll arrows, `alignItemWithTrigger`) while showing our thumb
 * instead of the native scrollbar. The list's own props (role, id, tabIndex, handlers, `className`
 * with its max height) win over the viewport defaults. The viewport is never a Tab stop; the thumb
 * floats over the content (options keep their right padding).
 */
export function renderListInScrollArea(props: ListRenderProps): ReactElement {
  const { ref, className, children, ...listProps } = props;
  return (
    <ScrollArea
      reserveTrack={false}
      className="max-h-full"
      viewportRef={ref}
      viewportClassName={className}
      viewportProps={{ tabIndex: -1, ...listProps }}
    >
      {children}
    </ScrollArea>
  );
}
