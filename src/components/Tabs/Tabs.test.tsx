import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Tabs, TabsBar, TabsContent, TabsList, TabsStack, TabsTrigger } from "./Tabs";

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

  it("moves the focus with the arrow keys and activates with Enter (Base UI's default)", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("tab", { name: "Mitglieder" }));
    await user.keyboard("{ArrowRight}");
    const roles = screen.getByRole("tab", { name: "Rollen" });
    expect(roles).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Mitglieder" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Mitgliederliste");
    await user.keyboard("{Enter}");
    expect(roles).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Rollenliste");
  });

  it("does not switch when focus returns to a tab (e.g. from a closing dialog)", () => {
    render(<Example />);
    act(() => screen.getByRole("tab", { name: "Rollen" }).focus());
    expect(screen.getByRole("tab", { name: "Mitglieder" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Mitgliederliste");
  });

  it("still activates on focus with activateOnFocus", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a">
        <TabsList activateOnFocus>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", { name: "A" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");
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

  it("TabsBar: the viewport is no extra Tab stop (the tabs are) and fades the overflowing edges", () => {
    render(
      <Tabs defaultValue="a">
        <TabsBar>
          <TabsList>
            <TabsTrigger value="a">A</TabsTrigger>
          </TabsList>
        </TabsBar>
      </Tabs>,
    );
    const area = document.querySelector('[data-slot="tabs-bar-list"]')!;
    const viewport = area.querySelector('[data-slot="scroll-area-viewport"]')!;
    expect(viewport).toHaveAttribute("tabindex", "-1");
    // ScrollArea's edge fade: on the side with hidden tabs, with the prefixed mask Chromium 103 needs.
    expect(area.className).toContain("data-[overflow-x-end]:[--pui-fade-end:2.5rem]");
    expect(area.className).toContain("data-[overflow-x-start]:[--pui-fade-start:2.5rem]");
    expect(viewport.className).toContain("[-webkit-mask-image:");
  });

  describe("TabsBar scrolls the active tab into view", () => {
    // jsdom has no layout: a 200px viewport, 100px tabs (index from data-index), positions follow scrollLeft.
    function mockLayout() {
      const spies = [
        vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(800),
        vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(200),
        vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
          if (this.dataset.slot === "scroll-area-viewport") return new DOMRect(0, 0, 200, 40);
          const viewport = this.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
          return new DOMRect(Number(this.dataset.index ?? 0) * 100 - (viewport?.scrollLeft ?? 0), 0, 100, 40);
        }),
      ];
      return () => spies.forEach((spy) => spy.mockRestore());
    }
    const values = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const viewport = () =>
      document.querySelector<HTMLElement>('[data-slot="tabs-bar-list"] [data-slot="scroll-area-viewport"]')!;

    it("when it changes, scrolling only the bar (never the page)", async () => {
      const restore = mockLayout();
      const pageScroll = vi.fn();
      Element.prototype.scrollIntoView = pageScroll;
      function Controlled() {
        const [value, setValue] = useState("a");
        return (
          <Tabs value={value} onValueChange={(next) => setValue(String(next))}>
            <TabsBar>
              <TabsList>
                {values.map((entry, index) => (
                  <TabsTrigger key={entry} value={entry} data-index={index}>
                    {entry.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </TabsBar>
            <button type="button" onClick={() => setValue("g")}>
              Zu G
            </button>
            <button type="button" onClick={() => setValue("b")}>
              Zu B
            </button>
          </Tabs>
        );
      }
      try {
        const user = userEvent.setup();
        render(<Controlled />);
        expect(viewport().scrollLeft).toBe(0);
        await user.click(screen.getByRole("button", { name: "Zu G" }));
        // G spans 600-700: its right edge plus the 40px fade gap lands on the viewport's right edge.
        await vi.waitFor(() => expect(viewport().scrollLeft).toBe(540));
        await user.click(screen.getByRole("button", { name: "Zu B" }));
        // B spans 100-200: scrolled back so it starts 40px after the left edge.
        await vi.waitFor(() => expect(viewport().scrollLeft).toBe(60));
        expect(pageScroll).not.toHaveBeenCalled();
      } finally {
        restore();
        delete (Element.prototype as Partial<Element>).scrollIntoView;
      }
    });

    it("when it starts out of view", () => {
      const restore = mockLayout();
      try {
        render(
          <Tabs defaultValue="e">
            <TabsBar>
              <TabsList>
                {values.map((entry, index) => (
                  <TabsTrigger key={entry} value={entry} data-index={index}>
                    {entry}
                  </TabsTrigger>
                ))}
              </TabsList>
            </TabsBar>
          </Tabs>,
        );
        // E spans 400-500.
        expect(viewport().scrollLeft).toBe(340);
      } finally {
        restore();
      }
    });
  });
});

describe("TabsStack", () => {
  function Stacked({ panelClassName }: { panelClassName?: string }) {
    return (
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Spieler</TabsTrigger>
          <TabsTrigger value="b">Logs</TabsTrigger>
        </TabsList>
        <TabsStack className="h-96">
          <TabsContent value="a">
            <input aria-label="Suche" />
          </TabsContent>
          <TabsContent value="b" className={panelClassName}>
            Logliste
          </TabsContent>
        </TabsStack>
      </Tabs>
    );
  }

  it("keeps every panel mounted in one grid cell; inactive ones are hidden, invisible and inert", () => {
    render(<Stacked />);
    const stack = document.querySelector('[data-slot="tabs-stack"]')!;
    expect(stack).toHaveClass("grid", "grid-rows-[minmax(0,1fr)]", "grid-cols-[minmax(0,1fr)]", "h-96");
    const panels = stack.querySelectorAll('[data-slot="tabs-content"]');
    expect(panels).toHaveLength(2);
    for (const panel of panels) {
      expect(panel).toHaveAttribute("data-stacked");
      expect(panel).toHaveClass(
        "block",
        "[grid-area:1/1]",
        "[&[hidden]]:invisible",
        "[&[inert]]:invisible",
        "[&[hidden]_*]:!transition-none",
        "[&[inert]_*]:!transition-none",
      );
    }
    expect(panels[0]).not.toHaveAttribute("hidden");
    expect(panels[1]).toHaveAttribute("hidden");
    expect(panels[1]).toHaveAttribute("inert");
    expect(panels[1]).toHaveTextContent("Logliste");
  });

  it("keeps the state of a panel across switches", async () => {
    const user = userEvent.setup();
    render(<Stacked />);
    await user.type(screen.getByRole("textbox", { name: "Suche" }), "Max");
    await user.click(screen.getByRole("tab", { name: "Logs" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Logliste");
    await user.click(screen.getByRole("tab", { name: "Spieler" }));
    expect(screen.getByRole("textbox", { name: "Suche" })).toHaveValue("Max");
  });

  it("lets a panel use its own display and opt out of keepMounted", () => {
    render(<Stacked panelClassName="flex flex-col" />);
    const panel = screen.getByText("Logliste").closest('[data-slot="tabs-content"]')!;
    expect(panel).toHaveClass("flex", "flex-col");
    expect(panel).not.toHaveClass("block");
    render(
      <Tabs defaultValue="a">
        <TabsStack>
          <TabsContent value="a">Eins</TabsContent>
          <TabsContent value="b" keepMounted={false}>
            Zwei
          </TabsContent>
        </TabsStack>
      </Tabs>,
    );
    expect(screen.queryByText("Zwei")).toBeNull();
  });

  it("leaves TabsContent outside a stack unchanged (inactive panels unmount)", () => {
    render(<Example />);
    expect(screen.queryByText("Rollenliste")).toBeNull();
    expect(screen.getByRole("tabpanel")).not.toHaveAttribute("data-stacked");
    expect(screen.getByRole("tabpanel")).not.toHaveClass("block");
  });
});
