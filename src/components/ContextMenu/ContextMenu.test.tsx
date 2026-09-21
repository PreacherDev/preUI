import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "./ContextMenu";

function Example({ onCopy = () => {} }: { onCopy?: () => void }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger data-testid="area">Rechtsklick hier</ContextMenuTrigger>
      <ContextMenuContent className={() => "fn-class"}>
        <ContextMenuItem onClick={onCopy}>
          Kopieren <ContextMenuShortcut>Strg+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled>Einfügen</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem defaultChecked>Raster anzeigen</ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

describe("ContextMenu", () => {
  it("names the shared menu parts with the context-menu prefix", async () => {
    render(<Example />);
    expect(screen.getByTestId("area")).toHaveAttribute("data-slot", "context-menu-trigger");
    fireEvent.contextMenu(screen.getByTestId("area"), { clientX: 20, clientY: 20 });
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveAttribute("data-slot", "context-menu-content");
    expect(screen.getByRole("menuitem", { name: /Kopieren/ })).toHaveAttribute("data-slot", "context-menu-item");
    expect(screen.getByRole("menuitemcheckbox")).toHaveAttribute("data-slot", "context-menu-checkbox-item");
    expect(screen.getByText("Strg+C")).toHaveAttribute("data-slot", "context-menu-shortcut");
    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "context-menu-separator");
  });

  it("opens on right click with the shared menu styles", async () => {
    render(<Example />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByTestId("area"), { clientX: 20, clientY: 20 });

    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("bg-pui-popover", "rounded-pui-md", "max-h-[var(--available-height)]", "fn-class");
    expect(menu).not.toHaveClass("overflow-y-auto");
    // Items scroll inside the preUI ScrollArea; its viewport is not a Tab stop.
    const viewport = menu.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).toHaveAttribute("tabindex", "-1");
    expect(viewport?.firstElementChild).toHaveClass("p-1");
    expect(viewport).toContainElement(screen.getByRole("menuitem", { name: /Kopieren/ }));
    expect(screen.getByRole("menuitem", { name: /Kopieren/ })).toHaveClass("rounded-pui-sm", "gap-2.5");
    expect(screen.getByRole("separator")).toHaveClass("bg-pui-border");
  });

  it("selects an item and closes", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<Example onCopy={onCopy} />);
    fireEvent.contextMenu(screen.getByTestId("area"), { clientX: 20, clientY: 20 });
    await user.click(await screen.findByRole("menuitem", { name: /Kopieren/ }));
    expect(onCopy).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("renders disabled and checked states", async () => {
    render(<Example />);
    fireEvent.contextMenu(screen.getByTestId("area"), { clientX: 20, clientY: 20 });
    expect(await screen.findByRole("menuitem", { name: "Einfügen" })).toHaveAttribute("data-disabled");
    expect(screen.getByRole("menuitemcheckbox", { name: "Raster anzeigen" })).toHaveAttribute("aria-checked", "true");
  });
});
