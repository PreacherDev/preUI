import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Badge, badgeVariants } from "./Badge";

describe("Badge", () => {
  it("renders a span with the default primary tint", () => {
    render(<Badge>Neu</Badge>);
    const badge = screen.getByText("Neu");
    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveClass("rounded-pui-md", "text-xs", "bg-pui-primary/tint", "text-pui-primary");
    expect(badge).toHaveClass("[a&]:hover:bg-pui-primary/tint-hover", "duration-pui-fast", "ease-pui", "focus-visible:ring-pui");
    expect(badge).toHaveAttribute("data-slot", "badge");
    expect(badge).toHaveAttribute("data-variant", "default");
  });

  it("applies variants", () => {
    const { rerender } = render(<Badge variant="secondary">4</Badge>);
    expect(screen.getByText("4")).toHaveClass("bg-pui-muted", "text-pui-muted-foreground");
    rerender(<Badge variant="outline">4</Badge>);
    expect(screen.getByText("4")).toHaveClass("border-pui-border");
    rerender(<Badge variant="destructive">4</Badge>);
    expect(screen.getByText("4")).toHaveClass("bg-pui-negative/tint", "text-pui-negative");
    rerender(<Badge variant="warning">4</Badge>);
    expect(screen.getByText("4")).toHaveClass("bg-pui-warning/tint", "text-pui-warning");
    expect(screen.getByText("4")).toHaveAttribute("data-variant", "warning");
  });

  it("supports the render prop and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    render(
      <Badge ref={ref} render={<a href="#details" />} variant="info">
        Details
      </Badge>,
    );
    const link = screen.getByRole("link", { name: "Details" });
    expect(ref.current).toBe(link);
    expect(link).toHaveAttribute("href", "#details");
    expect(link).toHaveClass("bg-pui-info/tint");
  });

  it("merges className", () => {
    render(<Badge className="rounded-full px-3">Pill</Badge>);
    const badge = screen.getByText("Pill");
    expect(badge).toHaveClass("rounded-full", "px-3");
    expect(badge).not.toHaveClass("rounded-pui-md", "px-2");
  });

  it("exposes badgeVariants for other elements", () => {
    expect(badgeVariants({ variant: "positive" })).toContain("text-pui-positive");
  });

  it("gives the raw outline classes no conflicting transparent border (used without tailwind-merge)", () => {
    const outline = badgeVariants({ variant: "outline" }).split(/\s+/);
    expect(outline).toContain("border-pui-border");
    expect(outline).not.toContain("border-transparent");
    expect(badgeVariants({ variant: "positive" }).split(/\s+/)).toContain("border-transparent");
  });
});
