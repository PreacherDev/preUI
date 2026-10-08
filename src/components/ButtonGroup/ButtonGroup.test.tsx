import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button/Button";
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "./ButtonGroup";

describe("ButtonGroup", () => {
  it("renders a horizontal group that merges borders", () => {
    render(
      <ButtonGroup aria-label="Ansicht">
        <Button variant="outline">Tag</Button>
        <Button variant="outline">Woche</Button>
        <Button variant="outline">Monat</Button>
      </ButtonGroup>,
    );
    const group = screen.getByRole("group", { name: "Ansicht" });
    expect(group).toHaveAttribute("data-orientation", "horizontal");
    expect(group).toHaveClass("[&>*:not(:first-child)]:border-l-0", "[&>*:not(:last-child)]:rounded-r-none");
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("supports the vertical orientation", () => {
    render(<ButtonGroup orientation="vertical" data-testid="group" />);
    const group = screen.getByTestId("group");
    expect(group).toHaveAttribute("aria-orientation", "vertical");
    expect(group).toHaveClass("flex-col", "[&>*:not(:first-child)]:border-t-0");
  });

  it("keeps children interactive", async () => {
    const onClick = vi.fn();
    render(
      <ButtonGroup>
        <Button onClick={onClick}>Speichern</Button>
        <ButtonGroupSeparator data-testid="sep" />
        <Button>Mehr</Button>
      </ButtonGroup>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    const sep = screen.getByTestId("sep");
    expect(sep).toHaveAttribute("data-orientation", "vertical");
    expect(sep).toHaveClass("self-stretch", "data-[orientation=vertical]:h-auto");
  });

  it("renders text segments, also through render", () => {
    render(
      <ButtonGroup>
        <ButtonGroupText>https://</ButtonGroupText>
        <ButtonGroupText render={<label htmlFor="x" />} className="px-2">
          Domain
        </ButtonGroupText>
        <input id="x" />
      </ButtonGroup>,
    );
    expect(screen.getByText("https://")).toHaveClass("bg-pui-muted", "border-pui-border", "px-4");
    const label = screen.getByText("Domain");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveClass("px-2");
    expect(label).not.toHaveClass("px-4");
    expect(screen.getByLabelText("Domain")).toBeInTheDocument();
  });

  it("merges className", () => {
    render(<ButtonGroup data-testid="group" className="w-full" />);
    expect(screen.getByTestId("group")).toHaveClass("w-full");
    expect(screen.getByTestId("group")).not.toHaveClass("w-fit");
  });
});

describe("ButtonGroup focused fields", () => {
  it("outlines the group for any focused field child, not only <input>", () => {
    render(<ButtonGroup data-testid="group" />);
    const group = screen.getByTestId("group");
    expect(group).toHaveClass(
      "has-[>:is(:focus-within,[data-popup-open]):not([data-variant]):not([data-slot=button-group])]:ring-pui",
      "data-[has-focused-field]:ring-pui",
      "[&>:is(:focus-within,[data-popup-open]):not([data-variant]):not([data-invalid]):not([aria-invalid=true])]:border-pui-input",
    );
  });

  // (Focus is set before the hook's first check: jsdom's selector engine caches `:focus-within` results until the
  // DOM mutates, so later focus moves can't be observed here.)
  it("sets the :has() fallback attribute for a focused field wrapper (e.g. NumberField)", async () => {
    render(
      <ButtonGroup data-testid="group">
        <Button variant="outline">Minus</Button>
        <div data-slot="number-field">
          <input aria-label="Menge" autoFocus />
        </div>
      </ButtonGroup>,
    );
    await waitFor(() => expect(screen.getByTestId("group")).toHaveAttribute("data-has-focused-field"));
  });

  it("does not set it for a focused button (buttons draw their own ring)", async () => {
    render(
      <ButtonGroup data-testid="group">
        <Button variant="outline" autoFocus>
          Minus
        </Button>
        <input aria-label="Menge" />
      </ButtonGroup>,
    );
    expect(screen.getByRole("button", { name: "Minus" })).toHaveFocus();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(screen.getByTestId("group")).not.toHaveAttribute("data-has-focused-field");
  });
});
