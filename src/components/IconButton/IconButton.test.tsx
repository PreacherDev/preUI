import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../DropdownMenu";
import { TooltipProvider } from "../Tooltip";
import { IconButton } from "./IconButton";

const Icon = () => (
  <svg aria-hidden="true">
    <title>icon</title>
  </svg>
);

describe("IconButton", () => {
  it("labels the button and shows the label as a tooltip", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <IconButton label="Speichern" icon={<Icon />} />
      </TooltipProvider>,
    );
    const button = screen.getByRole("button", { name: "Speichern" });
    expect(button).toHaveAttribute("data-slot", "icon-button");
    expect(button).toHaveClass("size-pui-control");
    await user.hover(button);
    expect(await screen.findByText("Speichern")).toHaveAttribute("data-slot", "tooltip-content");
  });

  it("is a ghost button in the default control size", () => {
    render(<IconButton label="Mehr" icon={<Icon />} />);
    const button = screen.getByRole("button", { name: "Mehr" });
    expect(button).toHaveAttribute("data-variant", "ghost");
    expect(button).toHaveClass("size-pui-control");
  });

  it("maps the text sizes to the square icon sizes", () => {
    const { rerender } = render(<IconButton label="Mehr" icon={<Icon />} size="sm" />);
    expect(screen.getByRole("button")).toHaveClass("size-pui-control-sm");
    rerender(<IconButton label="Mehr" icon={<Icon />} size="lg" />);
    expect(screen.getByRole("button")).toHaveClass("size-pui-control-lg");
    rerender(<IconButton label="Mehr" icon={<Icon />} size="icon-sm" />);
    expect(screen.getByRole("button")).toHaveClass("size-pui-control-sm");
  });

  it("passes variant and className through and still has no tooltip with tooltip={false}", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <IconButton label="Löschen" icon={<Icon />} variant="destructive" className="my-icon" tooltip={false} />
      </TooltipProvider>,
    );
    const button = screen.getByRole("button", { name: "Löschen" });
    expect(button).toHaveClass("my-icon", "text-pui-negative");
    await user.hover(button);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("Löschen")).not.toBeInTheDocument();
  });

  it("takes an own tooltip text and side", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <IconButton label="Discord" icon={<Icon />} tooltip={{ side: "bottom", content: "Discord öffnen" }} />
      </TooltipProvider>,
    );
    await user.hover(screen.getByRole("button", { name: "Discord" }));
    const popup = await screen.findByText("Discord öffnen");
    expect(popup).toHaveAttribute("data-side", "bottom");
  });

  it("works without a TooltipProvider", async () => {
    const user = userEvent.setup();
    render(<IconButton label="Speichern" icon={<Icon />} tooltip={{ delay: 0 }} />);
    await user.hover(screen.getByRole("button", { name: "Speichern" }));
    expect(await screen.findByText("Speichern")).toBeInTheDocument();
  });

  it("is disabled like a Button and fires onClick otherwise", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<IconButton label="Mehr" icon={<Icon />} disabled onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "Mehr" }));
    expect(onClick).not.toHaveBeenCalled();
    rerender(<IconButton label="Mehr" icon={<Icon />} onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "Mehr" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("works as the render of a DropdownMenuTrigger", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delay={0}>
        <DropdownMenu>
          <DropdownMenuTrigger render={<IconButton label="Aktionen" icon={<Icon />} />} />
          <DropdownMenuContent>
            <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Aktionen" });
    expect(trigger).toHaveAttribute("aria-haspopup");
    await user.click(trigger);
    expect(await screen.findByRole("menuitem", { name: "Bearbeiten" })).toBeInTheDocument();
  });
});
