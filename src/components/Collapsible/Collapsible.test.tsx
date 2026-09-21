import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./Collapsible";

describe("Collapsible", () => {
  it("marks its parts with data-slot", () => {
    render(
      <Collapsible data-testid="root" defaultOpen>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent>Inhalt</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.getByTestId("root")).toHaveAttribute("data-slot", "collapsible");
    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute("data-slot", "collapsible-trigger");
    expect(screen.getByText("Inhalt")).toHaveAttribute("data-slot", "collapsible-content");
    expect(screen.getByText("Inhalt")).toHaveClass("duration-pui-base", "ease-pui");
  });

  it("toggles the panel", async () => {
    const user = userEvent.setup();
    render(
      <Collapsible>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent>Versteckter Inhalt</CollapsibleContent>
      </Collapsible>,
    );
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Versteckter Inhalt")).not.toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("data-panel-open");
    expect(screen.getByText("Versteckter Inhalt")).toHaveClass("h-[var(--collapsible-panel-height)]");
  });

  it("renders a chevron unless hidden", () => {
    const { container, rerender } = render(
      <Collapsible>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
      </Collapsible>,
    );
    expect(container.querySelector("svg")).not.toBeNull();
    rerender(
      <Collapsible>
        <CollapsibleTrigger hideChevron>Details</CollapsibleTrigger>
      </Collapsible>,
    );
    expect(container.querySelector("svg")).toBeNull();
  });

  it("merges className, including the function form", () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="text-xs">Details</CollapsibleTrigger>
        <CollapsibleContent className={(state) => (state.open ? "is-open" : "is-closed")}>
          Inhalt
        </CollapsibleContent>
      </Collapsible>,
    );
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger).toHaveClass("text-xs");
    expect(trigger).not.toHaveClass("text-sm");
    expect(screen.getByText("Inhalt")).toHaveClass("is-open", "overflow-hidden");
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(
      <Collapsible disabled>
        <CollapsibleTrigger>Details</CollapsibleTrigger>
        <CollapsibleContent>Inhalt</CollapsibleContent>
      </Collapsible>,
    );
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(screen.queryByText("Inhalt")).not.toBeInTheDocument();
  });
});
