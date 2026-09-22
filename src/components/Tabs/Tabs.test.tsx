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
    const bar = document.querySelector('[data-slot="tabs-bar"]')!;
    expect(bar).toHaveClass("justify-between", "border-b");
    expect(screen.getByRole("tablist").closest('[data-slot="tabs-bar"]')).toBe(bar);
  });

  it("TabsBar: the list area shrinks and scrolls horizontally instead of pushing the action out", () => {
    render(
      <Tabs defaultValue="a">
        <TabsBar action={<button type="button">Aktion</button>}>
          <TabsList>
            <TabsTrigger value="a">Lagerbestand</TabsTrigger>
            <TabsTrigger value="b">Produktion</TabsTrigger>
          </TabsList>
        </TabsBar>
      </Tabs>,
    );
    const area = document.querySelector('[data-slot="tabs-bar-list"]')!;
    // Shrinkable flex item that takes the free space; the action keeps its size.
    expect(area).toHaveClass("min-w-0", "flex-1", "-mb-px");
    expect(area).toHaveAttribute("data-slot", "tabs-bar-list");
    expect(area.querySelector('[data-slot="scroll-area-viewport"]')).toContainElement(screen.getByRole("tablist"));
    // Horizontal only (Base UI renders the bar once content overflows), floating track, natural content width.
    expect(area.querySelector('[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]')).toBeNull();
    const content = area.querySelector('[data-slot="scroll-area-content"]')!;
    expect(content).toHaveClass("w-max", "pb-px");
    expect(content).not.toHaveClass("pb-2.5");
    expect(screen.getByRole("button", { name: "Aktion" }).parentElement).toHaveClass("shrink-0");
    // The bar draws the hairline, not the (nested) list.
    expect(document.querySelector('[data-slot="tabs-bar"]')).toHaveClass("[&_[role=tablist]]:border-b-0");
  });
});
