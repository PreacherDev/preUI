import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsBar, TabsContent, TabsList, TabsTrigger } from "./Tabs";

function Example() {
  return (
    <Tabs defaultValue="members">
      <TabsList>
        <TabsTrigger value="members">Mitglieder</TabsTrigger>
        <TabsTrigger value="roles">Rollen</TabsTrigger>
        <TabsTrigger value="audit" disabled>
          Protokoll
        </TabsTrigger>
      </TabsList>
      <TabsContent value="members">Mitgliederliste</TabsContent>
      <TabsContent value="roles">Rollenliste</TabsContent>
      <TabsContent value="audit">Protokollliste</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("marks its parts with data-slot and uses the ring/motion tokens", () => {
    render(<Example />);
    const list = screen.getByRole("tablist");
    expect(list).toHaveAttribute("data-slot", "tabs-list");
    expect(list.closest('[data-slot="tabs"]')).toBeInTheDocument();
    const tab = screen.getByRole("tab", { name: "Mitglieder" });
    expect(tab).toHaveAttribute("data-slot", "tabs-trigger");
    expect(tab).toHaveClass("focus-visible:ring-pui", "duration-pui-fast", "ease-pui");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("data-slot", "tabs-content");
  });

  it("renders a tablist with the active tab underlined", () => {
    render(<Example />);
    expect(screen.getByRole("tablist")).toHaveClass("border-b", "border-pui-border");
    const active = screen.getByRole("tab", { name: "Mitglieder" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).toHaveAttribute("data-active");
    expect(active).toHaveClass("border-b-2", "data-[active]:border-pui-foreground");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Mitgliederliste");
  });

  it("activates tabs with the arrow keys like shadcn", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("tab", { name: "Mitglieder" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Rollen" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Rollenliste");
  });

  it("switches panels on click", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("tab", { name: "Rollen" }));
    expect(screen.getByRole("tab", { name: "Rollen" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Rollenliste");
  });

  it("ignores disabled tabs", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const disabled = screen.getByRole("tab", { name: "Protokoll" });
    expect(disabled).toHaveAttribute("data-disabled");
    await user.click(disabled);
    expect(screen.getByRole("tab", { name: "Mitglieder" })).toHaveAttribute("aria-selected", "true");
  });

  it("merges className, including the function form", () => {
    render(
      <Tabs defaultValue="a">
        <TabsList className="gap-3">
          <TabsTrigger value="a" className={(state) => (state.active ? "is-active" : "is-idle")}>
            A
          </TabsTrigger>
          <TabsTrigger value="b" className="px-5">
            B
          </TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(screen.getByRole("tablist")).toHaveClass("gap-3");
    expect(screen.getByRole("tablist")).not.toHaveClass("gap-1");
    expect(screen.getByRole("tab", { name: "A" })).toHaveClass("is-active", "pb-2.5");
    expect(screen.getByRole("tab", { name: "B" })).toHaveClass("px-5");
    expect(screen.getByRole("tab", { name: "B" })).not.toHaveClass("px-3");
  });

  it("renders a TabsBar with a trailing action", () => {
    render(
      <Tabs defaultValue="a">
        <TabsBar action={<button type="button">Lager kaufen</button>}>
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
          </TabsList>
        </TabsBar>
      </Tabs>,
    );
    expect(screen.getByRole("button", { name: "Lager kaufen" })).toBeInTheDocument();
    expect(screen.getByRole("tablist").parentElement).toHaveClass("justify-between", "border-b");
  });
});
