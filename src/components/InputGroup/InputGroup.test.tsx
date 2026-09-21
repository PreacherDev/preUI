import { Field } from "@base-ui/react/field";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./InputGroup";

describe("InputGroup", () => {
  it("renders a field-looking group with a borderless input", () => {
    render(
      <InputGroup data-testid="group">
        <InputGroupAddon data-testid="addon">
          <svg />
        </InputGroupAddon>
        <InputGroupInput placeholder="Buchung suchen" />
      </InputGroup>,
    );
    const group = screen.getByTestId("group");
    expect(group).toHaveAttribute("role", "group");
    expect(group).toHaveClass("h-pui-control", "rounded-pui-md", "border-pui-input", "bg-pui-background", "focus-within:border-pui-ring");
    const input = screen.getByPlaceholderText("Buchung suchen");
    expect(input).toHaveClass("border-0", "bg-transparent");
    expect(input).toHaveAttribute("data-slot", "input-group-control");
    const addon = screen.getByTestId("addon");
    expect(addon).toHaveAttribute("data-align", "inline-start");
    expect(addon).toHaveClass("order-first", "text-pui-muted-foreground");
  });

  it("focuses the input when the addon is clicked, but not from a button", async () => {
    const onButton = vi.fn();
    render(
      <InputGroup>
        <InputGroupInput aria-label="Betrag" />
        <InputGroupAddon align="inline-end" data-testid="addon">
          <InputGroupText>EUR</InputGroupText>
          <InputGroupButton onClick={onButton}>Max</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    const input = screen.getByLabelText("Betrag");
    await userEvent.click(screen.getByText("EUR"));
    expect(input).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Max" }));
    expect(onButton).toHaveBeenCalledTimes(1);
    expect(input).not.toHaveFocus();
    expect(screen.getByTestId("addon")).toHaveClass("order-last");
  });

  it("types into the input", async () => {
    const onValueChange = vi.fn();
    render(
      <InputGroup>
        <InputGroupInput aria-label="Suche" onValueChange={onValueChange} />
      </InputGroup>,
    );
    await userEvent.type(screen.getByLabelText("Suche"), "Mi");
    expect(onValueChange).toHaveBeenLastCalledWith("Mi", expect.anything());
  });

  it("links the input and textarea to a Field label", () => {
    render(
      <>
        <Field.Root>
          <Field.Label>Firmenname</Field.Label>
          <InputGroup>
            <InputGroupInput />
          </InputGroup>
        </Field.Root>
        <Field.Root>
          <Field.Label>Notiz</Field.Label>
          <InputGroup>
            <InputGroupTextarea rows={3} />
            <InputGroupAddon align="block-end">0 / 200</InputGroupAddon>
          </InputGroup>
        </Field.Root>
      </>,
    );
    expect(screen.getByLabelText("Firmenname").tagName).toBe("INPUT");
    const textarea = screen.getByLabelText("Notiz");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("rows", "3");
    expect(textarea).toHaveClass("resize-none", "border-0");
    expect(screen.getByText("0 / 200")).toHaveAttribute("data-align", "block-end");
  });

  it("renders button sizes", () => {
    render(
      <>
        <InputGroupButton>Standard</InputGroupButton>
        <InputGroupButton size="icon-sm" aria-label="Löschen" />
      </>,
    );
    const button = screen.getByRole("button", { name: "Standard" });
    expect(button).toHaveClass("h-6", "text-pui-muted-foreground");
    expect(button).not.toHaveClass("h-pui-control");
    expect(button).toHaveAttribute("data-size", "xs");
    expect(screen.getByRole("button", { name: "Löschen" })).toHaveClass("size-pui-control-sm", "p-0");
  });

  it("supports disabled and className merging", () => {
    render(
      <InputGroup data-testid="group" className="h-10">
        <InputGroupInput aria-label="Aus" disabled className={() => "fn-class"} />
      </InputGroup>,
    );
    expect(screen.getByTestId("group")).toHaveClass("h-10", "has-[:disabled]:opacity-50");
    expect(screen.getByTestId("group")).not.toHaveClass("h-pui-control");
    const input = screen.getByLabelText("Aus");
    expect(input).toBeDisabled();
    expect(input).toHaveClass("fn-class", "bg-transparent");
  });
});

describe("InputGroup data attributes", () => {
  it("marks every part with data-slot", () => {
    render(
      <InputGroup data-testid="group">
        <InputGroupInput aria-label="Betrag" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>EUR</InputGroupText>
          <InputGroupButton aria-label="Löschen" size="icon-xs">x</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    expect(screen.getByTestId("group")).toHaveAttribute("data-slot", "input-group");
    expect(screen.getByRole("textbox", { name: "Betrag" })).toHaveAttribute("data-slot", "input-group-control");
    expect(screen.getByText("EUR")).toHaveAttribute("data-slot", "input-group-text");
    const button = screen.getByRole("button", { name: "Löschen" });
    expect(button).toHaveAttribute("data-slot", "input-group-button");
    expect(button).toHaveAttribute("data-size", "icon-xs");
    expect(button).toHaveAttribute("data-variant", "ghost");
  });
});
