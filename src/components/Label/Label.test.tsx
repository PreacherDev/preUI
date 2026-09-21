import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { Label } from "./Label";

describe("Label", () => {
  it("renders a styled label linked to its control", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor="amount">Betrag</Label>
        <input id="amount" />
      </>,
    );
    const label = screen.getByText("Betrag");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveClass("text-xs", "font-medium", "text-pui-muted-foreground");
    expect(screen.getByLabelText("Betrag")).toBe(screen.getByRole("textbox"));
    await user.click(label);
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("has disabled styles for peer and group", () => {
    render(<Label>Menge</Label>);
    expect(screen.getByText("Menge")).toHaveClass("peer-disabled:opacity-50", "group-data-[disabled]:opacity-50");
  });

  it("dims next to a disabled Base UI peer (Checkbox, Switch, Radio set data-disabled, not :disabled)", () => {
    render(<Label>Menge</Label>);
    expect(screen.getByText("Menge")).toHaveClass("peer-data-[disabled]:opacity-50", "peer-data-[disabled]:cursor-not-allowed");
  });

  it("merges className and forwards refs", () => {
    const ref = createRef<HTMLLabelElement>();
    render(
      <Label ref={ref} className="text-sm text-pui-foreground">
        Name
      </Label>,
    );
    const label = screen.getByText("Name");
    expect(ref.current).toBe(label);
    expect(label).toHaveClass("text-sm", "text-pui-foreground");
    expect(label).not.toHaveClass("text-xs", "text-pui-muted-foreground");
  });
});
