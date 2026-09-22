import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { de } from "react-day-picker/locale";
import { Calendar, DatePicker, DateRangePicker } from ".";

const JAN_2025 = new Date(2025, 0, 1);

function dayButton(day: number, container: HTMLElement = document.body) {
  const iso = `2025-01-${String(day).padStart(2, "0")}`;
  const button = container.querySelector<HTMLButtonElement>(`button[data-day="${iso}"]`);
  if (!button) throw new Error(`no button for ${iso}`);
  return button;
}

describe("Calendar", () => {
  it("renders a month grid with caption, weekdays and days", () => {
    render(<Calendar mode="single" defaultMonth={JAN_2025} />);
    const grid = screen.getByRole("grid");
    expect(grid).toBeInTheDocument();
    expect(screen.getByText("January 2025")).toBeInTheDocument();
    expect(within(grid).getAllByRole("columnheader", { hidden: true })).toHaveLength(7);
    expect(dayButton(15)).toHaveTextContent("15");
    expect(screen.getByRole("button", { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next month/i })).toBeInTheDocument();
  });

  it("always renders six weeks so the height stays constant (fixedWeeks)", () => {
    // February 2021 starts on a Monday and has 28 days: four weeks without fixedWeeks.
    const FEB_2021 = new Date(2021, 1, 1);
    const { unmount } = render(<Calendar defaultMonth={FEB_2021} weekStartsOn={1} />);
    expect(screen.getAllByRole("row")).toHaveLength(6); // six weeks
    // Filler weeks made only of next-month days keep their space but are hidden.
    // (a data attribute set from the week's days, not a CSS :has() rule — Chromium 103 has no :has()).
    const rows = screen.getAllByRole("row");
    expect(rows[5]).toHaveClass("data-[filler]:invisible");
    expect(rows[5]).toHaveAttribute("data-filler");
    expect(rows[4]).toHaveAttribute("data-filler");
    expect(rows[3]).not.toHaveAttribute("data-filler");
    // The first / last day of the month are marked for the range rounding next to outside days.
    expect(document.querySelector('[data-day="2021-02-01"]')!.closest("[data-slot=calendar-day]")).toHaveAttribute("data-month-start");
    expect(document.querySelector('[data-day="2021-02-28"]')!.closest("[data-slot=calendar-day]")).toHaveAttribute("data-month-end");
    expect(document.querySelector('[data-day="2021-02-15"]')!.closest("[data-slot=calendar-day]")).not.toHaveAttribute("data-month-end");
    unmount();
    render(<Calendar defaultMonth={FEB_2021} weekStartsOn={1} fixedWeeks={false} />);
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("selects a day", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    function Controlled() {
      const [date, setDate] = useState<Date>();
      return (
        <Calendar
          mode="single"
          defaultMonth={JAN_2025}
          selected={date}
          onSelect={(d) => {
            setDate(d);
            onSelect(d);
          }}
        />
      );
    }
    render(<Controlled />);
    await user.click(dayButton(15));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((onSelect.mock.calls[0][0] as Date).getDate()).toBe(15);
    expect(dayButton(15)).toHaveAttribute("data-selected-single", "true");
    expect(dayButton(15).closest("td")).toHaveAttribute("aria-selected", "true");
  });

  it("navigates to the next month", async () => {
    const user = userEvent.setup();
    render(<Calendar mode="single" defaultMonth={JAN_2025} />);
    await user.click(screen.getByRole("button", { name: /next month/i }));
    expect(screen.getByText("February 2025")).toBeInTheDocument();
  });

  it("selects a range with start, middle and end", async () => {
    const user = userEvent.setup();
    function Range() {
      const [range, setRange] = useState<DateRange>();
      return <Calendar mode="range" defaultMonth={JAN_2025} selected={range} onSelect={setRange} />;
    }
    render(<Range />);
    await user.click(dayButton(10));
    await user.click(dayButton(14));
    expect(dayButton(10)).toHaveAttribute("data-range-start", "true");
    expect(dayButton(12)).toHaveAttribute("data-range-middle", "true");
    expect(dayButton(14)).toHaveAttribute("data-range-end", "true");
    expect(dayButton(16)).toHaveAttribute("data-range-middle", "false");
  });

  it("supports the German locale", () => {
    render(<Calendar mode="single" defaultMonth={JAN_2025} locale={de} />);
    expect(screen.getByText("Januar 2025")).toBeInTheDocument();
    // German weeks start on Monday.
    const headers = screen.getAllByRole("columnheader", { hidden: true });
    expect(headers[0]).toHaveTextContent(/^mo/i);
  });

  it("marks disabled days and does not select them", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Calendar mode="single" defaultMonth={JAN_2025} disabled={new Date(2025, 0, 20)} onSelect={onSelect} />);
    expect(dayButton(20)).toBeDisabled();
    await user.click(dayButton(20));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("lets clicks through the nav overlay to the caption dropdowns", () => {
    // The nav is absolutely positioned over the caption row; without this it swallows every click on
    // the month/year dropdowns (captionLayout "dropdown").
    render(<Calendar mode="single" defaultMonth={JAN_2025} captionLayout="dropdown" />);
    const nav = screen.getByRole("button", { name: /previous month/i }).parentElement!;
    expect(nav).toHaveClass("pointer-events-none");
    expect(screen.getByRole("button", { name: /previous month/i })).toHaveClass("pointer-events-auto");
    expect(screen.getByRole("button", { name: /next month/i })).toHaveClass("pointer-events-auto");
    expect(nav.contains(screen.getByRole("combobox", { name: /month/i }))).toBe(false);
  });

  it("merges className and forwards the ref to the root", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Calendar ref={ref} className="custom-cal" defaultMonth={JAN_2025} />);
    expect(ref.current).toHaveAttribute("data-slot", "calendar");
    expect(ref.current).toHaveClass("custom-cal", "p-3");
  });
});

describe("DatePicker", () => {
  it("opens the calendar and sets the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DatePicker
        placeholder="Datum wählen"
        onValueChange={onValueChange}
        formatDate={(d) => `Tag ${d.getDate()}`}
        calendarProps={{ defaultMonth: JAN_2025 }}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Datum wählen" });
    expect(trigger).toHaveAttribute("data-placeholder");
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await user.click(dayButton(15, dialog));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect((onValueChange.mock.calls[0][0] as Date).getDate()).toBe(15);
    expect(trigger).toHaveTextContent("Tag 15");
    expect(trigger).not.toHaveAttribute("data-placeholder");
  });

  it("formats the value with the locale by default", () => {
    render(<DatePicker value={new Date(2025, 0, 15)} locale={de} />);
    expect(screen.getByRole("button")).toHaveTextContent("15.01.2025");
  });

  it("can be disabled", () => {
    render(<DatePicker placeholder="Datum" disabled />);
    expect(screen.getByRole("button", { name: "Datum" })).toBeDisabled();
  });
});

describe("DateRangePicker", () => {
  it("selects a range", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <DateRangePicker
        placeholder="Zeitraum"
        onValueChange={onValueChange}
        formatDate={(d) => String(d.getDate())}
        calendarProps={{ defaultMonth: JAN_2025 }}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Zeitraum" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await user.click(dayButton(3, dialog));
    // After the first click the range is { from: 3, to: 3 } — shown as one date, not "3 – 3".
    expect(trigger).toHaveTextContent(/^3$/);
    await user.click(dayButton(9, dialog));
    const last = onValueChange.mock.lastCall?.[0] as DateRange;
    expect(last.from?.getDate()).toBe(3);
    expect(last.to?.getDate()).toBe(9);
    expect(trigger).toHaveTextContent("3 – 9");
  });
});

describe("Calendar tokens + slots", () => {
  it("marks the parts with data-slot and derives the cell size from the control height", () => {
    const { container } = render(<Calendar mode="range" defaultMonth={JAN_2025} showWeekNumber />);
    const root = container.querySelector('[data-slot="calendar"]')!;
    expect(root).toHaveClass("[--cell-size:var(--pui-control-h-sm)]");
    for (const slot of [
      "calendar-months",
      "calendar-month",
      "calendar-nav",
      "calendar-previous",
      "calendar-next",
      "calendar-month-caption",
      "calendar-caption-label",
      "calendar-month-grid",
      "calendar-weekdays",
      "calendar-weekday",
      "calendar-weeks",
      "calendar-week",
      "calendar-day",
      "calendar-day-button",
      "calendar-week-number",
      "calendar-chevron",
    ]) {
      expect(container.querySelector(`[data-slot="${slot}"]`), slot).toBeInTheDocument();
    }
    expect(dayButton(15, container)).toHaveClass("data-[range-middle=true]:bg-pui-primary/tint");
  });

  it("marks the picker triggers", () => {
    const { container } = render(
      <>
        <DatePicker placeholder="Datum" />
        <DateRangePicker placeholder="Zeitraum" />
      </>,
    );
    const single = container.querySelector('[data-slot="date-picker"]')!;
    expect(single).toHaveClass("h-pui-control", "duration-pui-fast", "ease-pui");
    expect(single.querySelector('[data-slot="date-picker-value"]')).toHaveTextContent("Datum");
    expect(single.querySelector('[data-slot="date-picker-icon"]')).toBeInTheDocument();
    const range = container.querySelector('[data-slot="date-range-picker"]')!;
    expect(range.querySelector('[data-slot="date-range-picker-value"]')).toHaveTextContent("Zeitraum");
  });
});
