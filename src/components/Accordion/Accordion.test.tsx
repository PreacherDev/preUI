import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconProvider } from "../../icons";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./Accordion";

function Example(props: { disabled?: boolean; triggerClassName?: string }) {
  return (
    <Accordion>
      <AccordionItem value="a">
        <AccordionTrigger className={props.triggerClassName}>Versand</AccordionTrigger>
        <AccordionContent>Lieferung in 2 Tagen.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b" disabled={props.disabled}>
        <AccordionTrigger>Rückgabe</AccordionTrigger>
        <AccordionContent>30 Tage Rückgaberecht.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("marks its parts with data-slot", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Versand" });
    expect(trigger).toHaveAttribute("data-slot", "accordion-trigger");
    expect(trigger).toHaveClass("focus-visible:ring-pui");
    expect(trigger.closest("h3")).toHaveAttribute("data-slot", "accordion-header");
    expect(trigger.closest('[data-slot="accordion-item"]')).toBeInTheDocument();
    expect(trigger.closest('[data-slot="accordion"]')).toBeInTheDocument();
    await user.click(trigger);
    const panel = screen.getByText("Lieferung in 2 Tagen.").closest('[data-slot="accordion-content"]');
    expect(panel).toHaveClass("duration-pui-base", "ease-pui");
  });

  it("renders triggers as buttons inside headings", () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Versand" });
    expect(trigger.closest("h3")).not.toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger.parentElement?.parentElement).toHaveClass("border-b", "border-pui-border");
  });

  it("opens and closes a panel", async () => {
    const user = userEvent.setup();
    render(<Example />);
    expect(screen.queryByText("Lieferung in 2 Tagen.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Versand" }));
    expect(screen.getByRole("button", { name: "Versand" })).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByText("Lieferung in 2 Tagen.").parentElement!;
    expect(panel).toHaveClass("h-[var(--accordion-panel-height)]", "overflow-hidden");
  });

  it("merges className, including the function form", () => {
    render(
      <Accordion>
        <AccordionItem value="a" className={(state) => (state.open ? "is-open" : "is-closed")}>
          <AccordionTrigger className="py-5">Versand</AccordionTrigger>
          <AccordionContent>Text</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByRole("button", { name: "Versand" });
    expect(trigger).toHaveClass("py-5");
    expect(trigger).not.toHaveClass("py-3");
    expect(trigger.parentElement?.parentElement).toHaveClass("is-closed", "border-b");
  });

  it("does not open a disabled item", async () => {
    const user = userEvent.setup();
    render(<Example disabled />);
    const trigger = screen.getByRole("button", { name: "Rückgabe" });
    expect(trigger).toHaveAttribute("data-disabled");
    await user.click(trigger);
    expect(screen.queryByText("30 Tage Rückgaberecht.")).not.toBeInTheDocument();
  });

  it("uses the chevron from IconProvider", () => {
    const Chevron = () => <svg data-testid="chevron" />;
    render(
      <IconProvider icons={{ chevronDown: Chevron }}>
        <Example />
      </IconProvider>,
    );
    expect(screen.getAllByTestId("chevron")).toHaveLength(2);
  });
});
