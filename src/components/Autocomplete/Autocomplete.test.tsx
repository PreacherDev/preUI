import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "./Autocomplete";

const tags = ["Miete", "Gehalt", "Lebensmittel", "Versicherung"];

function Example(props: { onValueChange?: (value: string) => void; disabled?: boolean; icon?: null }) {
  return (
    <Autocomplete items={tags} onValueChange={props.onValueChange} disabled={props.disabled}>
      <AutocompleteInput
        aria-label="Buchung suchen"
        placeholder="Buchung suchen …"
        icon={props.icon}
        className={(state) => (state.disabled ? "is-disabled" : "is-enabled")}
      />
      <AutocompleteContent className="custom-popup">
        <AutocompleteEmpty>Keine Treffer.</AutocompleteEmpty>
        <AutocompleteList>
          {(tag: string) => (
            <AutocompleteItem key={tag} value={tag} className={() => "fn-item"}>
              {tag}
            </AutocompleteItem>
          )}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}

describe("Autocomplete", () => {
  it("renders a search field with the search icon by default", () => {
    render(<Example />);
    const input = screen.getByRole("combobox", { name: "Buchung suchen" });
    const group = input.parentElement!;
    expect(group).toHaveClass("h-pui-control", "border-pui-input", "is-enabled");
    expect(group).toHaveAttribute("data-slot", "autocomplete-input-group");
    expect(group).toHaveAttribute("data-size", "default");
    expect(group.querySelector("svg")).toBeInTheDocument();
  });

  it("hides the icon with icon={null}", () => {
    render(<Example icon={null} />);
    const group = screen.getByRole("combobox", { name: "Buchung suchen" }).parentElement!;
    expect(group.querySelector("svg")).not.toBeInTheDocument();
  });

  it("suggests matching items and fills the input on selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox", { name: "Buchung suchen" });

    await user.type(input, "ge");
    const option = await screen.findByRole("option", { name: "Gehalt" });
    expect(option).toHaveClass("rounded-pui-sm", "py-1.5", "pr-2", "fn-item");
    expect(screen.queryByRole("option", { name: "Miete" })).not.toBeInTheDocument();
    expect(document.querySelector(".custom-popup")).toHaveClass("bg-pui-popover", "shadow-pui-floating");
    // The listbox is the preUI ScrollArea viewport (floating thumb, no native scrollbar), never a Tab stop.
    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveAttribute("data-slot", "scroll-area-viewport");
    expect(listbox).toHaveAttribute("tabindex", "-1");

    await user.click(option);
    await waitFor(() => expect(input).toHaveValue("Gehalt"));
    expect(onValueChange).toHaveBeenLastCalledWith("Gehalt", expect.anything());
  });

  it("shows the empty state and clears the text", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const input = screen.getByRole("combobox", { name: "Buchung suchen" });
    await user.type(input, "xyz");
    expect(await screen.findByText("Keine Treffer.")).toHaveClass("text-pui-muted-foreground");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("can be disabled", () => {
    render(<Example disabled />);
    const input = screen.getByRole("combobox", { name: "Buchung suchen" });
    expect(input).toBeDisabled();
    expect(input.parentElement).toHaveClass("is-disabled");
  });
});
