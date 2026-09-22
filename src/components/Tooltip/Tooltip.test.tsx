import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./Tooltip";
import type { TooltipContentProps } from "./Tooltip";

function Example({ disabled, ...props }: TooltipContentProps & { disabled?: boolean }) {
  return (
    <TooltipProvider delay={0}>
      <Tooltip>
        <TooltipTrigger disabled={disabled}>Speichern</TooltipTrigger>
        <TooltipContent {...props}>Keine Berechtigung</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  it("shows the tooltip on hover and hides it on leave", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByText("Keine Berechtigung")).not.toBeInTheDocument();
    await user.hover(screen.getByRole("button", { name: "Speichern" }));
    const popup = await screen.findByText("Keine Berechtigung");
    expect(popup).toHaveClass("bg-pui-tooltip", "text-pui-tooltip-foreground", "shadow-pui-tooltip", "rounded-pui-md", "text-xs");
    await user.unhover(screen.getByRole("button", { name: "Speichern" }));
    await waitFor(() => expect(screen.queryByText("Keine Berechtigung")).not.toBeInTheDocument());
  });

  it("opens on keyboard focus", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(await screen.findByText("Keine Berechtigung")).toBeInTheDocument();
  });

  it("defaults to the top side and passes side through", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await user.hover(screen.getByRole("button"));
    expect(await screen.findByText("Keine Berechtigung")).toHaveAttribute("data-side", "top");
    unmount();

    render(<Example side="right" />);
    await user.hover(screen.getByRole("button"));
    expect(await screen.findByText("Keine Berechtigung")).toHaveAttribute("data-side", "right");
  });

  it("does not open when the trigger is disabled", async () => {
    const user = userEvent.setup();
    render(<Example disabled />);
    await user.hover(screen.getByRole("button"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("Keine Berechtigung")).not.toBeInTheDocument();
  });

  it("merges className, also in function form", async () => {
    const user = userEvent.setup();
    render(<Example className={(state) => (state.open ? "max-w-xs is-open" : undefined)} />);
    await user.hover(screen.getByRole("button"));
    const popup = await screen.findByText("Keine Berechtigung");
    expect(popup).toHaveClass("max-w-xs", "is-open", "bg-pui-tooltip");
    expect(popup).not.toHaveClass("max-w-64");
  });

  it("marks trigger, positioner and content with data-slot", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Speichern" });
    expect(trigger).toHaveAttribute("data-slot", "tooltip-trigger");
    await user.hover(trigger);
    const popup = await screen.findByText("Keine Berechtigung");
    expect(popup).toHaveAttribute("data-slot", "tooltip-content");
    expect(popup).toHaveClass("duration-pui-base", "ease-pui");
    expect(popup.parentElement).toHaveAttribute("data-slot", "tooltip-positioner");
  });
});

describe("TooltipContent positioner props", () => {
  it("passes positionerProps to the positioner", async () => {
    const user = userEvent.setup();
    render(<Example alignOffset={4} positionerProps={{ className: "custom-positioner" }} />);
    await user.hover(screen.getByRole("button", { name: "Speichern" }));
    const popup = await screen.findByText("Keine Berechtigung");
    expect(popup.parentElement).toHaveClass("z-50", "custom-positioner");
  });
});
