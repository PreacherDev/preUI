import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./Popover";
import type { PopoverContentProps } from "./Popover";

function Example(props: PopoverContentProps) {
  return (
    <Popover>
      <PopoverTrigger>Details</PopoverTrigger>
      <PopoverContent {...props}>
        <PopoverHeader data-testid="header" className="pb-2">
          <PopoverTitle>Lagerbestand</PopoverTitle>
          <PopoverDescription>Noch 12 Kisten auf Lager.</PopoverDescription>
        </PopoverHeader>
        <PopoverClose>Fertig</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  it("opens on click and renders a labelled dialog", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Details" }));
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveAccessibleName("Lagerbestand");
    expect(popup).toHaveClass("bg-pui-popover", "rounded-pui-md", "border-pui-border", "shadow-pui-floating", "w-72");
    expect(screen.getByText("Noch 12 Kisten auf Lager.")).toHaveClass("text-pui-muted-foreground");
    expect(screen.getByTestId("header")).toHaveClass("flex", "flex-col", "gap-1", "pb-2");
  });

  it("passes side to the positioner", async () => {
    const user = userEvent.setup();
    render(<Example side="top" />);
    await user.click(screen.getByRole("button", { name: "Details" }));
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveAttribute("data-side", "top");
  });

  it("closes via PopoverClose", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Details" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Fertig" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("merges className, also in function form", async () => {
    const user = userEvent.setup();
    render(<Example className={(state) => (state.open ? "w-96 is-open" : undefined)} />);
    await user.click(screen.getByRole("button", { name: "Details" }));
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveClass("w-96", "is-open", "bg-pui-popover");
    expect(popup).not.toHaveClass("w-72");
  });

  it("marks every part with data-slot and uses the motion tokens", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.getByRole("button", { name: "Details" })).toHaveAttribute("data-slot", "popover-trigger");
    await user.click(screen.getByRole("button", { name: "Details" }));
    const popup = await screen.findByRole("dialog");
    expect(popup).toHaveAttribute("data-slot", "popover-content");
    expect(popup).toHaveClass("duration-pui-base", "ease-pui");
    expect(popup.parentElement).toHaveAttribute("data-slot", "popover-positioner");
    expect(screen.getByTestId("header")).toHaveAttribute("data-slot", "popover-header");
    expect(screen.getByText("Lagerbestand")).toHaveAttribute("data-slot", "popover-title");
    expect(screen.getByText("Noch 12 Kisten auf Lager.")).toHaveAttribute("data-slot", "popover-description");
    expect(screen.getByRole("button", { name: "Fertig" })).toHaveAttribute("data-slot", "popover-close");
  });
});

describe("PopoverContent positioner props", () => {
  it("passes alignOffset and positionerProps to the positioner", async () => {
    const user = userEvent.setup();
    render(<Example align="start" alignOffset={8} positionerProps={{ className: "custom-positioner", collisionPadding: 12 }} />);
    await user.click(screen.getByRole("button", { name: "Details" }));
    const popup = await screen.findByRole("dialog");
    expect(popup.parentElement).toHaveClass("z-50", "custom-positioner");
    expect(popup.parentElement).toHaveAttribute("data-slot", "popover-positioner");
  });
});

describe("Popover container", () => {
  it("portals into the given container", async () => {
    function Framed() {
      const frameRef = useRef<HTMLDivElement>(null);
      return (
        <div ref={frameRef} data-testid="frame">
          <Example container={frameRef} />
        </div>
      );
    }
    const user = userEvent.setup();
    render(<Framed />);
    await user.click(screen.getByRole("button", { name: "Details" }));
    const popup = await screen.findByRole("dialog");
    expect(document.querySelector("[data-slot=popover-portal]")?.parentElement).toBe(screen.getByTestId("frame"));
    expect(screen.getByTestId("frame")).toContainElement(popup);
  });
});
