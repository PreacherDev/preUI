import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "./Menubar";

function Example({ onNew = () => {} }: { onNew?: () => void }) {
  return (
    <Menubar className="custom-bar">
      <MenubarMenu>
        <MenubarTrigger className={(state) => (state.open ? "is-open" : "is-closed")}>Datei</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onNew}>Neu</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Speichern</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger disabled>Bearbeiten</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Rückgängig</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}

describe("Menubar", () => {
  it("renders a menubar with ghost-style triggers", () => {
    render(<Example />);
    const bar = screen.getByRole("menubar");
    expect(bar).toHaveClass("flex", "border-pui-border", "custom-bar");
    const trigger = screen.getByRole("menuitem", { name: "Datei" });
    expect(trigger).toHaveClass("h-pui-control-sm", "hover:bg-pui-accent", "focus-visible:ring-pui", "is-closed");
    expect(bar).toHaveAttribute("data-slot", "menubar");
    expect(trigger).toHaveAttribute("data-slot", "menubar-trigger");
  });

  it("names the popup and shared items with the menubar prefix", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("menuitem", { name: "Datei" }));
    const item = await screen.findByRole("menuitem", { name: "Neu" });
    expect(item).toHaveAttribute("data-slot", "menubar-item");
    expect(screen.getByRole("menu")).toHaveAttribute("data-slot", "menubar-content");
    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "menubar-separator");
  });

  it("opens a menu with the shared menu styles and selects an item", async () => {
    const user = userEvent.setup();
    const onNew = vi.fn();
    render(<Example onNew={onNew} />);
    await user.click(screen.getByRole("menuitem", { name: "Datei" }));

    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("bg-pui-popover", "shadow-pui-floating");
    expect(menu.querySelector('[data-slot="scroll-area-viewport"]')).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("menuitem", { name: "Datei" })).toHaveClass("is-open");
    const item = screen.getByRole("menuitem", { name: "Neu" });
    expect(item).toHaveClass("rounded-pui-sm", "p-2");
    await user.click(item);
    expect(onNew).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("marks disabled triggers", () => {
    render(<Example />);
    expect(screen.getByRole("menuitem", { name: "Bearbeiten" })).toHaveAttribute("data-disabled");
  });
});
