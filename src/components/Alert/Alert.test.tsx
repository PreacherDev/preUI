import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "./Alert";

describe("Alert", () => {
  it("renders with role alert, title and description", () => {
    render(
      <Alert>
        <svg data-testid="icon" />
        <AlertTitle>Lieferung verspätet</AlertTitle>
        <AlertDescription>Deine Ware kommt morgen an.</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Lieferung verspätet");
    expect(alert).toHaveClass("grid", "rounded-pui", "border-pui-border", "bg-pui-card");
    expect(alert).toHaveAttribute("data-variant", "default");
    expect(screen.getByText("Lieferung verspätet")).toHaveClass("col-start-2", "font-medium");
    expect(screen.getByText("Deine Ware kommt morgen an.")).toHaveClass("col-start-2", "text-pui-muted-foreground");
  });

  it.each(["destructive", "positive", "warning", "info"] as const)("applies the %s tone", (variant) => {
    const tone = variant === "destructive" ? "negative" : variant;
    render(<Alert variant={variant}>Text</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass(`border-pui-${tone}/tint-border`, `bg-pui-${tone}/tint`);
    expect(alert).toHaveAttribute("data-slot", "alert");
    expect(alert).toHaveAttribute("data-variant", variant);
  });

  it("merges className and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Alert ref={ref} className="px-6 bg-pui-popover" role="status">
        <AlertTitle className="text-base">Titel</AlertTitle>
      </Alert>,
    );
    const alert = screen.getByRole("status");
    expect(ref.current).toBe(alert);
    expect(alert).toHaveClass("px-6", "bg-pui-popover");
    expect(alert).not.toHaveClass("px-4", "bg-pui-card");
    expect(screen.getByText("Titel")).toHaveClass("text-base");
  });
});
