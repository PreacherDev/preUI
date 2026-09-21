import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Checkbox } from "../Checkbox";
import { CheckboxGroup } from "./CheckboxGroup";

function Protocols(props: { disabled?: boolean; onValueChange?: (value: string[]) => void }) {
  return (
    <CheckboxGroup aria-label="Protokolle" defaultValue={["http"]} {...props}>
      <label>
        <Checkbox value="http" />
        HTTP
      </label>
      <label>
        <Checkbox value="ssh" />
        SSH
      </label>
    </CheckboxGroup>
  );
}

describe("CheckboxGroup", () => {
  it("renders a group with the stack layout", () => {
    render(<Protocols />);
    const group = screen.getByRole("group", { name: "Protokolle" });
    expect(group).toHaveClass("flex", "flex-col", "gap-2");
    expect(screen.getByRole("checkbox", { name: "HTTP" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "SSH" })).toHaveAttribute("aria-checked", "false");
  });

  it("updates the value array", async () => {
    const onValueChange = vi.fn();
    render(<Protocols onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "SSH" }));
    expect(onValueChange).toHaveBeenCalledWith(["http", "ssh"], expect.anything());
  });

  it("drives a parent checkbox", async () => {
    const all = ["a", "b"];
    function Parent() {
      const [value, setValue] = useState<string[]>(["a"]);
      return (
        <CheckboxGroup aria-label="Alle" value={value} onValueChange={setValue} allValues={all}>
          <label>
            <Checkbox parent />
            Alle
          </label>
          <label>
            <Checkbox value="a" />A
          </label>
          <label>
            <Checkbox value="b" />B
          </label>
        </CheckboxGroup>
      );
    }
    render(<Parent />);
    const parent = screen.getByRole("checkbox", { name: "Alle" });
    expect(parent).toHaveAttribute("aria-checked", "mixed");
    await userEvent.click(parent);
    expect(screen.getByRole("checkbox", { name: "B" })).toHaveAttribute("aria-checked", "true");
  });

  it("merges className, including the function form", () => {
    render(
      <CheckboxGroup aria-label="G" className={(state) => (state.disabled ? "is-off" : "is-on")}>
        <Checkbox value="x" aria-label="x" />
      </CheckboxGroup>,
    );
    expect(screen.getByRole("group")).toHaveClass("is-on", "flex");
  });

  it("disables all checkboxes", async () => {
    render(<Protocols disabled />);
    const ssh = screen.getByRole("checkbox", { name: "SSH" });
    await userEvent.click(ssh);
    expect(ssh).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("group")).toHaveAttribute("data-disabled");
  });
});

describe("CheckboxGroup data attributes", () => {
  it("marks the group", () => {
    render(<Protocols />);
    expect(screen.getByRole("group", { name: "Protokolle" })).toHaveAttribute("data-slot", "checkbox-group");
  });
});
