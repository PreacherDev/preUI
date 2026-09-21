import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "./Combobox";

const cities = ["Berlin", "Hamburg", "München", "Köln"];

function Example(props: { onValueChange?: (value: string | null) => void; disabled?: boolean }) {
  return (
    <Combobox items={cities} onValueChange={props.onValueChange} disabled={props.disabled}>
      <ComboboxInput
        aria-label="Stadt"
        placeholder="Stadt suchen …"
        icon
        className={(state) => (state.disabled ? "is-disabled" : "is-enabled")}
      />
      <ComboboxContent className="custom-popup">
        <ComboboxEmpty>Keine Stadt gefunden.</ComboboxEmpty>
        <ComboboxList>
          {(city: string) => (
            <ComboboxItem key={city} value={city}>
              {city}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

describe("Combobox", () => {
  it("renders a field-styled input group with icon and trigger", () => {
    render(<Example />);
    const input = screen.getByRole("combobox", { name: "Stadt" });
    const group = input.parentElement!;
    expect(group).toHaveClass("h-pui-control", "border-pui-input", "bg-pui-background", "is-enabled");
    expect(group).toHaveAttribute("data-slot", "combobox-input-group");
    expect(group).toHaveAttribute("data-size", "default");
    expect(group.querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("filters, shows the empty state and selects an item", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox", { name: "Stadt" });

    await user.type(input, "ham");
    const option = await screen.findByRole("option", { name: "Hamburg" });
    expect(option).toHaveClass("py-1.5", "pl-2", "pr-8");
    expect(screen.queryByRole("option", { name: "Berlin" })).not.toBeInTheDocument();
    expect(document.querySelector(".custom-popup")).toHaveClass("bg-pui-popover");
    // The listbox is the preUI ScrollArea viewport (floating thumb, no native scrollbar), never a Tab stop.
    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveAttribute("data-slot", "scroll-area-viewport");
    expect(listbox).toHaveAttribute("tabindex", "-1");
    expect(listbox.className).toContain("max-h-[min(18rem,calc(var(--available-height)-0.625rem))]");

    await user.click(option);
    expect(onValueChange).toHaveBeenCalledWith("Hamburg", expect.anything());
    await waitFor(() => expect(input).toHaveValue("Hamburg"));

    await user.clear(input);
    await user.type(input, "xyz");
    expect(await screen.findByText("Keine Stadt gefunden.")).toHaveClass("text-pui-muted-foreground");
  });

  it("clears the value with the clear button", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const input = screen.getByRole("combobox", { name: "Stadt" });
    await user.type(input, "Köl");
    await user.click(await screen.findByRole("option", { name: "Köln" }));
    await waitFor(() => expect(input).toHaveValue("Köln"));
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("can be disabled", () => {
    render(<Example disabled />);
    expect(screen.getByRole("combobox", { name: "Stadt" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Stadt" }).parentElement).toHaveClass("is-disabled");
  });

  it("renders chips for multiple selection", async () => {
    const user = userEvent.setup();
    render(
      <Combobox items={cities} multiple defaultValue={["Berlin"]}>
        <ComboboxChips>
          <ComboboxValue>
            {(value: string[]) => (
              <>
                {value.map((city) => (
                  <ComboboxChip key={city} removeLabel={`${city} entfernen`}>
                    {city}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput aria-label="Städte" />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent>
          <ComboboxList>
            {(city: string) => (
              <ComboboxItem key={city} value={city}>
                {city}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    expect(screen.getByText("Berlin")).toHaveClass("rounded-pui-sm", "bg-pui-secondary");
    await user.click(screen.getByRole("button", { name: "Berlin entfernen" }));
    await waitFor(() => expect(screen.queryByText("Berlin")).not.toBeInTheDocument());
  });
});
