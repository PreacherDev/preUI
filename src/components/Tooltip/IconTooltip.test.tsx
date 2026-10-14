import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WithTooltip } from "./IconTooltip";
import { TooltipProvider } from "./Tooltip";
import type { IconTooltip } from "./IconTooltip";

function Example({ tooltip, provider = true }: { tooltip?: IconTooltip; provider?: boolean }) {
  const button = (
    <WithTooltip tooltip={tooltip} label="Speichern">
      <button type="button">X</button>
    </WithTooltip>
  );
  return provider ? <TooltipProvider delay={0}>{button}</TooltipProvider> : button;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("WithTooltip", () => {
  it("shows the label of the button", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.hover(screen.getByRole("button"));
    expect(await screen.findByText("Speichern")).toHaveAttribute("data-slot", "tooltip-content");
  });

  it("renders the button alone without a tooltip when tooltip is false", async () => {
    const user = userEvent.setup();
    render(<Example tooltip={false} />);
    await user.hover(screen.getByRole("button"));
    await wait(50);
    expect(screen.queryByText("Speichern")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).not.toHaveAttribute("data-slot", "tooltip-trigger");
  });

  it("renders the button alone when there is no text at all", () => {
    render(
      <WithTooltip>
        <button type="button">X</button>
      </WithTooltip>,
    );
    expect(screen.getByRole("button")).not.toHaveAttribute("data-slot", "tooltip-trigger");
  });

  it("takes a text instead of the label", async () => {
    const user = userEvent.setup();
    render(<Example tooltip="Eigener Text" />);
    await user.hover(screen.getByRole("button"));
    expect(await screen.findByText("Eigener Text")).toBeInTheDocument();
    expect(screen.queryByText("Speichern")).not.toBeInTheDocument();
  });

  it("takes options with side, content and className", async () => {
    const user = userEvent.setup();
    render(<Example tooltip={{ side: "bottom", content: "Unten", className: "custom-tip" }} />);
    await user.hover(screen.getByRole("button"));
    const popup = await screen.findByText("Unten");
    expect(popup).toHaveAttribute("data-side", "bottom");
    expect(popup).toHaveClass("custom-tip", "bg-pui-tooltip");
  });

  it("works without a TooltipProvider and takes its own delay", async () => {
    const user = userEvent.setup();
    render(<Example provider={false} tooltip={{ delay: 0 }} />);
    await user.hover(screen.getByRole("button"));
    expect(await screen.findByText("Speichern")).toBeInTheDocument();
  });

  it("uses the shared delay of the TooltipProvider", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await user.hover(screen.getByRole("button"));
    await wait(30);
    // delay={0} on the provider reaches the built-in tooltip …
    expect(screen.queryByText("Speichern")).toBeInTheDocument();
    unmount();

    // … while without a provider Base UI's slower default applies.
    render(<Example provider={false} />);
    await user.hover(screen.getByRole("button"));
    await wait(30);
    expect(screen.queryByText("Speichern")).not.toBeInTheDocument();
  });
});
