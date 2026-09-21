import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field, FieldError, FieldLabel } from "../Field";
import { Input } from "../Input";
import { Form } from "./Form";

describe("Form", () => {
  it("renders a form and merges className", () => {
    render(<Form aria-label="Profil" className="gap-6" />);
    const form = screen.getByRole("form", { name: "Profil" });
    expect(form).toHaveClass("flex", "flex-col", "gap-6");
    expect(form).not.toHaveClass("gap-4");
  });

  it("supports the className function", () => {
    render(<Form aria-label="Profil" className={() => "is-fn"} />);
    expect(screen.getByRole("form")).toHaveClass("is-fn", "flex");
  });

  it("submits values via onFormSubmit", async () => {
    const onFormSubmit = vi.fn();
    render(
      <Form onFormSubmit={onFormSubmit}>
        <Field name="company">
          <FieldLabel>Firma</FieldLabel>
          <Input required />
        </Field>
        <button type="submit">Speichern</button>
      </Form>,
    );
    await userEvent.type(screen.getByLabelText("Firma"), "Acme");
    await userEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onFormSubmit).toHaveBeenCalledWith({ company: "Acme" }, expect.anything());
  });

  it("does not submit while a required field is empty", async () => {
    const onFormSubmit = vi.fn();
    render(
      <Form onFormSubmit={onFormSubmit}>
        <Field name="company">
          <FieldLabel>Firma</FieldLabel>
          <Input required />
          <FieldError match="valueMissing">Pflichtfeld</FieldError>
        </Field>
        <button type="submit">Speichern</button>
      </Form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onFormSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText("Pflichtfeld")).toHaveClass("text-pui-negative");
  });

  it("shows external errors", () => {
    render(
      <Form errors={{ company: "Name schon vergeben" }}>
        <Field name="company">
          <FieldLabel>Firma</FieldLabel>
          <Input />
          <FieldError />
        </Field>
      </Form>,
    );
    expect(screen.getByText("Name schon vergeben")).toHaveClass("text-pui-negative");
  });
});

describe("Form data attributes", () => {
  it("exposes data-slot", () => {
    render(<Form aria-label="Profil" />);
    expect(screen.getByRole("form", { name: "Profil" })).toHaveAttribute("data-slot", "form");
  });
});
