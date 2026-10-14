import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from "react";
import { mergeClassName, type StateClassName } from "../../utils/cn";

/** Layout of the group: rows one below the other, or a row of choices that wraps. */
export type RadioGroupOrientation = "vertical" | "horizontal";

const RadioGroupOrientationContext = /* @__PURE__ */ createContext<RadioGroupOrientation>("vertical");

/** One choice for `RadioGroup`'s `items`. */
export interface RadioGroupOptionItem<Value = any> {
  value: Value;
  /** The clickable text next to the radio. */
  label: ReactNode;
  /** Second line: a hint, or why this choice is locked. */
  description?: ReactNode;
  disabled?: boolean;
  /** End of the row, e.g. a price or a balance (vertical layout). */
  end?: ReactNode;
}

/** Props of `RadioGroup`; `Value` is inferred from `value` / `defaultValue` / `onValueChange` like in Base UI. */
export interface RadioGroupProps<Value = any> extends BaseRadioGroup.Props<Value> {
  /**
   * Renders the choices as `RadioGroupOption` rows (radio and label together, the whole row clickable) instead of
   * `children`.
   */
  items?: RadioGroupOptionItem<Value>[];
  /**
   * `"vertical"` (default): one row per choice, each taking the full width, so long labels wrap.
   * `"horizontal"`: the choices sit next to each other and wrap when there is no room.
   * @default "vertical"
   */
  orientation?: RadioGroupOrientation;
  /** Classes for every row rendered from `items`. */
  itemClassName?: string;
}

/**
 * Single selection from a list of choices. Label it with `aria-labelledby` or `FieldSet`.
 * Pass `items` for ready-made rows, or `RadioGroupOption` / `RadioGroupItem` as children.
 * Generic like Base UI's: `<RadioGroup<"a" | "b"> onValueChange={(value) => …}>` types `value`.
 */
export const RadioGroup = /* @__PURE__ */ forwardRef(function RadioGroup(
  { className, items, orientation = "vertical", itemClassName, children, ...props }: RadioGroupProps,
  ref: Ref<HTMLDivElement>,
) {
  return (
    <RadioGroupOrientationContext.Provider value={orientation}>
      <BaseRadioGroup
        ref={ref}
        data-slot="radio-group"
        data-orientation={orientation}
        className={mergeClassName(
          orientation === "horizontal"
            ? "flex flex-row flex-wrap items-start gap-x-4 gap-y-2"
            : // No `items-start`: rows take the full width, so a long label wraps instead of leaving the panel.
              "flex flex-col gap-2",
          className,
        )}
        {...props}
      >
        {items
          ? items.map((item) => (
              <RadioGroupOption
                key={String(item.value)}
                value={item.value}
                disabled={item.disabled}
                description={item.description}
                end={item.end}
                className={itemClassName}
              >
                {item.label}
              </RadioGroupOption>
            ))
          : children}
      </BaseRadioGroup>
    </RadioGroupOrientationContext.Provider>
  );
}) as <Value = any>(props: RadioGroupProps<Value> & RefAttributes<HTMLDivElement>) => ReactElement;

export interface RadioGroupItemProps extends BaseRadio.Root.Props {
  /** Classes for the inner dot. */
  indicatorClassName?: StateClassName<BaseRadio.Indicator.State>;
}

/** 16px round radio; checked fills with primary and shows a centred dot. Wrap it in a `<label>` with its text. */
export const RadioGroupItem = /* @__PURE__ */ forwardRef<HTMLElement, RadioGroupItemProps>(function RadioGroupItem(
  { className, indicatorClassName, ...props },
  ref,
) {
  return (
    <BaseRadio.Root
      ref={ref}
      data-slot="radio-group-item"
      className={mergeClassName(
        [
          "peer inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-pui-input bg-transparent p-0",
          "outline-none transition-colors duration-pui-fast ease-pui",
          // 1px gap before the ring, otherwise it vanishes against the primary fill when checked.
          "focus-visible:ring-pui focus-visible:ring-pui-ring focus-visible:ring-offset-pui focus-visible:ring-offset-pui-background",
          "data-[checked]:border-pui-primary data-[checked]:bg-pui-primary",
          "data-[invalid]:border-pui-negative",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        ],
        className,
      )}
      {...props}
    >
      <BaseRadio.Indicator
        data-slot="radio-group-indicator"
        className={mergeClassName("block size-1.5 rounded-full bg-pui-primary-foreground", indicatorClassName)}
      />
    </BaseRadio.Root>
  );
});

export interface RadioGroupOptionProps extends Omit<BaseRadio.Root.Props, "children"> {
  /** The label next to the radio. */
  children?: ReactNode;
  /** Second line under the label: a hint, or why the choice is locked. */
  description?: ReactNode;
  /** End of the row, e.g. a price (vertical layout). */
  end?: ReactNode;
  /** Classes for the inner dot. */
  indicatorClassName?: StateClassName<BaseRadio.Indicator.State>;
}

/**
 * Radio and label in one clickable row: the text selects the choice too, greys out with it, and gets a second line
 * from `description`. In a vertical `RadioGroup` the row takes the full width, so long labels wrap.
 */
export const RadioGroupOption = /* @__PURE__ */ forwardRef<HTMLElement, RadioGroupOptionProps>(
  function RadioGroupOption(
    {
      className,
      children,
      description,
      end,
      indicatorClassName,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
      ...props
    },
    ref,
  ) {
    const orientation = useContext(RadioGroupOrientationContext);
    const id = useId();
    const labelId = `${id}label`;
    const descriptionId = `${id}description`;
    const endId = `${id}end`;
    const describedIds = [describedBy, description != null && descriptionId, end != null && endId].filter(
      Boolean,
    ) as string[];
    return (
      <BaseRadio.Root
        ref={ref}
        data-slot="radio-group-option"
        // The row's name is its label; the second line and the end slot are its description, so a screen reader
        // doesn't read them as one run-together name.
        aria-labelledby={labelledBy ?? labelId}
        aria-describedby={describedIds.length > 0 ? describedIds.join(" ") : undefined}
        className={mergeClassName(
          [
            "group/radio-option flex min-w-0 items-start gap-2 rounded-pui-md border-0 bg-transparent p-0 text-left text-sm font-normal text-pui-foreground",
            orientation === "horizontal" ? "w-auto" : "w-full",
            "outline-none transition-colors duration-pui-fast ease-pui",
            "focus-visible:ring-pui focus-visible:ring-pui-ring",
            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          ],
          className,
        )}
        {...props}
      >
        <span
          data-slot="radio-group-option-control"
          aria-hidden="true"
          className={[
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-pui-input",
            "transition-colors duration-pui-fast ease-pui",
            "group-data-[checked]/radio-option:border-pui-primary group-data-[checked]/radio-option:bg-pui-primary",
            "group-data-[invalid]/radio-option:border-pui-negative",
          ].join(" ")}
        >
          <BaseRadio.Indicator
            data-slot="radio-group-indicator"
            className={mergeClassName("block size-1.5 rounded-full bg-pui-primary-foreground", indicatorClassName)}
          />
        </span>
        <span data-slot="radio-group-option-text" className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id={labelId} data-slot="radio-group-option-label" className="break-words">
            {children}
          </span>
          {description != null && (
            <span
              id={descriptionId}
              data-slot="radio-group-option-description"
              className="break-words text-xs text-pui-muted-foreground"
            >
              {description}
            </span>
          )}
        </span>
        {end != null && (
          <span id={endId} data-slot="radio-group-option-end" className="shrink-0 tabular-nums text-pui-muted-foreground">
            {end}
          </span>
        )}
      </BaseRadio.Root>
    );
  },
);
