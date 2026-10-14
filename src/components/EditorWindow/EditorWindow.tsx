import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type ReactNode,
  type Ref,
} from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";
import { Badge } from "../Badge/Badge";
import { Button, type ButtonProps } from "../Button/Button";
import { Field, FieldDescription, FieldError, FieldLabel } from "../Field/Field";
import { Input, type InputSize } from "../Input/Input";
import { Item, ItemContent, ItemMedia } from "../Item/Item";
import { Kbd, KbdGroup } from "../Kbd/Kbd";
import { ScrollArea, type ScrollAreaProps } from "../ScrollArea/ScrollArea";
import { Textarea } from "../Textarea/Textarea";
import { WithTooltip, type IconTooltip } from "../Tooltip/IconTooltip";
import type { DraftHistory } from "./use-draft-history";

// ---------------------------------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------------------------------

/** Visible and screen-reader texts of the editor parts (English defaults). Set them once on `EditorWindow`. */
export interface EditorWindowLabels {
  /** Badge next to the title while the draft has unsaved changes. */
  unsaved: string;
  /** Screen-reader text of the unsaved marker of a list row. */
  unsavedChanges: string;
  /** Status text while nothing is unsaved. */
  saved: string;
  undo: string;
  redo: string;
  /** Tooltip of the undo button, with the label of the step it takes back. */
  undoStep: (step: string) => string;
  redoStep: (step: string) => string;
  nothingToUndo: string;
  nothingToRedo: string;
  /** Key caps shown in the undo / redo tooltip; `[]` hides them. */
  undoKeys: string[];
  redoKeys: string[];
  save: string;
  delete: string;
  discard: string;
  close: string;
  /** Screen-reader text of a length counter, e.g. "12 of 40 characters". */
  characterCount: (length: number, max: number) => string;
}

export const defaultEditorWindowLabels: EditorWindowLabels = {
  unsaved: "Unsaved",
  unsavedChanges: "Unsaved changes",
  saved: "All changes saved",
  undo: "Undo",
  redo: "Redo",
  undoStep: (step) => `Undo: ${step}`,
  redoStep: (step) => `Redo: ${step}`,
  nothingToUndo: "Nothing to undo",
  nothingToRedo: "Nothing to redo",
  undoKeys: ["Ctrl", "Z"],
  redoKeys: ["Ctrl", "Y"],
  save: "Save",
  delete: "Delete",
  discard: "Discard",
  close: "Close",
  characterCount: (length, max) => `${length} of ${max} characters`,
};

const EditorLabelsContext = /* @__PURE__ */ createContext<Partial<EditorWindowLabels> | undefined>(undefined);

function useEditorLabels(own?: Partial<EditorWindowLabels>): EditorWindowLabels {
  const inherited = useContext(EditorLabelsContext);
  return { ...defaultEditorWindowLabels, ...inherited, ...own };
}

/** Keeps the element's space but hides it, so nothing around it moves when it comes and goes. */
const keepSpace = (hidden: boolean | undefined) => hidden && "invisible";

// ---------------------------------------------------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------------------------------------------------

export interface EditorWindowProps extends ComponentPropsWithoutRef<"div"> {
  /** Texts of every part inside (the parts' own `labels` win). */
  labels?: Partial<EditorWindowLabels>;
}

/**
 * Master-detail editor window: an `EditorList` on the left, an `EditorDetail` (header + content) on the right.
 * Fixed size by default (at most 80rem × 48rem, 2rem off the viewport edges), so switching entries never resizes it;
 * override with `className` (e.g. `h-full w-full` to fill a parent).
 */
export const EditorWindow = /* @__PURE__ */ forwardRef<HTMLDivElement, EditorWindowProps>(function EditorWindow(
  { className, labels, ...props },
  ref,
) {
  const inherited = useContext(EditorLabelsContext);
  const value = useMemo(() => ({ ...inherited, ...labels }), [inherited, labels]);
  return (
    <EditorLabelsContext.Provider value={value}>
      <div
        ref={ref}
        data-slot="editor-window"
        className={cn(
          "flex overflow-hidden rounded-pui-window border border-pui-border bg-pui-shell text-pui-foreground shadow-pui-window",
          "h-[min(48rem,calc(var(--pui-viewport-height,100vh)-4rem))] w-[min(80rem,calc(100vw-4rem))]",
          className,
        )}
        {...props}
      />
    </EditorLabelsContext.Provider>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------------------------------------------------

export type EditorListProps = ComponentPropsWithoutRef<"aside">;

/** The left column: `EditorListHeader` and `EditorListContent`. */
export const EditorList = /* @__PURE__ */ forwardRef<HTMLElement, EditorListProps>(function EditorList({ className, ...props }, ref) {
  return (
    <aside
      ref={ref}
      data-slot="editor-list"
      className={cn("flex w-64 shrink-0 flex-col border-r border-pui-border bg-pui-background", className)}
      {...props}
    />
  );
});

export type EditorListHeaderProps = ComponentPropsWithoutRef<"div">;

/** Title row of the list: `EditorListTitle` and an `EditorListAdd` button. Same height as `EditorHeader`. */
export const EditorListHeader = /* @__PURE__ */ forwardRef<HTMLDivElement, EditorListHeaderProps>(function EditorListHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="editor-list-header"
      className={cn("flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-pui-border px-4 py-2", className)}
      {...props}
    />
  );
});

export type EditorListTitleProps = ComponentPropsWithoutRef<"h2">;

export const EditorListTitle = /* @__PURE__ */ forwardRef<HTMLHeadingElement, EditorListTitleProps>(function EditorListTitle(
  { className, ...props },
  ref,
) {
  return <h2 ref={ref} data-slot="editor-list-title" className={cn("min-w-0 truncate text-base font-semibold", className)} {...props} />;
});

export type EditorListAddProps = ButtonProps;

/** The "add" button of the list header: a small ghost button with a plus icon. Give it a text (`children`). */
export const EditorListAdd = /* @__PURE__ */ forwardRef<HTMLElement, EditorListAddProps>(function EditorListAdd(
  { variant = "ghost", size = "sm", leftIcon, ...props },
  ref,
) {
  const Plus = useIcon("plus");
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      leftIcon={leftIcon ?? <Plus aria-hidden="true" />}
      data-slot="editor-list-add"
      {...props}
    />
  );
});

export type EditorListContentProps = ScrollAreaProps;

/** The scrolling rows: `EditorListGroup`s or `EditorListItem`s directly. */
export const EditorListContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof ScrollArea>, EditorListContentProps>(
  function EditorListContent({ className, contentClassName, ...props }, ref) {
    return (
      <ScrollArea
        ref={ref}
        data-slot="editor-list-content"
        className={mergeClassName("min-h-0 flex-1", className)}
        contentClassName={cn("flex flex-col gap-1 p-2", contentClassName)}
        {...props}
      />
    );
  },
);

export interface EditorListGroupProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  /** Heading above the rows (e.g. "Branches"); without it the group has no heading (e.g. fixed rows on top). */
  label?: ReactNode;
}

/** A group of rows with an optional heading. Fixed rows that aren't entries (settings, a log) go in their own group. */
export const EditorListGroup = /* @__PURE__ */ forwardRef<HTMLDivElement, EditorListGroupProps>(function EditorListGroup(
  { className, label, children, ...props },
  ref,
) {
  const labelId = useId();
  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={label != null ? labelId : undefined}
      data-slot="editor-list-group"
      className={cn("flex flex-col gap-1 [&+&]:mt-2", className)}
      {...props}
    >
      {label != null && (
        <div
          id={labelId}
          data-slot="editor-list-label"
          className="px-2 pb-1 pt-2 text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground"
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
});

export interface EditorListItemProps extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  /** Name of the entry. */
  label: ReactNode;
  /** One short line under the name (e.g. "Self-service · 12 products"). */
  summary?: ReactNode;
  /** The entry shown in the editor (`aria-current`). */
  selected?: boolean;
  /** Shows the unsaved marker. Its space is always reserved, so the row never shifts. */
  dirty?: boolean;
  /** Dims the name, e.g. for a switched-off entry. */
  muted?: boolean;
  /** Icon before the text, e.g. for fixed rows like settings or a log. */
  icon?: ReactNode;
  labels?: Partial<Pick<EditorWindowLabels, "unsavedChanges">>;
}

/** One row of the list: name, summary and the unsaved marker. A `<button>`. */
export const EditorListItem = /* @__PURE__ */ forwardRef<HTMLButtonElement, EditorListItemProps>(function EditorListItem(
  { className, label, summary, selected = false, dirty = false, muted = false, icon, labels: ownLabels, type = "button", ...props },
  ref,
) {
  const labels = useEditorLabels(ownLabels);
  return (
    <Item
      ref={ref as Ref<HTMLDivElement>}
      size="sm"
      render={<button type={type} />}
      aria-current={selected ? "true" : undefined}
      data-slot="editor-list-item"
      data-selected={selected ? "" : undefined}
      data-dirty={dirty ? "" : undefined}
      data-muted={muted ? "" : undefined}
      className={cn(
        "w-full flex-nowrap gap-2.5 rounded-pui-md px-2 py-2",
        "data-[selected]:bg-pui-accent data-[selected]:text-pui-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...(props as ComponentPropsWithoutRef<"div">)}
    >
      {icon != null && (
        <ItemMedia className="text-pui-muted-foreground [&_svg:not([class*='size-'])]:size-4">{icon}</ItemMedia>
      )}
      <ItemContent className="gap-0">
        <span
          data-slot="editor-list-item-label"
          className={cn("truncate text-sm font-medium", muted && "text-pui-muted-foreground")}
        >
          {label}
        </span>
        {summary != null && (
          <span data-slot="editor-list-item-summary" className="truncate text-xs text-pui-muted-foreground">
            {summary}
          </span>
        )}
      </ItemContent>
      <span
        data-slot="editor-list-item-marker"
        aria-hidden="true"
        className={cn("size-2 shrink-0 rounded-full bg-pui-warning", !dirty && "invisible")}
      />
      {dirty && <span className="sr-only">{labels.unsavedChanges}</span>}
    </Item>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------------------------------------------------

export type EditorDetailProps = ComponentPropsWithoutRef<"section">;

/** The right side: `EditorHeader`, optional tabs, and `EditorContent` (or an `Empty` when nothing is selected). */
export const EditorDetail = /* @__PURE__ */ forwardRef<HTMLElement, EditorDetailProps>(function EditorDetail({ className, ...props }, ref) {
  return <section ref={ref} data-slot="editor-detail" className={cn("flex min-w-0 flex-1 flex-col", className)} {...props} />;
});

export interface EditorHeaderProps extends Omit<ComponentPropsWithoutRef<"header">, "title"> {
  /** Name of the entry being edited. */
  title?: ReactNode;
  /** Shows the "Unsaved" badge next to the title (its space is always reserved). */
  dirty?: boolean;
  /** Why it can't be saved yet ("Needs a name"): shown in the status place in the warning colour. */
  problem?: ReactNode;
  /**
   * The status text, shown while nothing is unsaved or a `problem` is set. Defaults to `labels.saved`;
   * `false` leaves the status out (e.g. for a read-only page like a log).
   */
  status?: ReactNode | false;
  /** Buttons on the right: `EditorUndoButton`, `EditorRedoButton`, `EditorDeleteButton`, `EditorSaveButton` … */
  actions?: ReactNode;
  /** Content between the title and the status, e.g. an "Enabled" switch. */
  children?: ReactNode;
  labels?: Partial<Pick<EditorWindowLabels, "unsaved" | "saved">>;
}

/**
 * Header of the detail side: title, unsaved badge, a status text in a fixed place and the action buttons. Badge and
 * status keep their space while hidden, and hidden buttons (`hidden` on the button parts) too, so nothing moves.
 */
export const EditorHeader = /* @__PURE__ */ forwardRef<HTMLElement, EditorHeaderProps>(function EditorHeader(
  { className, title, dirty = false, problem, status, actions, children, labels: ownLabels, ...props },
  ref,
) {
  const labels = useEditorLabels(ownLabels);
  const hasProblem = problem != null && problem !== false;
  const statusText = hasProblem ? problem : status === undefined ? labels.saved : status;
  const showStatus = status !== false || hasProblem;
  return (
    <header
      ref={ref}
      data-slot="editor-header"
      data-dirty={dirty ? "" : undefined}
      className={cn("flex min-h-14 shrink-0 items-center gap-3 border-b border-pui-border px-6 py-2", className)}
      {...props}
    >
      {/* Space goes to the title first (up to half the header), then to the buttons; only the status text truncates. */}
      <div className="flex min-w-0 max-w-[50%] shrink-0 items-center gap-2">
        <h2 data-slot="editor-title" className="min-w-0 truncate text-base font-semibold">
          {title}
        </h2>
        <Badge variant="warning" data-slot="editor-unsaved-badge" className={cn("shrink-0", keepSpace(!dirty))}>
          {labels.unsaved}
        </Badge>
      </div>
      {children != null && (
        <div data-slot="editor-header-content" className="flex shrink-0 items-center gap-2">
          {children}
        </div>
      )}
      <div data-slot="editor-header-actions" className="ml-auto flex min-w-0 items-center gap-2">
        {showStatus && (
          <span
            role="status"
            data-slot="editor-status"
            data-problem={hasProblem ? "" : undefined}
            title={typeof statusText === "string" ? statusText : undefined}
            className={cn(
              "min-w-0 truncate text-xs",
              hasProblem ? "text-pui-warning" : "text-pui-muted-foreground",
              keepSpace(!hasProblem && dirty),
            )}
          >
            {statusText}
          </span>
        )}
        {actions}
      </div>
    </header>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// Header buttons
// ---------------------------------------------------------------------------------------------------------------------

interface HiddenProp {
  /** Hides the button but keeps its space, so the buttons next to it don't move. */
  hidden?: boolean;
}

export interface EditorHistoryButtonProps extends Omit<ButtonProps, "children">, HiddenProp {
  /** Wires the button to `useDraftHistory`: enabled state, step label, click and the busy state. */
  history?: Pick<DraftHistory<unknown, unknown>, "canUndo" | "canRedo" | "undoLabel" | "redoLabel" | "undo" | "redo" | "busy">;
  /** Label of the step the button takes back / repeats (without `history`). */
  step?: string;
  /** Only the icon (the text is the `aria-label`). Undo: `false`, redo: `true` by default. */
  iconOnly?: boolean;
  /**
   * Tooltip: `false` = none, a string or node = other text, an options object = text plus
   * `side` / `align` / `delay`. Default: the step text ("Undo: Name changed") with the shortcut keys.
   */
  tooltip?: IconTooltip;
  labels?: Partial<EditorWindowLabels>;
}

function HistoryButton({
  direction,
  history,
  step: stepProp,
  iconOnly,
  hidden,
  tooltip,
  labels: ownLabels,
  disabled,
  onClick,
  className,
  buttonRef,
  ...props
}: EditorHistoryButtonProps & { direction: "undo" | "redo"; buttonRef: Ref<HTMLElement> }) {
  const labels = useEditorLabels(ownLabels);
  const Icon = useIcon(direction);
  const undo = direction === "undo";
  const step = stepProp ?? (undo ? history?.undoLabel : history?.redoLabel);
  const available = history ? (undo ? history.canUndo : history.canRedo) : step !== undefined;
  const text = undo ? labels.undo : labels.redo;
  const tip = step !== undefined ? (undo ? labels.undoStep(step) : labels.redoStep(step)) : undo ? labels.nothingToUndo : labels.nothingToRedo;
  const keys = undo ? labels.undoKeys : labels.redoKeys;
  return (
    <WithTooltip
      tooltip={tooltip}
      className="flex items-center gap-2"
      label={
        <>
          <span>{tip}</span>
          {keys.length > 0 && (
            <KbdGroup>
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </KbdGroup>
          )}
        </>
      }
    >
      <Button
        ref={buttonRef}
        variant="ghost"
        size={iconOnly ? "icon-sm" : "sm"}
        leftIcon={iconOnly ? undefined : <Icon aria-hidden="true" />}
        aria-label={iconOnly ? text : undefined}
        data-slot={undo ? "editor-undo" : "editor-redo"}
        disabled={disabled ?? (!available || history?.busy === true)}
        className={cn(keepSpace(hidden), className)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented && history) void (undo ? history.undo() : history.redo());
        }}
        {...props}
      >
        {iconOnly ? <Icon aria-hidden="true" /> : text}
      </Button>
    </WithTooltip>
  );
}

/** Undo button with a tooltip naming the step ("Undo: Name changed") and the shortcut. */
export const EditorUndoButton = /* @__PURE__ */ forwardRef<HTMLElement, EditorHistoryButtonProps>(function EditorUndoButton(
  { iconOnly = false, ...props },
  ref,
) {
  return <HistoryButton direction="undo" iconOnly={iconOnly} buttonRef={ref} {...props} />;
});

/** Redo button (icon only by default) with a tooltip naming the step and the shortcut. */
export const EditorRedoButton = /* @__PURE__ */ forwardRef<HTMLElement, EditorHistoryButtonProps>(function EditorRedoButton(
  { iconOnly = true, ...props },
  ref,
) {
  return <HistoryButton direction="redo" iconOnly={iconOnly} buttonRef={ref} {...props} />;
});

export interface EditorActionButtonProps extends ButtonProps, HiddenProp {
  /** Icon before the text (preUI has no save / delete icon; pass your own, e.g. from lucide). */
  icon?: ReactNode;
  /**
   * Only the `icon` (the text becomes the `aria-label` and the tooltip); needs an `icon`.
   * The size changes to the square `icon-sm` unless a `size` is given. @default false
   */
  iconOnly?: boolean;
  /**
   * Tooltip: `false` = none, a string or node = other text, an options object = text plus
   * `side` / `align` / `delay`. Default: the button text while `iconOnly`, otherwise none.
   */
  tooltip?: IconTooltip;
  labels?: Partial<EditorWindowLabels>;
}

function actionButton(slot: string, label: "save" | "delete" | "discard", defaults: Pick<ButtonProps, "variant">) {
  return function ActionButton(
    {
      hidden,
      icon,
      iconOnly = false,
      tooltip,
      labels: ownLabels,
      children,
      className,
      variant,
      size,
      ...props
    }: EditorActionButtonProps,
    ref: Ref<HTMLElement>,
  ) {
    const labels = useEditorLabels(ownLabels);
    const text = children ?? labels[label];
    // Without an icon there would be nothing left to see, so the text stays.
    const onlyIcon = iconOnly && icon != null;
    return (
      <WithTooltip tooltip={tooltip ?? onlyIcon} label={text}>
        <Button
          ref={ref}
          variant={variant ?? defaults.variant}
          size={size ?? (onlyIcon ? "icon-sm" : "sm")}
          leftIcon={onlyIcon ? undefined : icon}
          aria-label={onlyIcon && typeof text === "string" ? text : undefined}
          data-slot={slot}
          className={cn(keepSpace(hidden), className)}
          {...props}
        >
          {onlyIcon ? icon : text}
        </Button>
      </WithTooltip>
    );
  };
}

/** The save button (tinted primary). `loading` keeps its width. */
export const EditorSaveButton = /* @__PURE__ */ forwardRef<HTMLElement, EditorActionButtonProps>(
  /* @__PURE__ */ actionButton("editor-save", "save", { variant: "default" }),
);

/** The delete button (ghost). Ask first, e.g. with `ConfirmDialog`. Use `hidden` for entries that aren't saved yet. */
export const EditorDeleteButton = /* @__PURE__ */ forwardRef<HTMLElement, EditorActionButtonProps>(
  /* @__PURE__ */ actionButton("editor-delete", "delete", { variant: "ghost" }),
);

/** The discard button (ghost), e.g. wired to `history.discard`. */
export const EditorDiscardButton = /* @__PURE__ */ forwardRef<HTMLElement, EditorActionButtonProps>(
  /* @__PURE__ */ actionButton("editor-discard", "discard", { variant: "ghost" }),
);

export interface EditorCloseButtonProps extends Omit<ButtonProps, "children">, HiddenProp {
  /**
   * Tooltip: `false` = none, a string or node = other text, an options object = text plus
   * `side` / `align` / `delay`. Default: `labels.close`.
   */
  tooltip?: IconTooltip;
  labels?: Partial<Pick<EditorWindowLabels, "close">>;
}

/**
 * The close X of the window (`aria-label` and tooltip from `labels.close`).
 * Ask first with `history.request(onClose)`.
 */
export const EditorCloseButton = /* @__PURE__ */ forwardRef<HTMLElement, EditorCloseButtonProps>(function EditorCloseButton(
  { hidden, tooltip, labels: ownLabels, className, variant = "ghost", size = "icon-sm", ...props },
  ref,
) {
  const labels = useEditorLabels(ownLabels);
  const Close = useIcon("close");
  return (
    <WithTooltip tooltip={tooltip} label={labels.close}>
      <Button
        ref={ref}
        variant={variant}
        size={size}
        aria-label={labels.close}
        data-slot="editor-close"
        className={cn(keepSpace(hidden), className)}
        {...props}
      >
        <Close aria-hidden="true" />
      </Button>
    </WithTooltip>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------------------------------------------------

export type EditorContentProps = ScrollAreaProps;

/**
 * The scrolling form area under the header. Give it a `key` per entry (and tab) so it starts at the top when the
 * entry changes.
 */
export const EditorContent = /* @__PURE__ */ forwardRef<ComponentRef<typeof ScrollArea>, EditorContentProps>(function EditorContent(
  { className, contentClassName, ...props },
  ref,
) {
  return (
    <ScrollArea
      ref={ref}
      data-slot="editor-content"
      className={mergeClassName("min-h-0 flex-1", className)}
      contentClassName={cn("flex flex-col gap-4 px-6 py-4", contentClassName)}
      {...props}
    />
  );
});

export interface EditorSectionProps extends Omit<ComponentPropsWithoutRef<"section">, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  /** Element at the right of the title, e.g. a small button or a switch. */
  action?: ReactNode;
}

/** A framed group of fields with a title, an optional description and an action on the right. */
export const EditorSection = /* @__PURE__ */ forwardRef<HTMLElement, EditorSectionProps>(function EditorSection(
  { className, title, description, action, children, ...props },
  ref,
) {
  const titleId = useId();
  const hasHead = title != null || description != null || action != null;
  return (
    <section
      ref={ref}
      aria-labelledby={title != null ? titleId : undefined}
      data-slot="editor-section"
      className={cn("flex flex-col gap-3 rounded-pui border border-pui-border p-3", className)}
      {...props}
    >
      {hasHead && (
        <div data-slot="editor-section-header" className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title != null && (
              <h3 id={titleId} data-slot="editor-section-title" className="text-sm font-medium">
                {title}
              </h3>
            )}
            {description != null && (
              <p data-slot="editor-section-description" className="text-xs text-pui-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action != null && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// Text field with a length counter
// ---------------------------------------------------------------------------------------------------------------------

/** Length as the user sees it: emoji and other astral characters count once. */
const characterLength = (value: string) => Array.from(value).length;

export interface EditorFieldCounterProps extends Omit<ComponentPropsWithoutRef<"p">, "children"> {
  /** The text being counted. */
  value: string;
  max: number;
  labels?: Partial<Pick<EditorWindowLabels, "characterCount">>;
}

/**
 * Live length counter "12/40" — turns the warning colour at the limit and the negative colour beyond it. Inside a
 * `Field` it is the field's description, so screen readers read "12 of 40 characters" with the input.
 */
export const EditorFieldCounter = /* @__PURE__ */ forwardRef<HTMLParagraphElement, EditorFieldCounterProps>(function EditorFieldCounter(
  { value, max, className, labels: ownLabels, ...props },
  ref,
) {
  const labels = useEditorLabels(ownLabels);
  const length = characterLength(value);
  const state = length > max ? "over" : length === max ? "full" : undefined;
  return (
    <FieldDescription
      ref={ref}
      data-slot="editor-field-counter"
      data-state={state}
      className={cn(
        "shrink-0 tabular-nums",
        state === "full" && "text-pui-warning",
        state === "over" && "text-pui-negative",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">
        {length}/{max}
      </span>
      <span className="sr-only">{labels.characterCount(length, max)}</span>
    </FieldDescription>
  );
});

export interface EditorTextFieldProps extends Omit<ComponentPropsWithoutRef<typeof Field>, "children" | "onChange"> {
  label: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  /** Limits the input and shows the live counter. */
  maxLength?: number;
  description?: ReactNode;
  /** Error text under the field; also marks the field invalid. */
  error?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** A `Textarea` instead of an `Input`. */
  multiline?: boolean;
  /** Rows of the textarea. */
  rows?: number;
  /** Input size. @default "sm" */
  size?: InputSize;
  /** @default "off" */
  autoComplete?: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLInputElement | HTMLTextAreaElement>;
  labels?: Partial<Pick<EditorWindowLabels, "characterCount">>;
}

/** Label, input and a live length counter in one `Field` — the usual name / text field of an editor form. */
export const EditorTextField = /* @__PURE__ */ forwardRef<ComponentRef<typeof Field>, EditorTextFieldProps>(function EditorTextField(
  {
    label,
    value,
    onValueChange,
    maxLength,
    description,
    error,
    placeholder,
    disabled,
    readOnly,
    multiline = false,
    rows,
    size = "sm",
    autoComplete = "off",
    inputClassName,
    inputRef,
    labels,
    invalid,
    ...props
  },
  ref,
) {
  const hasError = error != null && error !== false;
  const control = {
    value,
    maxLength,
    placeholder,
    disabled,
    readOnly,
    autoComplete,
    onChange: (event: { target: { value: string } }) => onValueChange(event.target.value),
  };
  return (
    <Field ref={ref} data-slot="editor-text-field" invalid={invalid ?? (hasError || undefined)} disabled={disabled} {...props}>
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
        {maxLength !== undefined && <EditorFieldCounter value={value} max={maxLength} labels={labels} />}
      </div>
      {multiline ? (
        <Textarea ref={inputRef as Ref<HTMLTextAreaElement>} rows={rows} className={inputClassName} {...control} />
      ) : (
        <Input ref={inputRef as Ref<HTMLInputElement>} size={size} className={inputClassName} {...control} />
      )}
      {description != null && <FieldDescription>{description}</FieldDescription>}
      {hasError && <FieldError match>{error}</FieldError>}
    </Field>
  );
});
