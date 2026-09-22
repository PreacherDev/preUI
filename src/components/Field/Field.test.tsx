import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "../Checkbox";
import { Input } from "../Input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./Field";

describe("Field", () => {
  it("links label and description to the control", () => {
    render(
      <Field>
        <FieldLabel>Firmenname</FieldLabel>
        <Input />
        <FieldDescription>Sichtbar für alle</FieldDescription>
      </Field>,
    );
    const control = screen.getByLabelText("Firmenname");
    expect(control).toHaveClass("h-pui-control", "border-pui-input");
    expect(control).toHaveAccessibleDescription("Sichtbar für alle");
    expect(screen.getByText("Firmenname")).toHaveClass("text-xs", "font-medium", "text-pui-muted-foreground");
    expect(screen.getByText("Sichtbar für alle")).toHaveClass("text-xs", "text-pui-muted-foreground");
  });

  it("stacks its parts vertically by default and merges className", () => {
    const { container } = render(
      <Field className={(state) => (state.disabled ? "is-off" : "is-on")}>
        <Input aria-label="x" />
      </Field>,
    );
    expect(container.firstChild).toHaveClass("flex", "flex-col", "gap-1.5", "is-on");
    expect(container.firstChild).toHaveAttribute("data-orientation", "vertical");
  });

  it("supports a horizontal layout with FieldContent", () => {
    const { container } = render(
      <Field orientation="horizontal">
        <Checkbox />
        <FieldContent data-testid="content">
          <FieldLabel>Newsletter</FieldLabel>
          <FieldDescription>Einmal im Monat.</FieldDescription>
        </FieldContent>
      </Field>,
    );
    expect(container.firstChild).toHaveClass("flex-row", "items-center", "gap-3");
    expect(container.firstChild).not.toHaveClass("flex-col");
    expect(container.firstChild).toHaveAttribute("data-orientation", "horizontal");
    expect(screen.getByTestId("content")).toHaveClass("flex", "flex-1", "flex-col", "gap-1.5");
  });

  it("shows the error and marks the control invalid", async () => {
    render(
      <Field validationMode="onChange">
        <FieldLabel>E-Mail</FieldLabel>
        <Input required />
        <FieldError match="valueMissing">Bitte gib deine E-Mail ein</FieldError>
      </Field>,
    );
    const control = screen.getByLabelText("E-Mail");
    await userEvent.type(control, "a");
    await userEvent.clear(control);
    const error = await screen.findByText("Bitte gib deine E-Mail ein");
    expect(error).toHaveClass("text-pui-negative");
    expect(control).toHaveAttribute("data-invalid");
    expect(control).toHaveClass("data-[invalid]:border-pui-negative");
  });

  it("disables the control", () => {
    render(
      <Field disabled>
        <FieldLabel>Name</FieldLabel>
        <Input />
      </Field>,
    );
    expect(screen.getByLabelText("Name")).toBeDisabled();
  });

  it("renders group, title and separator helpers", () => {
    render(
      <FieldGroup data-testid="group" className="gap-8">
        <FieldTitle>Zahlungsart</FieldTitle>
        <FieldSeparator data-testid="plain" />
        <FieldSeparator data-testid="text">oder</FieldSeparator>
      </FieldGroup>,
    );
    expect(screen.getByTestId("group")).toHaveClass("flex", "flex-col", "gap-8");
    expect(screen.getByTestId("group")).not.toHaveClass("gap-5");
    expect(screen.getByText("Zahlungsart")).toHaveClass("text-sm", "font-medium");
    expect(screen.getByTestId("plain").querySelectorAll('[role="separator"]')).toHaveLength(1);
    expect(screen.getByTestId("text")).toHaveAttribute("data-content");
    expect(screen.getByTestId("text").querySelectorAll('[role="separator"]')).toHaveLength(2);
    expect(screen.getByText("oder")).toBeInTheDocument();
  });
});

describe("FieldSet", () => {
  it("renders a labelled group", () => {
    render(
      <FieldSet>
        <FieldLegend>Rechnungsadresse</FieldLegend>
        <Field>
          <FieldLabel>Straße</FieldLabel>
          <Input />
        </Field>
      </FieldSet>,
    );
    const group = screen.getByRole("group", { name: "Rechnungsadresse" });
    expect(group.tagName).toBe("FIELDSET");
    expect(group).toHaveClass("flex", "flex-col", "gap-4");
    expect(screen.getByText("Rechnungsadresse")).toHaveClass("text-sm", "font-semibold");
  });

  it("pulls a FieldDescription right under the legend up to the legend", () => {
    render(
      <FieldSet>
        <FieldLegend>Rechnungsadresse</FieldLegend>
        <FieldDescription>An diese Adresse schicken wir deine Rechnungen.</FieldDescription>
      </FieldSet>,
    );
    const legend = screen.getByText("Rechnungsadresse");
    const description = screen.getByText("An diese Adresse schicken wir deine Rechnungen.");
    // Base UI's legend is a flex item, so the fieldset's gap-4 would separate them by 16px.
    expect(legend.nextElementSibling).toBe(description);
    expect(legend).toHaveAttribute("data-variant", "legend");
    expect(description).toHaveClass("[[data-variant=legend]+&]:-mt-2.5");
  });

  it("offers a label-style legend variant", () => {
    render(
      <FieldSet>
        <FieldLegend variant="label">Benachrichtigungen</FieldLegend>
      </FieldSet>,
    );
    const legend = screen.getByText("Benachrichtigungen");
    expect(legend).toHaveClass("text-xs", "font-medium", "text-pui-muted-foreground");
    expect(legend).toHaveAttribute("data-variant", "label");
  });

  it("merges className, including the function form", () => {
    render(
      <FieldSet className={(state) => (state.disabled ? "is-off" : "is-on")}>
        <FieldLegend className="text-base">Titel</FieldLegend>
      </FieldSet>,
    );
    expect(screen.getByRole("group")).toHaveClass("is-on", "gap-4");
    expect(screen.getByText("Titel")).toHaveClass("text-base");
    expect(screen.getByText("Titel")).not.toHaveClass("text-sm");
  });

  it("disables all fields inside", () => {
    render(
      <FieldSet disabled>
        <FieldLegend>Konto</FieldLegend>
        <Field>
          <FieldLabel>Name</FieldLabel>
          <Input />
        </Field>
      </FieldSet>,
    );
    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(screen.getByRole("group")).toHaveAttribute("data-disabled");
  });

  it("renders label, description and error outside a Field (shadcn FieldSet pattern)", () => {
    render(
      <FieldSet>
        <FieldLegend>Rechnungsadresse</FieldLegend>
        <FieldDescription className={() => "from-fn"}>An diese Adresse schicken wir Rechnungen.</FieldDescription>
        <FieldLabel htmlFor="x">Standalone</FieldLabel>
        <input id="x" />
        <FieldError>Pflichtfeld</FieldError>
      </FieldSet>,
    );
    const description = screen.getByText("An diese Adresse schicken wir Rechnungen.");
    expect(description.tagName).toBe("P");
    expect(description).toHaveClass("text-xs", "from-fn");
    expect(screen.getByLabelText("Standalone")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Pflichtfeld");
  });

  it("supports a FieldLabel wrapping a Field (choice card)", () => {
    render(
      <FieldLabel>
        <Field orientation="horizontal">
          <Checkbox />
          <FieldContent>
            <FieldLabel>Express-Lieferung</FieldLabel>
          </FieldContent>
        </Field>
      </FieldLabel>,
    );
    expect(screen.getByRole("checkbox", { name: "Express-Lieferung" })).toBeInTheDocument();
  });
});

describe("Field data attributes", () => {
  it("marks every part with data-slot", () => {
    const { container } = render(
      <FieldSet>
        <FieldLegend>Konto</FieldLegend>
        <FieldGroup>
          <Field orientation="horizontal">
            <Checkbox aria-label="AGB" />
            <FieldContent>
              <FieldLabel>AGB</FieldLabel>
              <FieldDescription>Pflicht</FieldDescription>
            </FieldContent>
          </Field>
          <FieldSeparator>oder</FieldSeparator>
          <FieldTitle>Titel</FieldTitle>
        </FieldGroup>
      </FieldSet>,
    );
    for (const slot of [
      "field-set",
      "field-legend",
      "field-group",
      "field",
      "field-content",
      "field-label",
      "field-description",
      "field-separator",
      "field-separator-content",
      "field-title",
    ]) {
      expect(container.querySelector(`[data-slot=${slot}]`), slot).not.toBeNull();
    }
    expect(container.querySelector("[data-slot=field]")).toHaveAttribute("data-orientation", "horizontal");
    expect(container.querySelector("[data-slot=field-legend]")).toHaveAttribute("data-variant", "legend");
  });
});

describe("FieldLabel next to a disabled control", () => {
  it("dims like Label (peer-disabled / peer-data-disabled)", () => {
    render(<FieldLabel>Option</FieldLabel>);
    expect(screen.getByText("Option")).toHaveClass("peer-data-[disabled]:opacity-50", "peer-disabled:opacity-50");
  });
});
