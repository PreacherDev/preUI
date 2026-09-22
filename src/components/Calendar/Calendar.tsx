import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  type ChangeEvent,
  type ComponentProps,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from "react";
import {
  CaptionLabel,
  Day,
  DayPicker,
  DropdownNav,
  Footer,
  getDefaultClassNames,
  Month,
  MonthCaption,
  MonthGrid,
  Months,
  Nav,
  NextMonthButton,
  PreviousMonthButton,
  Week,
  Weekday,
  Weekdays,
  WeekNumberHeader,
  Weeks,
  type ChevronProps,
  type DayButtonProps,
  type DayProps,
  type DropdownProps,
  type RootProps,
  type WeekNumberProps,
  type WeekProps,
} from "react-day-picker";
import { buttonVariants, type ButtonVariant } from "../Button/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Select/Select";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";

export type CalendarProps = ComponentProps<typeof DayPicker> & {
  /** Button variant of the previous/next month buttons. */
  buttonVariant?: ButtonVariant;
};

// DayPicker has no `ref` of its own: the forwarded ref reaches the root element through this context.
const CalendarRefContext = createContext<ForwardedRef<HTMLDivElement>>(null);

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

function CalendarRoot({ className, rootRef, ...props }: RootProps) {
  const forwardedRef = useContext(CalendarRefContext);
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      assignRef(rootRef, node);
      assignRef(forwardedRef, node);
    },
    [rootRef, forwardedRef],
  );
  return <div data-slot="calendar" ref={ref} className={className} {...props} />;
}

/** Wraps one of DayPicker's default components so its element carries `data-slot` (they all spread their props). */
function withSlot<P extends object>(Component: (props: P) => ReactElement, slot: string) {
  function SlotComponent(props: P): ReactElement {
    return <Component data-slot={slot} {...props} />;
  }
  SlotComponent.displayName = `Calendar(${slot})`;
  return SlotComponent;
}

/**
 * Week row. `data-filler`: a week made only of days of the neighbouring month (the trailing filler week of
 * `fixedWeeks`) — set here instead of a CSS `:has()` rule, which Chromium < 105 (e.g. CEF / FiveM) lacks.
 */
function CalendarWeekRow(props: WeekProps): ReactElement {
  const filler = props.week.days.every((day) => day.outside);
  return <Week data-slot="calendar-week" data-filler={filler || undefined} {...props} />;
}

/**
 * Day cell. `data-month-start` / `data-month-end` mark the first / last day of the displayed month, i.e. the cells
 * next to an (unmarked) outside day, so a selected range visually ends at the month edge (no `:has()` needed).
 */
function CalendarDayCell(props: DayProps): ReactElement {
  const { day } = props;
  const { dateLib } = day;
  const monthStart = !day.outside && !dateLib.isSameMonth(dateLib.addDays(day.date, -1), day.displayMonth);
  const monthEnd = !day.outside && !dateLib.isSameMonth(dateLib.addDays(day.date, 1), day.displayMonth);
  return (
    <Day
      data-slot="calendar-day"
      data-month-start={monthStart || undefined}
      data-month-end={monthEnd || undefined}
      {...props}
    />
  );
}

/** `data-slot` on every part: `calendar-month`, `calendar-day`, `calendar-day-button` … */
const slotComponents = {
  Months: withSlot(Months, "calendar-months"),
  Month: withSlot(Month, "calendar-month"),
  Nav: withSlot(Nav, "calendar-nav"),
  PreviousMonthButton: withSlot(PreviousMonthButton, "calendar-previous"),
  NextMonthButton: withSlot(NextMonthButton, "calendar-next"),
  MonthCaption: withSlot(MonthCaption, "calendar-month-caption"),
  CaptionLabel: withSlot(CaptionLabel, "calendar-caption-label"),
  DropdownNav: withSlot(DropdownNav, "calendar-dropdowns"),
  MonthGrid: withSlot(MonthGrid, "calendar-month-grid"),
  Weekdays: withSlot(Weekdays, "calendar-weekdays"),
  Weekday: withSlot(Weekday, "calendar-weekday"),
  WeekNumberHeader: withSlot(WeekNumberHeader, "calendar-week-number-header"),
  Weeks: withSlot(Weeks, "calendar-weeks"),
  Week: CalendarWeekRow,
  Day: CalendarDayCell,
  Footer: withSlot(Footer, "calendar-footer"),
};

/**
 * Month/year dropdown (captionLayout "dropdown") rendered with preUI's Select instead of a native
 * <select>, whose option list the browser draws in the OS style. DayPicker's handler only reads
 * `event.target.value`, so a minimal event object is enough.
 */
function CalendarDropdown({ options = [], value, onChange, disabled, "aria-label": ariaLabel }: DropdownProps) {
  const items = options.map((option) => ({ value: String(option.value), label: option.label }));
  return (
    <Select
      items={items}
      value={value === undefined ? null : String(value)}
      disabled={disabled}
      onValueChange={(next) => {
        if (next == null) return;
        onChange?.({ target: { value: next }, currentTarget: { value: next } } as unknown as ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger size="sm" aria-label={ariaLabel} className="w-auto gap-1.5 px-2.5 font-medium">
        <SelectValue />
      </SelectTrigger>
      {/* Cap the scrolling list (not the popup), otherwise the list overflows the popup surface. */}
      <SelectContent listClassName="max-h-[min(15.375rem,calc(var(--available-height)-0.625rem))]">
        {options.map((option) => (
          <SelectItem key={option.value} value={String(option.value)} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CalendarChevron({ className, orientation, size: _size, disabled: _disabled, ...props }: ChevronProps) {
  const ChevronLeft = useIcon("chevronLeft");
  const ChevronRight = useIcon("chevronRight");
  const ChevronDown = useIcon("chevronDown");
  const Icon = orientation === "left" ? ChevronLeft : orientation === "right" ? ChevronRight : ChevronDown;
  return <Icon data-slot="calendar-chevron" className={cn("size-4", className)} aria-hidden="true" {...props} />;
}

function CalendarWeekNumber({ children, week: _week, ...props }: WeekNumberProps) {
  return (
    <th data-slot="calendar-week-number" {...props}>
      <div className="flex size-[var(--cell-size)] items-center justify-center text-center">{children}</div>
    </th>
  );
}

/**
 * Month calendar built on react-day-picker 10. Accepts every DayPicker prop (`mode`, `selected`, `onSelect`,
 * `locale`, `numberOfMonths`, `captionLayout` …). The cell size is the CSS variable `--cell-size` (default: the small
 * control height `--pui-control-h-sm`, 2rem),
 * e.g. `className="[--cell-size:2.25rem]"`.
 * Every month takes six weeks of space (`fixedWeeks`, default `true`), so the height never changes while
 * navigating; a trailing week made only of next-month days stays empty.
 */
export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(function Calendar(
  {
    className,
    classNames,
    showOutsideDays = true,
    fixedWeeks = true,
    captionLayout = "label",
    buttonVariant = "ghost",
    formatters,
    components,
    ...props
  },
  ref,
) {
  const defaultClassNames = getDefaultClassNames();
  const navButtonClassName = cn(
    buttonVariants({ variant: buttonVariant, size: "icon-sm" }),
    "pointer-events-auto size-[var(--cell-size)] p-0 select-none aria-disabled:pointer-events-none aria-disabled:opacity-50",
  );

  return (
    <CalendarRefContext.Provider value={ref}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        fixedWeeks={fixedWeeks}
        className={cn(
          "group/calendar p-3 text-sm text-pui-foreground [--cell-size:var(--pui-control-h-sm)]",
          "rtl:[&_.rdp-button\\_next>svg]:rotate-180 rtl:[&_.rdp-button\\_previous>svg]:rotate-180",
          className,
        )}
        captionLayout={captionLayout}
        formatters={{
          formatMonthDropdown: (month, dateLib) =>
            dateLib ? dateLib.format(month, "LLL") : month.toLocaleString("en-US", { month: "short" }),
          ...formatters,
        }}
        classNames={{
          root: cn("w-fit", defaultClassNames.root),
          months: cn("relative flex flex-col gap-4 sm:flex-row", defaultClassNames.months),
          month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
          // The nav spans the caption row: let clicks through to the month/year dropdowns, only its buttons catch them.
          nav: cn(
            "pointer-events-none absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
            defaultClassNames.nav,
          ),
          button_previous: cn(navButtonClassName, defaultClassNames.button_previous),
          button_next: cn(navButtonClassName, defaultClassNames.button_next),
          chevron: cn("text-current", defaultClassNames.chevron),
          month_caption: cn(
            "flex h-[var(--cell-size)] w-full items-center justify-center px-[var(--cell-size)]",
            defaultClassNames.month_caption,
          ),
          dropdowns: cn(
            "flex h-[var(--cell-size)] w-full items-center justify-center gap-1.5 text-sm font-medium",
            defaultClassNames.dropdowns,
          ),
          dropdown_root: cn(
            "relative rounded-pui-md border border-pui-input bg-pui-background transition-colors duration-pui-fast ease-pui focus-within:border-pui-ring",
            defaultClassNames.dropdown_root,
          ),
          dropdown: cn("absolute inset-0 cursor-pointer bg-pui-popover opacity-0", defaultClassNames.dropdown),
          caption_label: cn(
            "select-none font-medium text-pui-foreground",
            captionLayout === "label"
              ? "text-sm"
              : "flex h-pui-control-sm items-center gap-1 rounded-pui-md pl-2 pr-1 text-sm [&>svg]:size-3.5 [&>svg]:text-pui-muted-foreground",
            defaultClassNames.caption_label,
          ),
          month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
          weekdays: cn("flex", defaultClassNames.weekdays),
          weekday: cn(
            "flex h-6 flex-1 select-none items-center justify-center text-pui-eyebrow font-semibold uppercase text-pui-muted-foreground",
            defaultClassNames.weekday,
          ),
          // A filler week made only of next-month days (fixedWeeks) keeps its space but shows nothing.
          week: cn(
            "mt-1 flex w-full data-[filler]:invisible",
            defaultClassNames.week,
          ),
          week_number_header: cn("w-[var(--cell-size)] select-none", defaultClassNames.week_number_header),
          week_number: cn("select-none text-xs font-normal text-pui-muted-foreground", defaultClassNames.week_number),
          day: cn(
            "group/day relative flex aspect-square h-full w-full select-none items-center justify-center p-0 text-center",
            "[&:last-child[data-selected=true]_button]:rounded-r-pui-md",
            // The range ends visually at the month edge, next to an (unmarked) outside day.
            "[&[data-selected=true][data-month-end]_button]:rounded-r-pui-md [&[data-selected=true][data-month-start]_button]:rounded-l-pui-md",
            props.showWeekNumber
              ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-pui-md"
              : "[&:first-child[data-selected=true]_button]:rounded-l-pui-md",
            defaultClassNames.day,
          ),
          range_start: cn("rounded-l-pui-md bg-pui-primary/tint", defaultClassNames.range_start),
          range_middle: cn("rounded-none", defaultClassNames.range_middle),
          range_end: cn("rounded-r-pui-md bg-pui-primary/tint", defaultClassNames.range_end),
          today: cn(defaultClassNames.today),
          outside: cn(
            "!rounded-none !bg-transparent text-pui-muted-foreground opacity-50 [&_button]:!rounded-pui-md [&_button]:text-pui-muted-foreground",
            defaultClassNames.outside,
          ),
          disabled: cn("text-pui-muted-foreground [&_button]:text-pui-muted-foreground", defaultClassNames.disabled),
          hidden: cn("invisible", defaultClassNames.hidden),
          ...classNames,
        }}
        components={{
          ...slotComponents,
          Root: CalendarRoot,
          Chevron: CalendarChevron,
          Dropdown: CalendarDropdown,
          DayButton: CalendarDayButtonSlot,
          WeekNumber: CalendarWeekNumber,
          ...components,
        }}
        {...props}
      />
    </CalendarRefContext.Provider>
  );
});

export type CalendarDayButtonProps = DayButtonProps;

// DayPicker's `components` expect plain function components, so the forwardRef export is wrapped here.
function CalendarDayButtonSlot(props: DayButtonProps) {
  return <CalendarDayButton {...props} />;
}

/** The styled day button of each grid cell. Reuse it in a custom `components.DayButton`, e.g. `(p) => <CalendarDayButton {...p} />`. */
export const CalendarDayButton = forwardRef<HTMLButtonElement, CalendarDayButtonProps>(function CalendarDayButton(
  { className, day, modifiers, ...props },
  forwardedRef,
) {
  const defaultClassNames = getDefaultClassNames();
  const ref = useCallback(
    (node: HTMLButtonElement | null) => {
      // DayPicker moves the focus by re-rendering with `modifiers.focused`, the default DayButton does this too.
      if (node && modifiers.focused) node.focus();
      assignRef(forwardedRef, node);
    },
    [modifiers.focused, forwardedRef],
  );

  // Days of the neighbouring month never show the selection: with several months side by side the
  // range would otherwise appear twice (e.g. 1–2 Oct inside September and again in October).
  const outside = Boolean(modifiers.outside);
  const inRange = modifiers.range_start || modifiers.range_end || modifiers.range_middle;

  return (
    <button
      ref={ref}
      data-slot="calendar-day-button"
      data-day={day.isoDate}
      data-selected-single={Boolean(modifiers.selected && !inRange && !outside)}
      data-range-start={Boolean(modifiers.range_start && !outside)}
      data-range-end={Boolean(modifiers.range_end && !outside)}
      data-range-middle={Boolean(modifiers.range_middle && !outside)}
      data-today={Boolean(modifiers.today && !modifiers.selected && !modifiers.outside)}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        "flex aspect-square h-auto w-full min-w-[var(--cell-size)] flex-col gap-1 font-normal leading-none text-pui-foreground",
        "aria-disabled:opacity-50 group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10",
        "data-[today=true]:bg-pui-accent data-[today=true]:font-semibold data-[today=true]:text-pui-accent-foreground",
        "data-[selected-single=true]:bg-pui-primary data-[selected-single=true]:text-pui-primary-foreground data-[selected-single=true]:hover:bg-pui-primary/90 data-[selected-single=true]:hover:text-pui-primary-foreground",
        "data-[range-start=true]:rounded-pui-md data-[range-start=true]:bg-pui-primary data-[range-start=true]:text-pui-primary-foreground data-[range-start=true]:hover:bg-pui-primary/90 data-[range-start=true]:hover:text-pui-primary-foreground",
        "data-[range-end=true]:rounded-pui-md data-[range-end=true]:bg-pui-primary data-[range-end=true]:text-pui-primary-foreground data-[range-end=true]:hover:bg-pui-primary/90 data-[range-end=true]:hover:text-pui-primary-foreground",
        "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-pui-primary/tint data-[range-middle=true]:text-pui-primary data-[range-middle=true]:hover:bg-pui-primary/tint-hover data-[range-middle=true]:hover:text-pui-primary",
        "[&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day_button,
        className,
      )}
      {...props}
    />
  );
});
