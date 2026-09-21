import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./Drawer";
import type { DrawerContentProps, DrawerProps } from "./Drawer";

function Example({
  swipeDirection,
  ...props
}: DrawerContentProps & { swipeDirection?: DrawerProps["swipeDirection"] }) {
  return (
    <Drawer swipeDirection={swipeDirection}>
      <DrawerTrigger>Filter</DrawerTrigger>
      <DrawerContent {...props}>
        <DrawerHeader>
          <DrawerTitle>Filter</DrawerTitle>
          <DrawerDescription>Grenze die Liste ein.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter data-testid="footer">
          <DrawerClose>Übernehmen</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

describe("Drawer", () => {
  it("opens via the trigger as a labelled dialog on the shell surface", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const drawer = await screen.findByRole("dialog");
    expect(drawer).toHaveAccessibleName("Filter");
    expect(drawer).toHaveAccessibleDescription("Grenze die Liste ein.");
    expect(drawer).toHaveClass("bg-pui-shell", "border-pui-border", "shadow-pui-window");
    expect(screen.getByTestId("footer")).toHaveClass("flex", "justify-end");
  });

  it("is a bottom sheet with a grab handle by default and follows swipeDirection", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const drawer = await screen.findByRole("dialog");
    expect(drawer).toHaveAttribute("data-swipe-direction", "down");
    expect(drawer).toHaveClass("data-[swipe-direction=down]:rounded-t-pui");
    const handle = drawer.querySelector('[data-slot="drawer-handle"]');
    expect(handle).toHaveClass("h-1.5", "w-12", "rounded-full", "bg-pui-input");
    unmount();

    render(<Example swipeDirection="right" />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(await screen.findByRole("dialog")).toHaveAttribute("data-swipe-direction", "right");
  });

  it("has no close X by default", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("can show a close button with a configurable label", async () => {
    const user = userEvent.setup();
    render(<Example showCloseButton closeLabel="Schließen" />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("merges className, also in function form", async () => {
    const user = userEvent.setup();
    render(<Example className={(state) => (state.open ? "p-8 is-open" : undefined)} />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const drawer = await screen.findByRole("dialog");
    expect(drawer).toHaveClass("p-8", "is-open", "bg-pui-shell");
    expect(drawer).not.toHaveClass("p-5");
  });
  it("scrolls the body in a preUI ScrollArea, header and footer stay outside", async () => {
    render(
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerHeader data-testid="header">
            <DrawerTitle>Bestellungen</DrawerTitle>
          </DrawerHeader>
          <ul data-testid="body">
            <li>Bestellung #1042</li>
          </ul>
          <DrawerFooter data-testid="footer">
            <DrawerClose>Schließen</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>,
    );
    const drawer = await screen.findByRole("dialog");
    expect(drawer).toHaveClass("overflow-hidden");
    expect(drawer).not.toHaveClass("overflow-y-auto");
    const viewport = screen.getByTestId("body").closest("[data-slot=scroll-area-viewport]");
    expect(viewport).not.toBeNull();
    expect(viewport).not.toContainElement(screen.getByTestId("header"));
    expect(viewport).not.toContainElement(screen.getByTestId("footer"));
  });

  it("marks every part with data-slot and uses the motion tokens", async () => {
    const user = userEvent.setup();
    render(<Example showCloseButton />);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const drawer = await screen.findByRole("dialog");
    expect(drawer).toHaveAttribute("data-slot", "drawer-content");
    expect(drawer).toHaveClass("duration-pui-base", "ease-pui");
    expect(screen.getByRole("button", { name: "Filter", hidden: true })).toHaveAttribute("data-slot", "drawer-trigger");
    expect(drawer.querySelector("[data-slot=drawer-handle]")).toBeInTheDocument();
    expect(drawer.querySelector("[data-slot=drawer-inner]")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toHaveAttribute("data-slot", "drawer-footer");
    expect(screen.getByText("Grenze die Liste ein.")).toHaveAttribute("data-slot", "drawer-description");
    expect(screen.getByRole("button", { name: "Übernehmen" })).toHaveAttribute("data-slot", "drawer-close");
    expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute("data-slot", "drawer-close");
    expect(document.querySelector("[data-slot=drawer-overlay]")).toBeInTheDocument();
    expect(document.querySelector("[data-slot=drawer-viewport]")).toContainElement(drawer);
  });
});
