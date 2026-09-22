import { Field as BaseField } from "@base-ui/react/field";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import { cva } from "class-variance-authority";
import { useRender } from "@base-ui/react/use-render";
import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type CSSProperties,
  type HTMLAttributes,
} from "react";
import { cn, mergeClassName } from "../../utils/cn";
import { useHasFallbackRef, type HasFallbackRule } from "../../utils/use-has-fallback";
import { Separator } from "../Separator/Separator";

/**
 * Whether we are inside a `Field`. Base UI's label/description/error parts require a Field.Root,
 * but shadcn also uses them standalone (e.g. a FieldDescription under a FieldLegend, or a FieldLabel
 * wrapping a whole Field as a choice card) — outside a Field they render plain, equally styled elements.
 */
const InFieldContext = createContext(false);

type AnyClassName = string | ((state: never) => string | undefined) | undefined;
const resolveClassName = (className: AnyClassName) =>
  typeof className === "function" ? className({} as never) : className;

/** Plain element with the same styling, used outside a Field. Supports `render`. */
interface PlainPartProps extends Omit<HTMLAttributes<HTMLElement>, "className" | "style"> {
  tag: "label" | "p" | "div";
  className?: AnyClassName;
  style?: CSSProperties | ((state: never) => CSSProperties | undefined);
  /** Base UI render prop (typed per part at the public API; opaque here). */
  render?: unknown;
}

const PlainPart = forwardRef<HTMLElement, PlainPartProps>(function PlainPart({ tag, className, style, render, ...props }, ref) {
  return useRender({
    defaultTagName: tag,
    render: render as never,
    ref,
    props: {
      ...props,
      className: resolveClassName(className),
      style: typeof style === "function" ? style({} as never) : style,
    },
  });
});

/** Render-prop part that exposes the field's validity state; renders no element. */
export const FieldValidity = BaseField.Validity;

const fieldVariants = cva("flex", {
  variants: {
    orientation: {
      /** Label above the control. */
      vertical: "flex-col gap-1.5",
      /** Control and label side by side (checkbox, switch); `FieldContent` stacks label + description. */
      horizontal:
        "flex-row items-center gap-3 has-[>[data-slot=field-content]]:items-start data-[has-content]:items-start",
    },
  },
  defaultVariants: { orientation: "vertical" },
});

export interface FieldProps extends ComponentPropsWithoutRef<typeof BaseField.Root> {
  orientation?: "vertical" | "horizontal";
}

/** Groups label, control, description and error; handles labelling and validation. */
const fieldHasRules: HasFallbackRule[] = [{ attr: "data-has-content", has: ":scope > [data-slot=field-content]" }];

export const Field = forwardRef<ComponentRef<typeof BaseField.Root>, FieldProps>(function Field(
  { className, orientation = "vertical", ...props },
  ref,
) {
  const fieldRef = useHasFallbackRef(ref, fieldHasRules);
  return (
    <InFieldContext.Provider value={true}>
      <BaseField.Root
        ref={fieldRef}
        data-slot="field"
        data-orientation={orientation}
        className={mergeClassName(fieldVariants({ orientation }), className)}
        {...props}
      />
    </InFieldContext.Provider>
  );
});

export type FieldLabelProps = ComponentPropsWithoutRef<typeof BaseField.Label>;

/** Field label; dims when the field is disabled or when it follows a disabled control (e.g. in a `FieldItem`). */
export const FieldLabel = forwardRef<ComponentRef<typeof BaseField.Label>, FieldLabelProps>(function FieldLabel(
  { className, ...props },
  ref,
) {
  const classes = mergeClassName(
    [
      "text-xs font-medium text-pui-muted-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
      // Like `Label`: dims next to a disabled peer control, e.g. a disabled Checkbox / Radio in a `FieldItem`.
      "peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-[disabled]:cursor-not-allowed peer-data-[disabled]:opacity-50",
    ],
    className,
  );
  if (!useContext(InFieldContext)) {
    return <PlainPart ref={ref} tag="label" data-slot="field-label" className={classes} {...props} />;
  }
  return <BaseField.Label ref={ref} data-slot="field-label" className={classes} {...props} />;
});

export type FieldDescriptionProps = ComponentPropsWithoutRef<typeof BaseField.Description>;

export const FieldDescription = forwardRef<ComponentRef<typeof BaseField.Description>, FieldDescriptionProps>(
  function FieldDescription({ className, ...props }, ref) {
    // Directly under a FieldLegend it hugs the legend (6px like label → control) instead of the fieldset gap.
    const classes = mergeClassName("text-xs text-pui-muted-foreground [[data-variant=legend]+&]:-mt-2.5", className);
    if (!useContext(InFieldContext)) {
      return <PlainPart ref={ref} tag="p" data-slot="field-description" className={classes} {...props} />;
    }
    return <BaseField.Description ref={ref} data-slot="field-description" className={classes} {...props} />;
  },
);

export type FieldErrorProps = ComponentPropsWithoutRef<typeof BaseField.Error>;

export const FieldError = forwardRef<ComponentRef<typeof BaseField.Error>, FieldErrorProps>(function FieldError(
  { className, ...props },
  ref,
) {
  const classes = mergeClassName("text-xs text-pui-negative", className);
  if (!useContext(InFieldContext)) {
    // Outside a Field there is no validity state: show the children as an alert.
    const { match: _match, ...rest } = props;
    return <PlainPart ref={ref} tag="div" role="alert" data-slot="field-error" className={classes} {...rest} />;
  }
  return <BaseField.Error ref={ref} data-slot="field-error" className={classes} {...props} />;
});

export type FieldItemProps = ComponentPropsWithoutRef<typeof BaseField.Item>;

/** Wraps one option (checkbox, radio) inside a group field. */
export const FieldItem = forwardRef<ComponentRef<typeof BaseField.Item>, FieldItemProps>(function FieldItem(
  { className, ...props },
  ref,
) {
  return <BaseField.Item ref={ref} data-slot="field-item" className={mergeClassName("flex items-center gap-2", className)} {...props} />;
});

export type FieldGroupProps = ComponentPropsWithoutRef<"div">;

/** Stacks several `Field`s (or `FieldSet`s) with even spacing. */
export const FieldGroup = forwardRef<HTMLDivElement, FieldGroupProps>(function FieldGroup({ className, ...props }, ref) {
  return <div ref={ref} data-slot="field-group" className={cn("flex w-full flex-col gap-5", className)} {...props} />;
});

export type FieldContentProps = ComponentPropsWithoutRef<"div">;

/** Stacks label, description and error next to a control in a horizontal `Field`. */
export const FieldContent = forwardRef<HTMLDivElement, FieldContentProps>(function FieldContent(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="field-content"
      className={cn("flex min-w-0 flex-1 flex-col gap-1.5 leading-snug", className)}
      {...props}
    />
  );
});

export type FieldTitleProps = ComponentPropsWithoutRef<"div">;

/** Title line that is not a `<label>` (e.g. inside a choice card). */
export const FieldTitle = forwardRef<HTMLDivElement, FieldTitleProps>(function FieldTitle({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="field-title"
      className={cn("flex w-fit items-center gap-2 text-sm font-medium leading-snug text-pui-foreground", className)}
      {...props}
    />
  );
});

export type FieldSetProps = ComponentPropsWithoutRef<typeof BaseFieldset.Root>;

/** Groups related fields under a shared `FieldLegend`. Disabling it disables every field inside. */
export const FieldSet = forwardRef<ComponentRef<typeof BaseFieldset.Root>, FieldSetProps>(function FieldSet(
  { className, ...props },
  ref,
) {
  return (
    <BaseFieldset.Root
      ref={ref}
      data-slot="field-set"
      className={mergeClassName("m-0 flex min-w-0 flex-col gap-4 border-0 p-0", className)}
      {...props}
    />
  );
});

const fieldLegendVariants = cva("data-[disabled]:opacity-50", {
  variants: {
    variant: {
      /** Section heading. */
      legend: "text-sm font-semibold text-pui-foreground",
      /** Looks like a `FieldLabel` (e.g. for a checkbox or radio group). */
      label: "text-xs font-medium text-pui-muted-foreground",
    },
  },
  defaultVariants: { variant: "legend" },
});

export interface FieldLegendProps extends ComponentPropsWithoutRef<typeof BaseFieldset.Legend> {
  variant?: "legend" | "label";
}

export const FieldLegend = forwardRef<ComponentRef<typeof BaseFieldset.Legend>, FieldLegendProps>(function FieldLegend(
  { className, variant = "legend", ...props },
  ref,
) {
  return (
    <BaseFieldset.Legend
      ref={ref}
      data-slot="field-legend"
      data-variant={variant}
      className={mergeClassName(fieldLegendVariants({ variant }), className)}
      {...props}
    />
  );
});

export type FieldSeparatorProps = ComponentPropsWithoutRef<"div">;

/** Hairline between field groups, optionally with centred text ("or"). */
export const FieldSeparator = forwardRef<HTMLDivElement, FieldSeparatorProps>(function FieldSeparator(
  { className, children, ...props },
  ref,
) {
  const hasContent = children != null && children !== false;
  return (
    <div
      ref={ref}
      data-slot="field-separator"
      data-content={hasContent || undefined}
      className={cn("flex h-5 items-center gap-2 text-xs text-pui-muted-foreground", className)}
      {...props}
    >
      <Separator className="flex-1" />
      {hasContent && (
        <>
          <span data-slot="field-separator-content" className="shrink-0">
            {children}
          </span>
          <Separator className="flex-1" />
        </>
      )}
    </div>
  );
});
