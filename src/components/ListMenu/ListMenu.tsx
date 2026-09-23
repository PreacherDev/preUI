import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import {
  useListNavigation,
  type ListNavigationFocusMode,
  type ListNavigationKeyboardTarget,
  type ListNavigationKeys,
  type ListNavigationOrientation,
  type ListNavigationRole,
  type ListNavigationSource,
  type UseListNavigationReturn,
} from "./use-list-navigation";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ------------------------------------------------------------------------------------------------
 * Context
 * ----------------------------------------------------------------------------------------------*/

interface ItemRecord {
  disabled: boolean;
  textValue?: string;
  onSelect?: () => void;
}

interface ListMenuContextValue {
  nav: UseListNavigationReturn;
  values: string[];
  highlightedValue: string | undefined;
  register: (value: string, record: ItemRecord) => () => void;
  update: (value: string, record: ItemRecord) => void;
  setListElement: (element: HTMLElement | null) => void;
  size: ListMenuSize;
}

const ListMenuContext = /* @__PURE__ */ createContext<ListMenuContextValue | null>(null);

function useListMenuContext(part: string) {
  const context = useContext(ListMenuContext);
  if (!context) throw new Error(`<${part}> must be used inside <ListMenu>.`);
  return context;
}

export interface ListMenuState {
  /** Value of the highlighted item (`undefined` when none). */
  highlightedValue: string | undefined;
  /** Index of the highlighted item among the enabled and disabled items, `-1` when none. */
  highlightedIndex: number;
  /** Number of items. */
  count: number;
  /** Highlights an item by value (e.g. from a button in the footer). */
  highlight: (value: string) => void;
}

/** Reads the menu's state inside `<ListMenu>`, e.g. for a "3/8" position in `ListMenuFooter`. */
export function useListMenu(): ListMenuState {
  const { nav, values, highlightedValue } = useListMenuContext("useListMenu");
  const highlight = useCallback(
    (value: string) => {
      const index = values.indexOf(value);
      if (index >= 0) nav.setActiveIndex(index, "programmatic");
    },
    [nav, values],
  );
  return { highlightedValue, highlightedIndex: nav.activeIndex, count: values.length, highlight };
}

/* ------------------------------------------------------------------------------------------------
 * ListMenu (root panel)
 * ----------------------------------------------------------------------------------------------*/

export type ListMenuSize = "default" | "lg";

export interface ListMenuProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  /** Controlled highlighted item (its `value`). */
  highlightedValue?: string;
  /** Initially highlighted item when uncontrolled. Default: the first enabled item. */
  defaultHighlightedValue?: string;
  onHighlightedValueChange?: (value: string | undefined, source: ListNavigationSource) => void;
  /** Called with the item's value after the item's own `onSelect`. */
  onSelect?: (value: string) => void;
  /** Backspace (and ← in a vertical list). Only handled when set. */
  onBack?: () => void;
  /** Escape. Only handled when set. */
  onClose?: () => void;
  /** Override the keys for select / back / close. */
  keys?: ListNavigationKeys;
  /** `"list"` (default) needs focus on `ListMenuContent`; `"window"` listens on `window` (FiveM NUI). */
  keyboardTarget?: ListNavigationKeyboardTarget;
  /** `false` pauses all key handling (e.g. while a text field in the menu is open). Default `true`. */
  enabled?: boolean;
  /** Wrap around at the ends. Default `true`. */
  loop?: boolean;
  /** `true` (default): disabled items are skipped. `false`: they can be highlighted (to read why) but not selected. */
  skipDisabled?: boolean;
  /** Default `"vertical"`. For `"grid"` set `columns` and lay out `ListMenuContent` as a grid yourself. */
  orientation?: ListNavigationOrientation;
  columns?: number;
  /** Items PageUp/PageDown jump over. Default `10`. */
  pageSize?: number;
  /** Typing letters jumps to items. Default: on for `keyboardTarget="list"`, off for `"window"` (letters are game keys). */
  typeahead?: boolean;
  /** Default `"activedescendant"`. */
  focusMode?: ListNavigationFocusMode;
  /** Scroll the highlighted item into view on keyboard moves. Default `true`. */
  scrollIntoView?: boolean | ScrollIntoViewOptions;
  /** `"menu"` (default, items are `menuitem`s) or `"listbox"` (items are `option`s). */
  role?: ListNavigationRole;
  /** Row size of all items: `"default"` (compact, 16px icon) or `"lg"` (icon tile, two-line rows). */
  size?: ListMenuSize;
}

/**
 * A keyboard-driven list panel for game menus (garage, shop, job menu, third-eye options): header, list, footer.
 * The list itself is `ListMenuContent`; keys go to it when focused, or to `window` with `keyboardTarget="window"`.
 */
export const ListMenu = /* @__PURE__ */ forwardRef<HTMLDivElement, ListMenuProps>(function ListMenu(
  {
    className,
    highlightedValue: highlightedValueProp,
    defaultHighlightedValue,
    onHighlightedValueChange,
    onSelect,
    onBack,
    onClose,
    keys,
    keyboardTarget = "list",
    enabled = true,
    loop = true,
    skipDisabled = true,
    orientation = "vertical",
    columns,
    pageSize,
    typeahead,
    focusMode = "activedescendant",
    scrollIntoView = true,
    role = "menu",
    size = "default",
    children,
    ...props
  },
  ref,
) {
  const records = useRef(new Map<string, ItemRecord>());
  const listElement = useRef<HTMLElement | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((current) => current + 1), []);

  const register = useCallback(
    (value: string, record: ItemRecord) => {
      records.current.set(value, record);
      bump();
      return () => {
        records.current.delete(value);
        bump();
      };
    },
    [bump],
  );
  const update = useCallback((value: string, record: ItemRecord) => {
    const previous = records.current.get(value);
    records.current.set(value, record);
    if (previous && previous.disabled !== record.disabled) bump();
  }, [bump]);

  // Item order = DOM order, read after every render of the menu or an item (un)mount.
  useIsomorphicLayoutEffect(() => {
    const root = listElement.current;
    if (!root) return;
    const next: string[] = [];
    root.querySelectorAll<HTMLElement>("[data-list-menu-value]").forEach((element) => {
      if (element.closest("[data-slot=list-menu-content]") !== root) return;
      const value = element.getAttribute("data-list-menu-value");
      if (value !== null && records.current.has(value)) next.push(value);
    });
    setValues((current) =>
      current.length === next.length && current.every((value, index) => value === next[index]) ? current : next,
    );
  });

  const controlled = highlightedValueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(defaultHighlightedValue);
  const highlightedCandidate = controlled ? highlightedValueProp : uncontrolledValue;
  const isDisabled = useCallback((index: number) => Boolean(records.current.get(values[index])?.disabled), [values]);

  // Falls back to the first reachable item while nothing (or a missing value) is highlighted.
  let fallbackIndex = -1;
  for (let index = 0; index < values.length; index++) {
    if (!skipDisabled || !isDisabled(index)) {
      fallbackIndex = index;
      break;
    }
  }
  const candidateIndex = highlightedCandidate === undefined ? -1 : values.indexOf(highlightedCandidate);
  const activeIndex = candidateIndex >= 0 ? candidateIndex : fallbackIndex;
  const highlightedValue = activeIndex >= 0 ? values[activeIndex] : undefined;

  const latest = useRef({ values, onSelect, onHighlightedValueChange, controlled });
  latest.current = { values, onSelect, onHighlightedValueChange, controlled };

  const nav = useListNavigation({
    count: values.length,
    activeIndex,
    onActiveIndexChange: (index, source) => {
      const value = index >= 0 ? latest.current.values[index] : undefined;
      if (!latest.current.controlled) setUncontrolledValue(value);
      latest.current.onHighlightedValueChange?.(value, source);
    },
    isDisabled,
    skipDisabled,
    loop,
    orientation,
    columns,
    pageSize,
    onSelect: (index) => {
      const value = latest.current.values[index];
      if (value === undefined) return;
      records.current.get(value)?.onSelect?.();
      latest.current.onSelect?.(value);
    },
    onBack,
    onClose,
    keys,
    focusMode,
    keyboardTarget,
    enabled,
    scrollIntoView,
    role,
    typeahead:
      (typeahead ?? keyboardTarget === "list")
        ? (index) => {
            const value = latest.current.values[index];
            const record = value === undefined ? undefined : records.current.get(value);
            if (record?.textValue !== undefined) return record.textValue;
            const element = listElement.current?.ownerDocument.getElementById(nav.getItemId(index));
            const title = element?.querySelector("[data-slot=list-menu-item-title]") ?? element;
            return title?.textContent ?? undefined;
          }
        : undefined,
  });

  const setListElement = useCallback((element: HTMLElement | null) => {
    listElement.current = element;
    if (element) bump();
  }, [bump]);

  const context = useMemo<ListMenuContextValue>(
    () => ({ nav, values, highlightedValue, register, update, setListElement, size }),
    // `version` re-publishes after (un)registering so items re-read their index.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nav, values, highlightedValue, register, update, setListElement, size, version],
  );

  return (
    <ListMenuContext.Provider value={context}>
      <div
        ref={ref}
        data-slot="list-menu"
        data-size={size}
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-pui border border-pui-border bg-pui-card text-sm text-pui-card-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ListMenuContext.Provider>
  );
});

/* ------------------------------------------------------------------------------------------------
 * Header / Footer
 * ----------------------------------------------------------------------------------------------*/

export type ListMenuHeaderProps = ComponentPropsWithoutRef<"div">;

/** Title row above the list (icon, eyebrow, title, badge …). */
export const ListMenuHeader = /* @__PURE__ */ forwardRef<HTMLDivElement, ListMenuHeaderProps>(function ListMenuHeader(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="list-menu-header"
      className={cn("flex shrink-0 items-center gap-3 border-b border-pui-border px-4 py-3", className)}
      {...props}
    />
  );
});

export type ListMenuFooterProps = ComponentPropsWithoutRef<"div">;

/** Row below the list, e.g. a `KeybindHintBar` and the position ("3/8"). */
export const ListMenuFooter = /* @__PURE__ */ forwardRef<HTMLDivElement, ListMenuFooterProps>(function ListMenuFooter(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="list-menu-footer"
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-t border-pui-border bg-pui-muted/40 px-4 py-2.5 text-xs text-pui-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------------------------------------
 * Content (the list)
 * ----------------------------------------------------------------------------------------------*/

export interface ListMenuContentProps extends Omit<useRender.ComponentProps<"div">, "ref"> {
  /** Focus the list when it mounts (keyboard target `"list"`). */
  autoFocus?: boolean;
}

/**
 * The list element (`role="menu"` / `"listbox"`) that holds the items. Wrap it in a `ScrollArea` for long lists;
 * the highlighted item is scrolled into view. Give it an `aria-label` (or `aria-labelledby`).
 */
export const ListMenuContent = /* @__PURE__ */ forwardRef<HTMLDivElement, ListMenuContentProps>(function ListMenuContent(
  { className, render, autoFocus, ...props },
  ref,
) {
  const { nav, setListElement } = useListMenuContext("ListMenuContent");
  const elementRef = useRef<HTMLElement | null>(null);
  const listProps = nav.getListProps({ ...(props as Record<string, unknown>), ref });

  useEffect(() => {
    if (autoFocus) elementRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const ownRef = listProps.ref;
  const combinedRef = useCallback(
    (element: HTMLElement | null) => {
      elementRef.current = element;
      ownRef(element);
      setListElement(element);
    },
    [ownRef, setListElement],
  );

  return useRender({
    defaultTagName: "div",
    render,
    ref: combinedRef,
    props: {
      ...listProps,
      ref: undefined,
      "data-slot": "list-menu-content",
      className: cn("flex flex-col gap-0.5 p-1.5 outline-none", className),
    },
  });
});

/* ------------------------------------------------------------------------------------------------
 * Group / Label / Separator
 * ----------------------------------------------------------------------------------------------*/

const ListMenuGroupContext = /* @__PURE__ */ createContext<{ labelId: string; setHasLabel: (has: boolean) => void } | null>(
  null,
);

export type ListMenuGroupProps = ComponentPropsWithoutRef<"div">;

/** Groups items (`role="group"`), labelled by a `ListMenuLabel` inside it. */
export const ListMenuGroup = /* @__PURE__ */ forwardRef<HTMLDivElement, ListMenuGroupProps>(function ListMenuGroup(
  { className, ...props },
  ref,
) {
  const labelId = useId();
  const [hasLabel, setHasLabel] = useState(false);
  const context = useMemo(() => ({ labelId, setHasLabel }), [labelId]);
  return (
    <ListMenuGroupContext.Provider value={context}>
      <div
        ref={ref}
        role="group"
        aria-labelledby={hasLabel ? labelId : undefined}
        data-slot="list-menu-group"
        className={cn("flex flex-col gap-0.5", className)}
        {...props}
      />
    </ListMenuGroupContext.Provider>
  );
});

export type ListMenuLabelProps = ComponentPropsWithoutRef<"div">;

/** Eyebrow label above a group of items. */
export const ListMenuLabel = /* @__PURE__ */ forwardRef<HTMLDivElement, ListMenuLabelProps>(function ListMenuLabel(
  { className, id, ...props },
  ref,
) {
  const group = useContext(ListMenuGroupContext);
  const setHasLabel = group?.setHasLabel;
  useEffect(() => {
    if (!setHasLabel || id) return;
    setHasLabel(true);
    return () => setHasLabel(false);
  }, [setHasLabel, id]);
  return (
    <div
      ref={ref}
      id={id ?? group?.labelId}
      data-slot="list-menu-label"
      className={cn(
        "select-none px-3 pb-1 pt-2 text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground",
        className,
      )}
      {...props}
    />
  );
});

export type ListMenuSeparatorProps = ComponentPropsWithoutRef<"div">;

export const ListMenuSeparator = /* @__PURE__ */ forwardRef<HTMLDivElement, ListMenuSeparatorProps>(function ListMenuSeparator(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="horizontal"
      data-slot="list-menu-separator"
      className={cn("-mx-1.5 my-1 h-px shrink-0 bg-pui-border", className)}
      {...props}
    />
  );
});

/* ------------------------------------------------------------------------------------------------
 * Item
 * ----------------------------------------------------------------------------------------------*/

export const listMenuItemVariants = /* @__PURE__ */ cva(
  [
    "group/list-menu-item relative flex w-full cursor-pointer select-none items-center text-left text-sm outline-none",
    // Highlight: accent surface + a primary bar on the left edge, readable over any game scene.
    "before:absolute before:left-0 before:w-[3px] before:rounded-full before:bg-transparent",
    "data-[highlighted]:bg-pui-accent data-[highlighted]:text-pui-accent-foreground data-[highlighted]:before:bg-pui-primary",
    "focus-visible:ring-pui focus-visible:ring-inset focus-visible:ring-pui-ring",
    // Disabled rows stay readable (and highlightable with skipDisabled={false}); only their content fades.
    "data-[disabled]:cursor-not-allowed [&[data-disabled]>*]:opacity-50",
  ],
  {
    variants: {
      size: {
        default: "min-h-8 gap-2.5 rounded-pui-sm px-2.5 py-1.5 before:inset-y-1.5",
        lg: "gap-3 rounded-pui-md px-3 py-2.5 before:inset-y-2",
      },
    },
    defaultVariants: { size: "default" },
  },
);

export const listMenuItemIconVariants = /* @__PURE__ */ cva(
  "flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        default:
          "text-pui-muted-foreground group-data-[highlighted]/list-menu-item:text-pui-primary [&_svg:not([class*='size-'])]:size-4",
        lg: [
          "size-9 rounded-pui-md border border-pui-border bg-pui-muted text-pui-muted-foreground [&_svg:not([class*='size-'])]:size-[1.125rem]",
          "group-data-[highlighted]/list-menu-item:border-pui-primary/tint-border group-data-[highlighted]/list-menu-item:bg-pui-primary/tint group-data-[highlighted]/list-menu-item:text-pui-primary",
        ],
      },
    },
    defaultVariants: { size: "default" },
  },
);

export type ListMenuItemSize = NonNullable<VariantProps<typeof listMenuItemVariants>["size"]>;

export interface ListMenuItemProps extends Omit<useRender.ComponentProps<"div">, "ref" | "onSelect"> {
  /** Identifies the item (highlight, `onSelect`). Default: a generated id. */
  value?: string;
  /** Can't be selected; skipped by the keyboard unless the menu has `skipDisabled={false}`. */
  disabled?: boolean;
  /** Enter/Space or a click. */
  onSelect?: () => void;
  /** Icon before the label (16px, or a tile with `size="lg"`). */
  icon?: ReactNode;
  /** Second line under the label. */
  description?: ReactNode;
  /** Right-hand content: a badge, price, count … */
  suffix?: ReactNode;
  /** Shows a chevron and sets `aria-haspopup`: selecting the item opens a sub-menu. */
  submenu?: boolean;
  /** Text for typeahead. Default: the label's text. */
  textValue?: string;
  /** Overrides the menu's `size` for this row. */
  size?: ListMenuItemSize;
}

/** One row of a `ListMenu`. Highlighted rows get `data-highlighted`, disabled rows `data-disabled`. */
export const ListMenuItem = /* @__PURE__ */ forwardRef<HTMLDivElement, ListMenuItemProps>(function ListMenuItem(
  {
    className,
    value: valueProp,
    disabled = false,
    onSelect,
    icon,
    description,
    suffix,
    submenu = false,
    textValue,
    size: sizeProp,
    render,
    children,
    ...props
  },
  ref,
) {
  const context = useListMenuContext("ListMenuItem");
  const generated = useId();
  const value = valueProp ?? generated;
  const size = sizeProp ?? context.size;
  const ChevronRight = useIcon("chevronRight");

  const recordRef = useRef<ItemRecord>({ disabled, textValue, onSelect });
  const { register, update } = context;
  useIsomorphicLayoutEffect(() => register(value, recordRef.current), [register, value]);
  useIsomorphicLayoutEffect(() => {
    const record = { disabled, textValue, onSelect };
    recordRef.current = record;
    update(value, record);
  });

  const index = context.values.indexOf(value);
  const navProps: Record<string, unknown> =
    index >= 0 ? context.nav.getItemProps(index, props as Record<string, unknown>) : { ...props };
  if (index < 0 && disabled) {
    navProps["data-disabled"] = "";
    navProps["aria-disabled"] = true;
  }

  const hasText = description != null && description !== false;
  const content =
    icon != null || hasText || suffix != null || submenu ? (
      <>
        {icon != null && (
          <span
            data-slot="list-menu-item-icon"
            aria-hidden="true"
            className={cn(listMenuItemIconVariants({ size }), hasText && size === "lg" && "self-start")}
          >
            {icon}
          </span>
        )}
        <span data-slot="list-menu-item-content" className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span data-slot="list-menu-item-title" className="truncate font-medium leading-snug">
            {children}
          </span>
          {hasText && (
            <span
              data-slot="list-menu-item-description"
              className="text-xs leading-snug text-pui-muted-foreground group-data-[highlighted]/list-menu-item:text-pui-foreground/80"
            >
              {description}
            </span>
          )}
        </span>
        {suffix != null && (
          <span data-slot="list-menu-item-suffix" className={cn("flex shrink-0 items-center gap-2", hasText && "self-start")}>
            {suffix}
          </span>
        )}
        {submenu && (
          <ChevronRight
            aria-hidden="true"
            data-slot="list-menu-item-chevron"
            className="size-4 shrink-0 text-pui-muted-foreground group-data-[highlighted]/list-menu-item:text-pui-foreground"
          />
        )}
      </>
    ) : (
      children
    );

  return useRender({
    defaultTagName: "div",
    render,
    ref,
    props: {
      ...navProps,
      "aria-haspopup": submenu ? "menu" : navProps["aria-haspopup"],
      "data-slot": "list-menu-item",
      "data-size": size,
      "data-list-menu-value": value,
      className: cn(listMenuItemVariants({ size }), className),
      children: content,
    },
  });
});
