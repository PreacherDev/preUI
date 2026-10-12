import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "./Combobox";

interface Blip {
  id: number;
  label: string;
}

const blips: Blip[] = Array.from({ length: 1000 }, (_, i) => ({ id: i + 1, label: `Symbol ${String(i + 1).padStart(4, "0")}` }));

function VirtualExample(props: { defaultValue?: Blip; onValueChange?: (value: Blip | null) => void }) {
  return (
    <Combobox
      items={blips}
      virtualized
      defaultValue={props.defaultValue}
      onValueChange={props.onValueChange}
      itemToStringLabel={(blip: Blip) => blip.label}
      isItemEqualToValue={(a: Blip, b: Blip) => a.id === b.id}
    >
      <ComboboxInput aria-label="Symbol" />
      <ComboboxContent>
        <ComboboxEmpty>Nichts gefunden.</ComboboxEmpty>
        <ComboboxList itemHeight={40}>
          {(blip: Blip) => (
            <ComboboxItem key={blip.id} value={blip}>
              <img src={`/blips/${blip.id}.png`} alt="" loading="lazy" />
              {blip.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function rendered() {
  return screen.getAllByRole("option");
}

describe("Combobox virtualized", () => {
  it("renders only a window of the items, positioned by itemHeight, with set size and position", async () => {
    const user = userEvent.setup();
    render(<VirtualExample />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toHaveAttribute("data-virtualized");

    const options = rendered();
    // 320px estimated viewport / 40px rows + 6 overscan rows — never the 1000 items.
    expect(options.length).toBeGreaterThan(5);
    expect(options.length).toBeLessThan(30);
    expect(options[0]).toHaveAttribute("aria-setsize", "1000");
    expect(options[0]).toHaveAttribute("aria-posinset", "1");
    expect(options[3]).toHaveAttribute("aria-posinset", "4");

    const sizer = listbox.querySelector('[data-slot="combobox-sizer"]') as HTMLElement;
    expect(sizer.style.height).toBe("40000px");
    const row = options[3].parentElement as HTMLElement;
    expect(row).toHaveAttribute("data-slot", "combobox-row");
    expect(row).toHaveAttribute("role", "presentation");
    expect(row.style.top).toBe("120px");
    expect(row.style.height).toBe("40px");
  });

  it("keeps keyboard navigation over all items and renders the highlighted one", async () => {
    const user = userEvent.setup();
    render(<VirtualExample />);
    const input = screen.getByRole("combobox", { name: "Symbol" });
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("listbox");

    // ArrowDown highlights the first item, ArrowUp returns to the input, the next ArrowUp wraps to the last item —
    // far outside the rendered window.
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(input.getAttribute("aria-activedescendant")).toBeTruthy());
    await user.keyboard("{ArrowUp}{ArrowUp}");
    await waitFor(() => {
      const active = document.getElementById(input.getAttribute("aria-activedescendant") ?? "");
      expect(active).toHaveAttribute("aria-posinset", "1000");
      expect(active).toHaveAttribute("data-highlighted");
      expect(active).toHaveTextContent("Symbol 1000");
    });
    expect(screen.queryByRole("option", { name: "Symbol 0001" })).not.toBeInTheDocument();

    await user.keyboard("{Enter}");
    await waitFor(() => expect(input).toHaveValue("Symbol 1000"));
  });

  it("opens on the selected item", async () => {
    const user = userEvent.setup();
    render(<VirtualExample defaultValue={blips[499]} />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    const option = await screen.findByRole("option", { name: "Symbol 0500" });
    expect(option).toHaveAttribute("aria-selected", "true");
    expect(option).toHaveAttribute("aria-posinset", "500");
  });

  it("filters while typing: set size follows the results, selecting works", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<VirtualExample onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox", { name: "Symbol" });
    await user.type(input, "Symbol 09");
    // Symbol 0900 … 0999 → 100 results.
    await waitFor(() => expect(rendered()[0]).toHaveAttribute("aria-setsize", "100"));
    expect(rendered()[0]).toHaveTextContent("Symbol 0900");
    await user.click(screen.getByRole("option", { name: "Symbol 0903" }));
    expect(onValueChange).toHaveBeenCalledWith(blips[902], expect.anything());

    await user.clear(input);
    await user.type(input, "xyz");
    expect(await screen.findByText("Nichts gefunden.")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("renders groups with labels, group roles and per-group set sizes", async () => {
    const user = userEvent.setup();
    const groups = [
      { value: "Läden", items: Array.from({ length: 3 }, (_, i) => `Laden ${i + 1}`) },
      { value: "Garagen", items: Array.from({ length: 300 }, (_, i) => `Garage ${i + 1}`) },
    ];
    render(
      <Combobox items={groups} virtualized>
        <ComboboxInput aria-label="Ort" />
        <ComboboxContent>
          <ComboboxList renderGroupLabel={(group) => `${String(group.value)} (${group.items.length})`}>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    const shops = await screen.findByRole("group", { name: "Läden (3)" });
    expect(within(shops).getAllByRole("option")).toHaveLength(3);
    expect(within(shops).getByRole("option", { name: "Laden 3" })).toHaveAttribute("aria-setsize", "3");
    const garages = screen.getByRole("group", { name: "Garagen (300)" });
    const firstGarage = within(garages).getByRole("option", { name: "Garage 1" });
    expect(firstGarage).toHaveAttribute("aria-setsize", "300");
    expect(firstGarage).toHaveAttribute("aria-posinset", "1");
    // Label rows: 28px, item rows: 32px (defaults). Garage 1 sits below 2 labels and 3 items.
    expect((firstGarage.parentElement as HTMLElement).style.top).toBe(`${2 * 28 + 3 * 32}px`);
    expect(within(garages).getAllByRole("option").length).toBeLessThan(30);
  });

  it("leaves non-virtualized lists unchanged", async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={blips.slice(0, 50)} itemToStringLabel={(blip: Blip) => blip.label}>
        <ComboboxInput aria-label="Symbol" />
        <ComboboxContent>
          <ComboboxList>
            {(blip: Blip) => (
              <ComboboxItem key={blip.id} value={blip}>
                {blip.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("listbox");
    expect(rendered()).toHaveLength(50);
    expect(rendered()[0]).not.toHaveAttribute("aria-setsize");
    expect(screen.getByRole("listbox")).not.toHaveAttribute("data-virtualized");
  });
});
