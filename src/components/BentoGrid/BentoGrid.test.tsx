import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import {
  BentoCard,
  BentoCardContent,
  BentoCardDescription,
  BentoCardIcon,
  BentoCardTitle,
  BentoCardVisual,
  BentoGrid,
} from "./BentoGrid";

describe("BentoGrid", () => {
  it("renders a responsive grid with columns and row height as variables", () => {
    render(
      <BentoGrid data-testid="grid">
        <BentoCard>A</BentoCard>
      </BentoGrid>,
    );
    const grid = screen.getByTestId("grid");
    expect(grid).toHaveAttribute("data-slot", "bento-grid");
    expect(grid).toHaveAttribute("data-responsive");
    expect(grid).toHaveClass("grid", "gap-3", "grid-cols-1", "md:auto-rows-[var(--bento-row-height)]");
    expect(grid.style.getPropertyValue("--bento-columns")).toBe("3");
    expect(grid.style.getPropertyValue("--bento-row-height")).toBe("11rem");
  });

  it("takes columns, a numeric row height and a fixed (non-responsive) layout", () => {
    render(
      <BentoGrid columns={4} rowHeight={120} responsive={false} className="gap-2" data-testid="grid">
        <BentoCard colSpan={2} rowSpan={2} data-testid="card">
          A
        </BentoCard>
      </BentoGrid>,
    );
    const grid = screen.getByTestId("grid");
    expect(grid).not.toHaveAttribute("data-responsive");
    expect(grid).toHaveClass("gap-2", "auto-rows-[var(--bento-row-height)]");
    expect(grid).not.toHaveClass("gap-3", "grid-cols-1");
    expect(grid.style.getPropertyValue("--bento-columns")).toBe("4");
    expect(grid.style.getPropertyValue("--bento-row-height")).toBe("120px");
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("[grid-column:span_var(--bento-col-span)/span_var(--bento-col-span)]");
    expect(card).not.toHaveClass("md:[grid-column:span_var(--bento-col-span)/span_var(--bento-col-span)]");
  });

  it("sets the spans as variables, only from md up in a responsive grid", () => {
    render(
      <BentoGrid>
        <BentoCard colSpan={2} rowSpan={3} data-testid="card">
          A
        </BentoCard>
      </BentoGrid>,
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-slot", "bento-card");
    expect(card.style.getPropertyValue("--bento-col-span")).toBe("2");
    expect(card.style.getPropertyValue("--bento-row-span")).toBe("3");
    expect(card).toHaveClass(
      "md:[grid-column:span_var(--bento-col-span)/span_var(--bento-col-span)]",
      "md:[grid-row:span_var(--bento-row-span)/span_var(--bento-row-span)]",
      "rounded-pui",
      "bg-pui-card",
    );
    expect(card).not.toHaveAttribute("data-interactive");
  });

  it("renders the parts", () => {
    render(
      <BentoGrid>
        <BentoCard>
          <BentoCardVisual data-testid="visual">chart</BentoCardVisual>
          <BentoCardContent>
            <BentoCardIcon data-testid="icon">i</BentoCardIcon>
            <BentoCardTitle>Garage</BentoCardTitle>
            <BentoCardDescription>3 Fahrzeuge</BentoCardDescription>
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>,
    );
    expect(screen.getByTestId("visual")).toHaveAttribute("data-slot", "bento-card-visual");
    expect(screen.getByTestId("visual")).toHaveClass("flex-1", "overflow-hidden");
    expect(screen.getByTestId("icon")).toHaveClass("bg-pui-primary/tint");
    expect(screen.getByText("Garage")).toHaveAttribute("data-slot", "bento-card-title");
    expect(screen.getByText("3 Fahrzeuge")).toHaveClass("text-pui-muted-foreground");
  });

  it("becomes interactive with the render prop (link / button) and forwards refs", async () => {
    const ref = createRef<HTMLElement>();
    const onClick = vi.fn();
    render(
      <BentoGrid>
        <BentoCard ref={ref} render={<a href="#garage" />}>
          Garage
        </BentoCard>
        <BentoCard render={<button type="button" onClick={onClick} />}>Bank</BentoCard>
        <BentoCard interactive={false} render={<section />} data-testid="static">
          Static
        </BentoCard>
      </BentoGrid>,
    );
    const link = screen.getByRole("link", { name: "Garage" });
    expect(ref.current).toBe(link);
    expect(link).toHaveAttribute("data-interactive");
    expect(link).toHaveClass("hover:bg-pui-accent/40", "focus-visible:ring-pui");
    await userEvent.click(screen.getByRole("button", { name: "Bank" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("static").tagName).toBe("SECTION");
    expect(screen.getByTestId("static")).not.toHaveAttribute("data-interactive");
  });

  it("merges className and style", () => {
    render(
      <BentoGrid style={{ padding: 4 }} data-testid="grid">
        <BentoCard className="bg-pui-background" style={{ opacity: 0.5 }} colSpan={2} data-testid="card">
          A
        </BentoCard>
      </BentoGrid>,
    );
    expect(screen.getByTestId("grid")).toHaveStyle({ padding: "4px" });
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("bg-pui-background");
    expect(card).not.toHaveClass("bg-pui-card");
    expect(card).toHaveStyle({ opacity: "0.5" });
    expect(card.style.getPropertyValue("--bento-col-span")).toBe("2");
  });
});
