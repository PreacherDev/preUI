import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./Card";

describe("Card", () => {
  it("renders all parts with the panel styles", () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="header">
          <CardTitle>Letzte Buchungen</CardTitle>
          <CardDescription>Die letzten 30 Tage</CardDescription>
          <CardAction>
            <button type="button">Alle anzeigen</button>
          </CardAction>
        </CardHeader>
        <CardContent>Inhalt</CardContent>
        <CardFooter>Fußzeile</CardFooter>
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("rounded-pui", "border", "border-pui-border", "bg-pui-card");
    expect(card.className).not.toMatch(/shadow/);
    expect(screen.getByTestId("header")).toHaveClass("min-h-12", "border-b", "px-4", "py-2");
    expect(screen.getByText("Letzte Buchungen")).toHaveClass("text-sm", "font-semibold");
    expect(screen.getByText("Die letzten 30 Tage")).toHaveClass("text-pui-muted-foreground");
    expect(screen.getByRole("button").parentElement).toHaveClass("col-start-2", "justify-self-end");
    expect(screen.getByText("Inhalt")).toHaveClass("p-4");
    expect(screen.getByText("Fußzeile")).toHaveClass("border-t");
  });

  it("merges className and forwards refs", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Card ref={ref} className="border-pui-primary/40" data-testid="card">
        <CardContent className="p-0">Ohne Abstand</CardContent>
      </Card>,
    );
    expect(ref.current).toBe(screen.getByTestId("card"));
    expect(screen.getByTestId("card")).toHaveClass("border-pui-primary/40");
    expect(screen.getByTestId("card")).not.toHaveClass("border-pui-border");
    expect(screen.getByText("Ohne Abstand")).toHaveClass("p-0");
    expect(screen.getByText("Ohne Abstand")).not.toHaveClass("p-4");
  });
});
