import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  version as reactVersion,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
  type RefCallback,
} from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "../../utils/cn";
import { Label } from "../Label/Label";
import { NumberField } from "../NumberField/NumberField";

/*
 * shadcn/ui's react-hook-form `Form` for preUI.
 *
 * Pattern A – `Form` / `FormField` / `FormItem` / `FormControl` (shadcn's classic API):
 *
 *   const form = useForm<Values>({ defaultValues: { name: "" } });
 *   <Form {...form}>
 *     <form onSubmit={form.handleSubmit(onSubmit)}>
 *       <FormField
 *         control={form.control}
 *         name="name"
 *         rules={{ required: "Bitte gib einen Namen ein." }}
 *         render={({ field }) => (
 *           <FormItem>
 *             <FormLabel>Name</FormLabel>
 *             <FormControl><Input {...field} /></FormControl>
 *             <FormDescription>Öffentlich sichtbar.</FormDescription>
 *             <FormMessage />
 *           </FormItem>
 *         )}
 *       />
 *     </form>
 *   </Form>
 *
 * Pattern B – react-hook-form's `Controller` + preUI's `Field` (shadcn's newer "Field" guidance; needs
 * nothing from this entry). Base UI's `Field` accepts externally managed state (`invalid`, `touched`,
 * `dirty`) and `FieldError match` lets the library decide when the message shows:
 *
 *   <Controller
 *     control={form.control}
 *     name="name"
 *     rules={{ required: "Bitte gib einen Namen ein." }}
 *     render={({ field, fieldState }) => (
 *       <Field name={field.name} invalid={fieldState.invalid} touched={fieldState.isTouched} dirty={fieldState.isDirty}>
 *         <FieldLabel>Name</FieldLabel>
 *         <Input ref={field.ref} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} />
 *         <FieldError match={!!fieldState.error}>{fieldState.error?.message}</FieldError>
 *       </Field>
 *     )}
 *   />
 */

/** `react-hook-form`'s `FormProvider`: spread the `useForm()` result into it (`<Form {...form}>`). */
export const Form = FormProvider;

interface FormFieldContextValue {
  name: string;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

export type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
> = ControllerProps<TFieldValues, TName, TTransformedValues>;

/**
 * react-hook-form's `Controller` that also tells `FormItem`'s parts which field they belong to.
 * Map `field` onto the control: text inputs take `{...field}`; Checkbox/Switch take
 * `checked={field.value} onCheckedChange={field.onChange}`; Select and NumberField take
 * `value={field.value} onValueChange={field.onChange}`.
 */
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: FormFieldProps<TFieldValues, TName, TTransformedValues>) {
  const value = useMemo(() => ({ name: props.name as string }), [props.name]);
  return (
    <FormFieldContext.Provider value={value}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

type FormItemPart = "description" | "message";

interface FormItemContextValue {
  id: string;
  parts: Record<FormItemPart, boolean>;
  setPart: (part: FormItemPart, present: boolean) => void;
}

const FormItemContext = createContext<FormItemContextValue | null>(null);

/** Tells the item whether a description / message is rendered, so `aria-describedby` only lists real ids. */
function useRegisterPart(part: FormItemPart, present: boolean) {
  const setPart = useContext(FormItemContext)?.setPart;
  useEffect(() => {
    if (!setPart) return;
    setPart(part, present);
    return () => setPart(part, false);
  }, [setPart, part, present]);
}

/**
 * State and ids of the surrounding `FormField` / `FormItem`: `name`, `formItemId`, `formDescriptionId`,
 * `formMessageId`, plus react-hook-form's field state (`invalid`, `error`, `isDirty`, `isTouched` …).
 */
export function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext?.name });

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const id = itemContext?.id ?? `form-${fieldContext.name.replace(/[^\w-]/g, "-")}`;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    hasDescription: itemContext?.parts.description ?? false,
    hasMessage: itemContext?.parts.message ?? false,
    ...fieldState,
  };
}

export interface FormItemProps extends HTMLAttributes<HTMLDivElement> {
  /** `horizontal` puts control and label side by side (Checkbox, Switch). */
  orientation?: "vertical" | "horizontal";
}

/** Layout wrapper for one field (label, control, description, message); provides the ids that link them. */
export const FormItem = forwardRef<HTMLDivElement, FormItemProps>(function FormItem(
  { className, orientation = "vertical", ...props },
  ref,
) {
  const id = useId();
  const [parts, setParts] = useState<Record<FormItemPart, boolean>>({ description: false, message: false });
  const setPart = useCallback((part: FormItemPart, present: boolean) => {
    setParts((prev) => (prev[part] === present ? prev : { ...prev, [part]: present }));
  }, []);
  const value = useMemo(() => ({ id, parts, setPart }), [id, parts, setPart]);

  return (
    <FormItemContext.Provider value={value}>
      <div
        ref={ref}
        data-slot="form-item"
        data-orientation={orientation}
        className={cn(
          "flex",
          orientation === "horizontal" ? "flex-row items-center gap-3" : "flex-col gap-1.5",
          className,
        )}
        {...props}
      />
    </FormItemContext.Provider>
  );
});

export type FormLabelProps = ComponentPropsWithoutRef<typeof Label>;

/** Field label linked to the `FormControl`; turns negative while the field has an error. */
export const FormLabel = forwardRef<ComponentRef<typeof Label>, FormLabelProps>(function FormLabel(
  { className, ...props },
  ref,
) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      ref={ref}
      data-slot="form-label"
      data-error={!!error}
      data-invalid={error ? "" : undefined}
      htmlFor={formItemId}
      // Attribute variant, so a text colour in `className` (e.g. a checkbox label) does not drop the error colour.
      className={cn("data-[error=true]:text-pui-negative", className)}
      {...props}
    />
  );
});

type AnyProps = Record<string, unknown>;

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

/** Reads a child element's ref (a prop since React 19, a field on the element before). */
function getElementRef(element: ReactElement): Ref<unknown> | undefined {
  if (Number.parseInt(reactVersion, 10) >= 19) return (element.props as AnyProps).ref as Ref<unknown>;
  return (element as unknown as { ref?: Ref<unknown> }).ref;
}

function joinIds(...ids: unknown[]): string | undefined {
  const joined = ids.filter((id) => typeof id === "string" && id.length > 0).join(" ");
  return joined || undefined;
}

export interface FormControlProps extends HTMLAttributes<HTMLElement> {
  /** The control, as the only child (shadcn style) … */
  children?: ReactElement;
  /** … or as a Base UI-style `render` element. */
  render?: ReactElement;
}

/**
 * Slot that wires the child control to the field: `id` (so `FormLabel` points at it), `aria-describedby`
 * (description + message), and `aria-invalid` + `data-invalid` while the field has an error.
 *
 * `data-invalid` matters because preUI's controls are Base UI parts whose invalid style is
 * `data-[invalid]:border-pui-negative`, and Base UI only sets that attribute inside a `Field` – so the
 * slot sets it itself. Works with Input, Textarea, SelectTrigger, Checkbox, Switch, RadioGroup and
 * NumberField (for NumberField the ARIA attributes go to its inner `<input>` via `inputProps`).
 */
export const FormControl = forwardRef<HTMLElement, FormControlProps>(function FormControl(
  { children, render, ...slotProps },
  ref,
) {
  const { error, formItemId, formDescriptionId, formMessageId, hasDescription, hasMessage } = useFormField();
  const child = render ?? children;
  if (!isValidElement(child)) return null;

  const childProps = child.props as AnyProps;
  const invalid = !!error;
  const describedBy = joinIds(
    childProps["aria-describedby"] ?? slotProps["aria-describedby"],
    hasDescription && formDescriptionId,
    hasMessage && formMessageId,
  );
  const aria: AnyProps = {
    "aria-describedby": describedBy,
    "aria-invalid": invalid ? true : childProps["aria-invalid"],
  };

  const merged: AnyProps = {
    ...slotProps,
    ...childProps,
    id: childProps.id ?? slotProps.id ?? formItemId,
    "data-invalid": invalid ? "" : childProps["data-invalid"],
  };

  if (child.type === NumberField) {
    // The root is a <div>; `id` is forwarded to the inner input by Base UI, ARIA goes there too.
    const inputProps = (childProps.inputProps ?? {}) as AnyProps;
    merged.inputProps = {
      ...inputProps,
      "aria-describedby": joinIds(inputProps["aria-describedby"], aria["aria-describedby"]),
      "aria-invalid": invalid ? true : inputProps["aria-invalid"],
    };
    delete merged["aria-describedby"];
  } else {
    Object.assign(merged, aria);
  }

  if (ref) merged.ref = mergeRefs(ref, getElementRef(child));

  return cloneElement(child, merged);
});

export type FormDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/** Muted hint below the control; referenced by the control's `aria-describedby`. */
export const FormDescription = forwardRef<HTMLParagraphElement, FormDescriptionProps>(function FormDescription(
  { className, ...props },
  ref,
) {
  const { formDescriptionId } = useFormField();
  useRegisterPart("description", true);
  return (
    <p
      ref={ref}
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-xs text-pui-muted-foreground", className)}
      {...props}
    />
  );
});

export type FormMessageProps = HTMLAttributes<HTMLParagraphElement>;

/** The field's error message (or `children` when there is no error); renders nothing when both are empty. */
export const FormMessage = forwardRef<HTMLParagraphElement, FormMessageProps>(function FormMessage(
  { className, children, ...props },
  ref,
) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "") : children;
  const hasBody = body != null && body !== false && body !== "";
  useRegisterPart("message", hasBody);

  if (!hasBody) return null;

  return (
    <p
      ref={ref}
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-xs text-pui-negative", className)}
      {...props}
    >
      {body}
    </p>
  );
});
