import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { lightTokens, tokens } from "../../tailwind/tokens";
import { getContrast } from "../../theming/contrast";
import { parseColor, type Rgba } from "../ColorPicker/color";
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
    // The description reads foreground at 85 % on the tint (muted-foreground falls below 4.5:1 there).
    expect(alert).toHaveClass("[&>[data-slot=alert-description]]:text-pui-foreground/85");
    expect(alert).toHaveAttribute("data-slot", "alert");
    expect(alert).toHaveAttribute("data-variant", variant);
  });

  it("tinted descriptions (foreground at 85 %) reach 4.5:1 on every status tint in both schemes", () => {
    const blend = (top: Rgba, bottom: Rgba, alpha: number): Rgba => ({
      r: top.r * alpha + bottom.r * (1 - alpha),
      g: top.g * alpha + bottom.g * (1 - alpha),
      b: top.b * alpha + bottom.b * (1 - alpha),
      a: 1,
    });
    const rgb = ({ r, g, b }: Rgba) => `rgb(${r} ${g} ${b})`;
    for (const set of [tokens, lightTokens] as Record<string, string>[]) {
      const tint = Number(set["--pui-tint-rest"]);
      for (const tone of ["negative", "positive", "warning", "info"]) {
        for (const surface of ["background", "card"]) {
          const back = blend(parseColor(`hsl(${set[`--pui-${tone}`]})`)!, parseColor(`hsl(${set[`--pui-${surface}`]})`)!, tint);
          const text = blend(parseColor(`hsl(${set["--pui-foreground"]})`)!, back, 0.85);
          expect({ tone, surface, ok: getContrast(rgb(text), rgb(back)) >= 4.5 }).toEqual({ tone, surface, ok: true });
        }
      }
    }
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
