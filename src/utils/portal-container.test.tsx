import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "../components/Dialog/Dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/DropdownMenu/DropdownMenu";
import { Popover, PopoverContent, PopoverTrigger } from "../components/Popover/Popover";
import { Sheet, SheetContent, SheetTitle } from "../components/Sheet/Sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/Tooltip/Tooltip";
import { PortalContainerProvider } from "./portal-container";

/** A scoped theme root with a dedicated portal layer, like the ThemeEditor preview. */
function Scoped({ children }: { children: React.ReactNode }) {
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  return (
    <div data-testid="scope" data-scheme="light">
      <PortalContainerProvider container={layer}>{children}</PortalContainerProvider>
      <div ref={setLayer} data-testid="layer" />
    </div>
  );
}

describe("PortalContainerProvider", () => {
  it("is the default portal container of floating popups", async () => {
    render(
      <Scoped>
        <Popover defaultOpen>
          <PopoverTrigger>Info</PopoverTrigger>
          <PopoverContent>Inhalt</PopoverContent>
        </Popover>
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Menü</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Bearbeiten</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipProvider>
          <Tooltip defaultOpen>
            <TooltipTrigger>Hilfe</TooltipTrigger>
            <TooltipContent>Tipp</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Scoped>,
    );
    const layer = screen.getByTestId("layer");
    expect(layer).toContainElement(await screen.findByText("Inhalt"));
    expect(layer).toContainElement(await screen.findByRole("menu"));
    expect(layer).toContainElement(await screen.findByText("Tipp"));
  });

  it.each([
    ["Dialog", <Dialog key="d" defaultOpen><DialogContent><DialogTitle>Modal</DialogTitle></DialogContent></Dialog>],
    ["Sheet", <Sheet key="s" defaultOpen><SheetContent><SheetTitle>Modal</SheetTitle></SheetContent></Sheet>],
  ])("is the default container of a %s, which stays positioned against the viewport", async (_name, modal) => {
    render(<Scoped>{modal}</Scoped>);
    const popup = await screen.findByRole("dialog", { name: "Modal" });
    expect(screen.getByTestId("layer")).toContainElement(popup);
    expect(popup).toHaveClass("fixed");
    expect(popup).not.toHaveAttribute("data-contained");
  });

  it("loses to an explicit container prop", async () => {
    const own = document.createElement("div");
    document.body.appendChild(own);
    render(
      <Scoped>
        <Popover defaultOpen>
          <PopoverTrigger>Info</PopoverTrigger>
          <PopoverContent container={own}>Eigener Ort</PopoverContent>
        </Popover>
      </Scoped>,
    );
    expect(own).toContainElement(await screen.findByText("Eigener Ort"));
    own.remove();
  });

  it("lets popups nested in another popup follow their parent's portal", async () => {
    render(
      <Scoped>
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Dialog</DialogTitle>
            <Popover>
              <PopoverTrigger>Info</PopoverTrigger>
              <PopoverContent>Verschachtelt</PopoverContent>
            </Popover>
          </DialogContent>
        </Dialog>
      </Scoped>,
    );
    await screen.findByRole("dialog", { name: "Dialog" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Info" }));
    const dialogPortal = document.querySelector<HTMLElement>('[data-slot="dialog-portal"]');
    expect(dialogPortal).not.toBeNull();
    expect(dialogPortal).toContainElement(await screen.findByText("Verschachtelt"));
    expect(screen.getByTestId("layer")).toContainElement(dialogPortal);
  });

  it("changes nothing without a provider", async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>,
    );
    const content = await screen.findByText("Body");
    expect(content.closest("[data-base-ui-portal], [data-slot='popover-portal']")?.parentElement).toBe(document.body);
  });
});
