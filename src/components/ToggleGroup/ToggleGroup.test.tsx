import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup";

function Ranges(props: Partial<React.ComponentProps<typeof ToggleGroup>>) {
  return (
    <ToggleGroup aria-label="Zeitraum" defaultValue={["24h"]} {...props}>
      <ToggleGroupItem value="24h">24H</ToggleGroupItem>
      <ToggleGroupItem value="7d">7T</ToggleGroupItem>
      <ToggleGroupItem value="30d">30T</ToggleGroupItem>
    </ToggleGroup>
  );
}

describe("ToggleGroup", () => {
  it("renders a segmented group with compact items", () => {
    render(<Ranges />);
    const group = screen.getByRole("group", { name: "Zeitraum" });
    expect(group).toHaveClass("rounded-pui-md", "border-pui-border", "p-0.5");
    const item = screen.getByRole("button", { name: "24H" });
    expect(item).toHaveClass("h-6", "text-xs");
    expect(item).toHaveAttribute("aria-pressed", "true");
  });

  it("selects a single item by default", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Ranges onValueChange={onValueChange} />);
    await user.click(screen.getByRole("button", { name: "7T" }));
    expect(screen.getByRole("button", { name: "7T" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "24H" })).toHaveAttribute("aria-pressed", "false");
    expect(onValueChange).toHaveBeenCalledWith(["7d"], expect.anything());
  });

  it("allows several items with multiple", async () => {
    const user = userEvent.setup();
    render(<Ranges multiple />);
    await user.click(screen.getByRole("button", { name: "7T" }));
    expect(screen.getByRole("button", { name: "24H" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "7T" })).toHaveAttribute("aria-pressed", "true");
  });

  it("uses regular sizes for the default variant", () => {
    render(<Ranges variant="default" />);
    expect(screen.getByRole("group")).toHaveClass("gap-1");
    expect(screen.getByRole("group")).not.toHaveClass("border");
    expect(screen.getByRole("button", { name: "24H" })).toHaveClass("h-pui-control");
  });

  it("merges className, including the function form", () => {
    render(<Ranges className={(state) => (state.multiple ? "is-multi" : "is-single")} />);
    expect(screen.getByRole("group")).toHaveClass("is-single", "p-0.5");
  });

  it("disables all items", async () => {
    const user = userEvent.setup();
    render(<Ranges disabled />);
    await user.click(screen.getByRole("button", { name: "7T" }));
    expect(screen.getByRole("button", { name: "7T" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("group")).toHaveAttribute("data-disabled");
  });
});

describe("ToggleGroup data attributes", () => {
  it("marks the group and its items", () => {
    render(<Ranges />);
    const group = screen.getByRole("group", { name: "Zeitraum" });
    expect(group).toHaveAttribute("data-slot", "toggle-group");
    expect(group).toHaveAttribute("data-variant", "segmented");
    expect(group).toHaveAttribute("data-size", "segment");
    const item = screen.getByRole("button", { name: "24H" });
    expect(item).toHaveAttribute("data-slot", "toggle-group-item");
    expect(item).toHaveAttribute("data-size", "segment");
  });
});
