import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./HoverCard";
import type { HoverCardContentProps } from "./HoverCard";

function Example(props: HoverCardContentProps) {
  return (
    <HoverCard>
      <HoverCardTrigger href="#firma" delay={0} closeDelay={0}>
        Autohaus Nord
      </HoverCardTrigger>
      <HoverCardContent {...props}>
        <p>12 Mitarbeitende, gegründet 2021.</p>
      </HoverCardContent>
    </HoverCard>
  );
}

describe("HoverCard", () => {
  it("renders the trigger as a link", () => {
    render(<Example />);
    expect(screen.getByRole("link", { name: "Autohaus Nord" })).toHaveAttribute("href", "#firma");
  });

  it("opens on hover and closes on leave", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.hover(screen.getByRole("link"));
    const text = await screen.findByText("12 Mitarbeitende, gegründet 2021.");
    const popup = text.parentElement!;
    expect(popup).toHaveClass("bg-pui-popover", "border-pui-border", "shadow-pui-floating", "rounded-pui-md");
    expect(popup).toHaveAttribute("data-side", "bottom");
    await user.unhover(screen.getByRole("link"));
    await waitFor(() => expect(screen.queryByText("12 Mitarbeitende, gegründet 2021.")).not.toBeInTheDocument());
  });

  it("merges className, also in function form", async () => {
    const user = userEvent.setup();
    render(<Example side="top" className={(state) => (state.open ? "w-80 is-open" : undefined)} />);
    await user.hover(screen.getByRole("link"));
    const popup = (await screen.findByText("12 Mitarbeitende, gegründet 2021.")).parentElement!;
    expect(popup).toHaveClass("w-80", "is-open", "bg-pui-popover");
    expect(popup).not.toHaveClass("w-72");
    expect(popup).toHaveAttribute("data-side", "top");
  });

  it("marks trigger, positioner and content with data-slot", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.getByRole("link")).toHaveAttribute("data-slot", "hover-card-trigger");
    await user.hover(screen.getByRole("link"));
    const popup = (await screen.findByText("12 Mitarbeitende, gegründet 2021.")).parentElement!;
    expect(popup).toHaveAttribute("data-slot", "hover-card-content");
    expect(popup).toHaveClass("duration-pui-base", "ease-pui");
    expect(popup.parentElement).toHaveAttribute("data-slot", "hover-card-positioner");
  });
});

describe("HoverCardContent positioner props", () => {
  it("passes positionerProps to the positioner", async () => {
    const user = userEvent.setup();
    render(<Example alignOffset={4} positionerProps={{ className: "custom-positioner" }} />);
    await user.hover(screen.getByRole("link"));
    const popup = (await screen.findByText("12 Mitarbeitende, gegründet 2021.")).parentElement!;
    expect(popup.parentElement).toHaveClass("z-50", "custom-positioner");
  });
});
