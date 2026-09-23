import { Accordion as BaseAccordion } from "@base-ui/react/accordion";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { useIcon } from "../../icons";
import { mergeClassName } from "../../utils/cn";

export type AccordionProps = ComponentPropsWithoutRef<typeof BaseAccordion.Root>;

/** Groups the accordion items. Pass `multiple` to allow several open panels. */
export const Accordion = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAccordion.Root>, AccordionProps>(function Accordion(
  props,
  ref,
) {
  return <BaseAccordion.Root ref={ref} data-slot="accordion" {...props} />;
});

export type AccordionItemProps = ComponentPropsWithoutRef<typeof BaseAccordion.Item>;

/** One header + panel pair, separated from the next item by a hairline. */
export const AccordionItem = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAccordion.Item>, AccordionItemProps>(
  function AccordionItem({ className, ...props }, ref) {
    return (
      <BaseAccordion.Item
        ref={ref}
        data-slot="accordion-item"
        className={mergeClassName("border-b border-pui-border", className)}
        {...props}
      />
    );
  },
);

export type AccordionTriggerProps = ComponentPropsWithoutRef<typeof BaseAccordion.Trigger>;

/**
 * Header + Trigger in one: a full-width button with a chevron that turns 180° when the panel is open.
 * The ref and props go to the button.
 */
export const AccordionTrigger = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAccordion.Trigger>, AccordionTriggerProps>(
  function AccordionTrigger({ className, children, ...props }, ref) {
    const ChevronDown = useIcon("chevronDown");
    return (
      <BaseAccordion.Header data-slot="accordion-header" className="flex">
        <BaseAccordion.Trigger
          ref={ref}
          data-slot="accordion-trigger"
          className={mergeClassName(
            [
              "group flex flex-1 items-center justify-between gap-4 rounded-pui-sm py-3 text-left text-sm font-medium text-pui-foreground select-none outline-none",
              "transition-colors duration-pui-fast ease-pui",
              "focus-visible:ring-pui focus-visible:ring-pui-ring",
              "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
            ],
            className,
          )}
          {...props}
        >
          {children}
          <ChevronDown
            className="size-4 shrink-0 text-pui-muted-foreground transition-[transform,color] duration-pui-base ease-pui group-hover:text-pui-foreground group-data-[panel-open]:rotate-180"
            aria-hidden="true"
          />
        </BaseAccordion.Trigger>
      </BaseAccordion.Header>
    );
  },
);

export type AccordionContentProps = ComponentPropsWithoutRef<typeof BaseAccordion.Panel>;

/** Collapsible content; animates its height via `--accordion-panel-height` (`--pui-duration-base`). */
export const AccordionContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAccordion.Panel>, AccordionContentProps>(
  function AccordionContent({ className, children, ...props }, ref) {
    return (
      <BaseAccordion.Panel
        ref={ref}
        data-slot="accordion-content"
        className={mergeClassName(
          [
            "h-[var(--accordion-panel-height)] overflow-hidden text-sm text-pui-muted-foreground",
            "transition-[height] duration-pui-base ease-pui",
            "data-[starting-style]:h-0 data-[ending-style]:h-0",
          ],
          className,
        )}
        {...props}
      >
        <div className="pb-3">{children}</div>
      </BaseAccordion.Panel>
    );
  },
);

