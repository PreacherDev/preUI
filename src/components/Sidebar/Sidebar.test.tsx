import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./Sidebar";
import type { SidebarProps, SidebarProviderProps } from "./Sidebar";

import { SIDEBAR_COOKIE_MAX_AGE, getSidebarStateFromCookie } from "./Sidebar";
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function StateProbe() {
  const { state, open } = useSidebar();
  return <output data-testid="probe">{`${state}:${open}`}</output>;
}

function Example({
  providerProps,
  sidebarProps,
}: {
  providerProps?: Partial<SidebarProviderProps>;
  sidebarProps?: Partial<SidebarProps>;
}) {
  return (
    <SidebarProvider data-testid="wrapper" {...providerProps}>
      <Sidebar data-testid="sidebar" {...sidebarProps}>
        <SidebarHeader>
          <SidebarInput placeholder="Suchen" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Betrieb</SidebarGroupLabel>
            <SidebarGroupAction aria-label="Eintrag hinzufügen">+</SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive tooltip="Übersicht">
                    <svg aria-hidden="true" />
                    <span>Übersicht</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Lager">
                    <svg aria-hidden="true" />
                    <span>Lager</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>3</SidebarMenuBadge>
                  <SidebarMenuAction showOnHover aria-label="Mehr">
                    …
                  </SidebarMenuAction>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton href="#halle-1" isActive>
                        <span>Halle 1</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
        </SidebarContent>
        <SidebarFooter>Fuß</SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger />
        <StateProbe />
      </SidebarInset>
    </SidebarProvider>
  );
}

function getTrigger() {
  return document.querySelector<HTMLElement>('[data-sidebar="trigger"]')!;
}

function sidebarRoot() {
  return document.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
}

beforeEach(() => {
  mockMatchMedia(false);
  document.cookie = "sidebar_state=; max-age=0; path=/";
});

describe("Sidebar", () => {
  it("renders the provider, sidebar and inset structure", () => {
    render(<Example />);
    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper).toHaveAttribute("data-slot", "sidebar-wrapper");
    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("13rem");
    expect(wrapper.style.getPropertyValue("--sidebar-width-icon")).toBe("3.5rem");

    const root = sidebarRoot();
    expect(root).toHaveAttribute("data-state", "expanded");
    expect(root).toHaveAttribute("data-side", "left");
    expect(root).toHaveAttribute("data-variant", "sidebar");
    expect(root).toHaveAttribute("data-collapsible", "");
    expect(screen.getByTestId("sidebar")).toHaveAttribute("data-slot", "sidebar-container");
    expect(document.querySelector('[data-sidebar="sidebar"]')).toHaveClass("bg-pui-shell");

    expect(screen.getByRole("main")).toHaveAttribute("data-slot", "sidebar-inset");
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Übersicht/ })).toHaveAttribute("data-sidebar", "menu-button");
    expect(screen.getByText("Betrieb")).toHaveClass("text-pui-eyebrow", "uppercase");
    expect(screen.getByText("3")).toHaveClass("rounded-full", "bg-pui-primary", "text-pui-2xs");
    // Handoff NavRail: the counter stays visible in the icon rail (top-right of the icon), it is not hidden.
    expect(screen.getByText("3")).not.toHaveClass("group-data-[collapsible=icon]:hidden");
    expect(screen.getByText("3")).toHaveClass("group-data-[collapsible=icon]:!left-6", "group-data-[collapsible=icon]:!top-1");
    expect(document.querySelector('[data-sidebar="separator"]')).toHaveClass(
      "group-data-[collapsible=icon]:data-[orientation=horizontal]:w-6",
    );
    expect(screen.getByRole("button", { name: "Eintrag hinzufügen" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("button", { name: "Mehr" })).toHaveClass("md:opacity-0");
    expect(screen.getByRole("link", { name: "Halle 1" })).toHaveAttribute("data-active", "true");
    expect(screen.getByPlaceholderText("Suchen")).toHaveAttribute("data-sidebar", "input");
    expect(document.querySelector('[data-sidebar="separator"]')).toHaveClass("bg-pui-border");
  });

  it("toggles expanded/collapsed with the trigger and stores the state in a cookie", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = getTrigger();
    expect(trigger).toHaveAccessibleName("Toggle Sidebar");
    expect(trigger).toHaveClass("size-pui-control-sm");

    await user.click(trigger);
    expect(sidebarRoot()).toHaveAttribute("data-state", "collapsed");
    expect(sidebarRoot()).toHaveAttribute("data-collapsible", "offcanvas");
    expect(screen.getByTestId("probe")).toHaveTextContent("collapsed:false");
    expect(document.cookie).toContain("sidebar_state=false");

    await user.click(trigger);
    expect(sidebarRoot()).toHaveAttribute("data-state", "expanded");
    expect(document.cookie).toContain("sidebar_state=true");
  });

  it("toggles via the rail and supports a custom trigger label", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarRail label="Leiste umschalten" />
        </Sidebar>
        <SidebarTrigger label="Navigation umschalten" />
      </SidebarProvider>,
    );
    expect(screen.getByRole("button", { name: "Navigation umschalten" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Leiste umschalten" }));
    expect(sidebarRoot()).toHaveAttribute("data-state", "collapsed");
  });

  it("toggles with Ctrl+B and Cmd+B", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.keyboard("{Control>}b{/Control}");
    expect(sidebarRoot()).toHaveAttribute("data-state", "collapsed");
    await user.keyboard("{Meta>}b{/Meta}");
    expect(sidebarRoot()).toHaveAttribute("data-state", "expanded");
    await user.keyboard("b");
    expect(sidebarRoot()).toHaveAttribute("data-state", "expanded");
  });

  it("can disable the keyboard shortcut", async () => {
    const user = userEvent.setup();
    render(<Example providerProps={{ keyboardShortcut: false }} />);
    await user.keyboard("{Control>}b{/Control}");
    expect(sidebarRoot()).toHaveAttribute("data-state", "expanded");
  });

  it("shows menu tooltips on the right only while collapsed to icons", async () => {
    const user = userEvent.setup();
    render(<Example sidebarProps={{ collapsible: "icon" }} />);
    const lager = screen.getByRole("button", { name: "Lager" });

    await user.hover(lager);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText("Lager", { selector: "[data-side]" })).not.toBeInTheDocument();
    await user.unhover(lager);

    await user.click(getTrigger());
    expect(sidebarRoot()).toHaveAttribute("data-collapsible", "icon");

    await user.hover(lager);
    const tooltip = await screen.findByText("Lager", { selector: "[data-side]" });
    expect(tooltip).toHaveAttribute("data-side", "right");
    expect(tooltip).toHaveClass("bg-pui-tooltip");
    await user.unhover(lager);
    await waitFor(() => expect(screen.queryByText("Lager", { selector: "[data-side]" })).not.toBeInTheDocument());
  });

  it("marks the active menu button and applies size/variant", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive>Übersicht</SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton size="sm" variant="outline">
                Kassenbuch
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton render={<a href="/lager" />}>Lager</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>,
    );
    const active = screen.getByRole("button", { name: "Übersicht" });
    expect(active).toHaveAttribute("data-active", "true");
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveAttribute("data-size", "default");
    expect(active).toHaveClass("h-pui-control-lg", "data-[active=true]:bg-pui-rail-active", "hover:bg-pui-accent/50");
    expect(active).toHaveAttribute("data-slot", "sidebar-menu-button");
    expect(active).toHaveAttribute("data-variant", "default");

    const small = screen.getByRole("button", { name: "Kassenbuch" });
    expect(small).toHaveAttribute("data-active", "false");
    expect(small).not.toHaveAttribute("aria-current");
    expect(small).toHaveAttribute("data-size", "sm");
    expect(small).toHaveClass("h-pui-control-sm", "border-pui-border");
    expect(small).toHaveAttribute("data-variant", "outline");

    const link = screen.getByRole("link", { name: "Lager" });
    expect(link).toHaveAttribute("href", "/lager");
    expect(link).toHaveAttribute("data-sidebar", "menu-button");
    expect(link).not.toHaveAttribute("type");
  });

  it("supports controlled open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<Example providerProps={{ open: false, onOpenChange }} />);
    expect(sidebarRoot()).toHaveAttribute("data-state", "collapsed");

    await user.click(getTrigger());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(sidebarRoot()).toHaveAttribute("data-state", "collapsed");

    rerender(<Example providerProps={{ open: true, onOpenChange }} />);
    expect(sidebarRoot()).toHaveAttribute("data-state", "expanded");
  });

  it("respects defaultOpen={false}", () => {
    render(<Example providerProps={{ defaultOpen: false }} sidebarProps={{ collapsible: "icon" }} />);
    expect(sidebarRoot()).toHaveAttribute("data-state", "collapsed");
    expect(sidebarRoot()).toHaveAttribute("data-collapsible", "icon");
  });

  it("renders in a Sheet on mobile", async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();
    render(<Example sidebarProps={{ side: "right" }} />);
    expect(document.querySelector('[data-slot="sidebar-container"]')).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(getTrigger());
    const sheet = await screen.findByRole("dialog");
    expect(sheet).toHaveAccessibleName("Sidebar");
    expect(sheet).toHaveAttribute("data-mobile", "true");
    expect(sheet).toHaveAttribute("data-side", "right");
    expect(sheet).toHaveClass("bg-pui-shell", "overflow-hidden", "w-[var(--sidebar-width)]");
    // Only SidebarContent scrolls (in its ScrollArea) — the sheet does not wrap the sidebar in a second one.
    expect(sheet.querySelectorAll('[data-slot="scroll-area-viewport"]')).toHaveLength(1);
    expect(sheet.querySelector('[data-sidebar="content"] [data-slot="scroll-area-viewport"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Übersicht/ })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("renders a static column with collapsible='none'", () => {
    render(
      <SidebarProvider>
        <Sidebar collapsible="none" data-testid="static">
          Inhalt
        </Sidebar>
      </SidebarProvider>,
    );
    const el = screen.getByTestId("static");
    expect(el).toHaveAttribute("data-slot", "sidebar");
    expect(el).toHaveClass("w-[var(--sidebar-width)]", "bg-pui-shell");
  });

  it("renders menu skeletons with an optional icon", () => {
    const { container } = render(
      <SidebarProvider>
        <SidebarMenuSkeleton showIcon data-testid="skeleton" />
        <SidebarMenuSkeleton data-testid="skeleton-plain" />
      </SidebarProvider>,
    );
    expect(screen.getByTestId("skeleton").querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeInTheDocument();
    expect(
      screen.getByTestId("skeleton-plain").querySelector('[data-sidebar="menu-skeleton-icon"]'),
    ).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-sidebar="menu-skeleton-text"]')).toHaveLength(2);
  });

  it("merges className, including the function form on SidebarSeparator", () => {
    render(
      <SidebarProvider className="min-h-0 h-full" data-testid="wrapper">
        <Sidebar className="absolute h-full" data-testid="container">
          <SidebarContent className="gap-4" data-testid="content">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="h-12 font-bold">Personal</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator
              data-testid="separator"
              className={(state) => (state.orientation === "horizontal" ? "my-2" : "")}
            />
          </SidebarContent>
        </Sidebar>
        <SidebarInset className="p-5" data-testid="inset" />
      </SidebarProvider>,
    );
    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper).toHaveClass("min-h-0", "h-full");
    expect(wrapper).not.toHaveClass("min-h-[var(--pui-viewport-height,100vh)]");

    const container = screen.getByTestId("container");
    expect(container).toHaveClass("absolute", "h-full");
    expect(container).not.toHaveClass("fixed");
    expect(container).not.toHaveClass("h-[var(--pui-viewport-height,100vh)]");

    const content = screen.getByTestId("content");
    expect(content).toHaveClass("gap-4", "flex-1", "min-h-0");
    expect(content).not.toHaveClass("overflow-auto");
    // SidebarContent is a ScrollArea; the groups sit in its content wrapper, which inherits the gap.
    const viewport = content.querySelector('[data-slot="scroll-area-viewport"]');
    expect(viewport).toHaveClass("!overflow-x-hidden");
    expect(viewport?.firstElementChild).toHaveClass("flex", "flex-col", "[gap:inherit]");
    expect(viewport).toContainElement(screen.getByRole("button", { name: "Personal" }));
    const button = screen.getByRole("button", { name: "Personal" });
    expect(button).toHaveClass("h-12", "font-bold");
    expect(button).not.toHaveClass("h-pui-control-lg");

    const separator = screen.getByTestId("separator");
    expect(separator).toHaveClass("my-2", "mx-2");
    expect(separator).not.toHaveClass("my-0.5");
    expect(screen.getByTestId("inset")).toHaveClass("p-5", "bg-pui-background");
  });

  it("throws a helpful error outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<SidebarTrigger />)).toThrow("useSidebar must be used within a SidebarProvider.");
    spy.mockRestore();
  });
});

describe("Sidebar cookie + options", () => {
  it("getSidebarStateFromCookie reads the persisted state from a Cookie header", () => {
    expect(getSidebarStateFromCookie("theme=dark; sidebar_state=false; x=1")).toBe(false);
    expect(getSidebarStateFromCookie("sidebar_state=true")).toBe(true);
    expect(getSidebarStateFromCookie("sidebar_state=maybe")).toBeUndefined();
    expect(getSidebarStateFromCookie("other=1")).toBeUndefined();
    expect(getSidebarStateFromCookie(undefined)).toBeUndefined();
    expect(getSidebarStateFromCookie(null)).toBeUndefined();
    expect(getSidebarStateFromCookie("nav=false", "nav")).toBe(false);
    expect(SIDEBAR_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 7);
  });

  it("round-trips the cookie written by the provider", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(getTrigger());
    expect(getSidebarStateFromCookie(document.cookie)).toBe(false);
  });

  it("SidebarMenuSkeleton takes an explicit width", () => {
    render(
      <SidebarProvider>
        <SidebarMenuSkeleton data-testid="a" width="70%" />
        <SidebarMenuSkeleton data-testid="b" width={120} />
      </SidebarProvider>,
    );
    const text = (id: string) => screen.getByTestId(id).querySelector<HTMLElement>('[data-sidebar="menu-skeleton-text"]')!;
    expect(text("a").style.getPropertyValue("--skeleton-width")).toBe("70%");
    expect(text("b").style.getPropertyValue("--skeleton-width")).toBe("120px");
  });

  it("accepts a tooltipDelay", async () => {
    const user = userEvent.setup();
    render(<Example providerProps={{ defaultOpen: false, tooltipDelay: 0 }} sidebarProps={{ collapsible: "icon" }} />);
    await user.hover(screen.getByRole("button", { name: "Lager" }));
    expect(await screen.findByText("Lager", { selector: '[data-slot="tooltip-content"]' })).toBeInTheDocument();
  });
});
