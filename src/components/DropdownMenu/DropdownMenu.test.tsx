import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./DropdownMenu";

function Example({ onSelect = () => {} }: { onSelect?: () => void }) {
  const [compact, setCompact] = useState(false);
  const [sort, setSort] = useState("date");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Aktionen</DropdownMenuTrigger>
      <DropdownMenuContent className="custom-popup">
        <DropdownMenuLabel inset>Konto</DropdownMenuLabel>
        <DropdownMenuItem onClick={onSelect} className={(state) => (state.highlighted ? "is-hl" : "is-rest")}>
          Bearbeiten <DropdownMenuShortcut>Strg+E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Konto entfernen</DropdownMenuItem>
        <DropdownMenuItem description="Nur für Admins" disabled>
          Löschen
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={compact} onCheckedChange={setCompact}>
          Kompakt
        </DropdownMenuCheckboxItem>
        <DropdownMenuGroup>
          <DropdownMenuGroupLabel>Sortierung</DropdownMenuGroupLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
            <DropdownMenuRadioItem value="date">Datum</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Exportieren</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>PDF</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("marks every part with data-slot", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Aktionen" });
    expect(trigger).toHaveAttribute("data-slot", "dropdown-menu-trigger");
    await user.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveAttribute("data-slot", "dropdown-menu-content");
    expect(menu).toHaveClass("shadow-pui-floating", "duration-pui-base", "ease-pui");
    const edit = screen.getByRole("menuitem", { name: /Bearbeiten/ });
    expect(edit).toHaveAttribute("data-slot", "dropdown-menu-item");
    expect(edit).toHaveAttribute("data-variant", "default");
    expect(edit).toHaveClass("duration-pui-fast");
    expect(screen.getByText("Strg+E")).toHaveAttribute("data-slot", "dropdown-menu-shortcut");
    expect(screen.getByText("Konto")).toHaveAttribute("data-slot", "dropdown-menu-label");
    expect(screen.getByText("Konto")).toHaveAttribute("data-inset");
    expect(screen.getByText("Nur für Admins")).toHaveAttribute("data-slot", "dropdown-menu-item-description");
    expect(screen.getByRole("menuitemcheckbox")).toHaveAttribute("data-slot", "dropdown-menu-checkbox-item");
    expect(screen.getByRole("menuitemradio", { name: "Datum" })).toHaveAttribute("data-slot", "dropdown-menu-radio-item");
    expect(screen.getByText("Sortierung")).toHaveAttribute("data-slot", "dropdown-menu-group-label");
    expect(screen.getByRole("separator")).toHaveAttribute("data-slot", "dropdown-menu-separator");
    const subTrigger = screen.getByRole("menuitem", { name: "Exportieren" });
    expect(subTrigger).toHaveAttribute("data-slot", "dropdown-menu-sub-trigger");
    await user.click(subTrigger);
    const pdf = await screen.findByRole("menuitem", { name: "PDF" });
    expect(pdf.closest('[data-slot="dropdown-menu-sub-content"]')).toBeInTheDocument();
  });

  it("opens on trigger click and renders styled parts", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Aktionen" }));

    const menu = await screen.findByRole("menu");
    expect(menu).toHaveClass("bg-pui-popover", "shadow-pui-floating", "min-w-48", "custom-popup");
    // Long menus scroll inside the preUI ScrollArea, capped at the available height; no native overflow.
    expect(menu).toHaveClass("max-h-[var(--available-height)]", "flex-col");
    expect(menu).not.toHaveClass("overflow-y-auto");
    const viewport = menu.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).toHaveClass("max-h-[calc(var(--available-height)-2px)]");
    expect(viewport).toHaveAttribute("tabindex", "-1");
    expect(viewport?.firstElementChild).toHaveClass("p-1");
    expect(viewport).toContainElement(screen.getByText("Strg+E"));
    expect(screen.getByText("Konto")).toHaveClass("text-pui-eyebrow", "uppercase");
    expect(screen.getByText("Strg+E")).toHaveClass("ml-auto", "text-pui-muted-foreground");
    expect(screen.getByRole("separator")).toHaveClass("h-px", "bg-pui-border");
    expect(screen.getByText("Nur für Admins")).toHaveClass("text-xs");
  });

  it("styles the destructive variant and inset labels", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Aktionen" }));
    const item = await screen.findByRole("menuitem", { name: "Konto entfernen" });
    expect(item).toHaveClass("text-pui-negative", "data-[highlighted]:bg-pui-negative/tint");
    expect(item).toHaveAttribute("data-slot", "dropdown-menu-item");
    expect(item).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByRole("menuitem", { name: /Bearbeiten/ })).not.toHaveClass("text-pui-negative");
    // Inset text lines up with icon rows: 8px padding + 16px icon + 10px gap = 34px.
    expect(screen.getByText("Konto")).toHaveClass("pl-[2.125rem]");
    expect(screen.getByRole("menuitemcheckbox", { name: "Kompakt" })).toHaveClass("pl-[2.125rem]");
    expect(screen.getByRole("menuitemradio", { name: "Datum" })).toHaveClass("pl-[2.125rem]");
  });

  it("merges the className function form on items", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Aktionen" }));
    const item = await screen.findByRole("menuitem", { name: /Bearbeiten/ });
    expect(item).toHaveClass("rounded-pui-sm", "p-2");
    expect(item.className).toMatch(/is-(hl|rest)/);
  });

  it("calls onClick and closes when an item is selected", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Example onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Aktionen" }));
    await user.click(await screen.findByRole("menuitem", { name: /Bearbeiten/ }));
    expect(onSelect).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("marks disabled items", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Aktionen" }));
    const item = await screen.findByRole("menuitem", { name: /Löschen/ });
    expect(item).toHaveAttribute("data-disabled");
    expect(item).toHaveClass("data-[disabled]:opacity-50");
  });

  it("toggles checkbox items and selects radio items", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Aktionen" }));
    const checkbox = await screen.findByRole("menuitemcheckbox", { name: "Kompakt" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    await user.click(checkbox);
    expect(screen.getByRole("menuitemcheckbox", { name: "Kompakt" })).toHaveAttribute("aria-checked", "true");

    const name = screen.getByRole("menuitemradio", { name: "Name" });
    await user.click(name);
    expect(screen.getByRole("menuitemradio", { name: "Name" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "Datum" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("group", { name: "Sortierung" })).toBeInTheDocument();
  });

  it("opens a submenu", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Aktionen" }));
    const subTrigger = await screen.findByRole("menuitem", { name: "Exportieren" });
    expect(subTrigger.querySelector("svg")).toBeInTheDocument();
    await user.click(subTrigger);
    const pdf = await screen.findByRole("menuitem", { name: "PDF" });
    // The submenu is a separate (portalled) popup with its own ScrollArea, not clipped by the parent's.
    const menus = screen.getAllByRole("menu");
    expect(menus).toHaveLength(2);
    expect(menus[0]).not.toContainElement(pdf);
    expect(pdf.closest('[data-slot="scroll-area-viewport"]')).toBeInTheDocument();
  });
});
