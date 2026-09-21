import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "../Toggle/Toggle";
import {
  Toolbar,
  ToolbarButton,
  ToolbarGroup,
  ToolbarInput,
  ToolbarLink,
  ToolbarSeparator,
} from "./Toolbar";

function Example(props: { variant?: "default" | "panel" }) {
  return (
    <Toolbar aria-label="Formatierung" variant={props.variant}>
      <ToolbarGroup aria-label="Stil">
        <ToolbarButton>Fett</ToolbarButton>
        <ToolbarButton disabled>Kursiv</ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarLink href="#hilfe">Hilfe</ToolbarLink>
      <ToolbarInput aria-label="Suche" placeholder="Suchen" />
    </Toolbar>
  );
}

describe("Toolbar", () => {
  it("renders a toolbar with its parts", () => {
    render(<Example />);
    expect(screen.getByRole("toolbar", { name: "Formatierung" })).toHaveClass("flex", "gap-1");
    expect(screen.getByRole("group", { name: "Stil" })).toHaveClass("gap-0.5");
    expect(screen.getByRole("button", { name: "Fett" })).toHaveClass("h-pui-control-sm");
    expect(screen.getByRole("link", { name: "Hilfe" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Suche" })).toHaveClass("h-pui-control-sm");
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("data-orientation", "vertical");
  });

  it("applies the panel variant", () => {
    render(<Example variant="panel" />);
    expect(screen.getByRole("toolbar")).toHaveClass("border-pui-border", "bg-pui-card", "p-1");
  });

  it("moves focus with the arrow keys and calls onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Toolbar aria-label="Aktionen">
        <ToolbarButton onClick={onClick}>Eins</ToolbarButton>
        <ToolbarButton>Zwei</ToolbarButton>
      </Toolbar>,
    );
    await user.click(screen.getByRole("button", { name: "Eins" }));
    expect(onClick).toHaveBeenCalledOnce();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: "Zwei" })).toHaveFocus();
  });

  it("composes with Toggle", async () => {
    const user = userEvent.setup();
    render(
      <Toolbar aria-label="Aktionen">
        <ToolbarButton render={<Toggle size="sm" />}>Fett</ToolbarButton>
      </Toolbar>,
    );
    const button = screen.getByRole("button", { name: "Fett" });
    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("merges className, including the function form", () => {
    render(
      <Toolbar aria-label="Aktionen" className={(state) => (state.disabled ? "is-off" : "is-on")}>
        <ToolbarButton className="px-4">Eins</ToolbarButton>
      </Toolbar>,
    );
    expect(screen.getByRole("toolbar")).toHaveClass("is-on", "flex");
    expect(screen.getByRole("button")).toHaveClass("px-4");
    expect(screen.getByRole("button")).not.toHaveClass("px-2.5");
  });

  it("marks disabled buttons", () => {
    render(<Example />);
    expect(screen.getByRole("button", { name: "Kursiv" })).toHaveAttribute("data-disabled");
  });
});

describe("Toolbar data attributes", () => {
  it("marks every part with data-slot", () => {
    const { container } = render(
      <Toolbar aria-label="Format" variant="panel">
        <ToolbarGroup>
          <ToolbarButton>Fett</ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarLink href="#">Hilfe</ToolbarLink>
        <ToolbarInput aria-label="Suche" />
      </Toolbar>,
    );
    const toolbar = screen.getByRole("toolbar", { name: "Format" });
    expect(toolbar).toHaveAttribute("data-slot", "toolbar");
    expect(toolbar).toHaveAttribute("data-variant", "panel");
    for (const slot of ["toolbar-group", "toolbar-button", "toolbar-separator", "toolbar-link", "toolbar-input"]) {
      expect(container.querySelector(`[data-slot=${slot}]`)).not.toBeNull();
    }
    expect(screen.getByRole("button", { name: "Fett" })).toHaveAttribute("data-size", "sm");
  });
});
