import { render, screen } from "@testing-library/react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./Empty";

describe("Empty", () => {
  it("renders the centred structure", () => {
    render(
      <Empty data-testid="empty">
        <EmptyHeader>
          <EmptyMedia data-testid="media">
            <svg data-testid="icon" />
          </EmptyMedia>
          <EmptyTitle>Keine Buchungen</EmptyTitle>
          <EmptyDescription>Du hast noch nichts gebucht.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <button type="button">Neue Buchung</button>
        </EmptyContent>
      </Empty>,
    );
    expect(screen.getByTestId("empty")).toHaveClass("flex-col", "items-center", "py-10", "gap-2", "text-center");
    expect(screen.getByText("Keine Buchungen")).toHaveClass("text-sm", "font-medium", "text-pui-foreground");
    const description = screen.getByText("Du hast noch nichts gebucht.");
    expect(description.tagName).toBe("P");
    expect(description).toHaveClass("text-pui-muted-foreground");
    expect(screen.getByRole("button", { name: "Neue Buchung" })).toBeInTheDocument();
    expect(screen.getByTestId("media")).toHaveAttribute("data-variant", "default");
    // Handoff EmptyState: the bare icon is dimmed to 60 %.
    expect(screen.getByTestId("media")).toHaveClass("[&_svg]:opacity-60");
  });

  it("renders the icon media variant as a muted box", () => {
    render(
      <EmptyMedia variant="icon" data-testid="media">
        <svg />
      </EmptyMedia>,
    );
    const media = screen.getByTestId("media");
    expect(media).toHaveAttribute("data-variant", "icon");
    expect(media).toHaveClass("size-10", "rounded-pui-md", "bg-pui-muted");
    expect(media).not.toHaveClass("[&_svg]:opacity-60");
  });

  it("merges className", () => {
    render(
      <Empty data-testid="empty" className="py-4">
        <EmptyTitle className="text-base">Titel</EmptyTitle>
      </Empty>,
    );
    expect(screen.getByTestId("empty")).toHaveClass("py-4");
    expect(screen.getByTestId("empty")).not.toHaveClass("py-10");
    expect(screen.getByText("Titel")).toHaveClass("text-base");
    expect(screen.getByText("Titel")).not.toHaveClass("text-sm");
  });
});
