import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Field, FieldDescription, FieldError, FieldLabel } from "../Field";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("renders a styled textarea standalone", async () => {
    render(<Textarea aria-label="Notiz" rows={4} placeholder="Schreib etwas" />);
    const textarea = screen.getByRole("textbox", { name: "Notiz" });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("rows", "4");
    expect(textarea).toHaveClass("min-h-20", "resize-none", "py-2", "px-3", "leading-snug", "border-pui-input");
    await userEvent.type(textarea, "Hallo");
    expect(textarea).toHaveValue("Hallo");
  });

  it("is labelled and described inside a Field", () => {
    render(
      <Field>
        <FieldLabel>Beschreibung</FieldLabel>
        <Textarea />
        <FieldDescription>Maximal 500 Zeichen.</FieldDescription>
      </Field>,
    );
    const textarea = screen.getByLabelText("Beschreibung");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAccessibleDescription("Maximal 500 Zeichen.");
  });

  it("validates inside a Field", async () => {
    render(
      <Field validationMode="onChange">
        <FieldLabel>Nachricht</FieldLabel>
        <Textarea required />
        <FieldError match="valueMissing">Bitte schreib eine Nachricht.</FieldError>
      </Field>,
    );
    const textarea = screen.getByLabelText("Nachricht");
    await userEvent.type(textarea, "a");
    await userEvent.clear(textarea);
    expect(await screen.findByText("Bitte schreib eine Nachricht.")).toBeInTheDocument();
    expect(textarea).toHaveAttribute("data-invalid");
  });

  it("merges className, also in function form", () => {
    render(<Textarea aria-label="x" className={(state) => (state.disabled ? "is-off" : "min-h-32 is-on")} />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveClass("min-h-32", "is-on");
    expect(textarea).not.toHaveClass("min-h-20");
  });

  it("can be disabled", () => {
    render(<Textarea aria-label="x" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});

describe("Textarea data attributes", () => {
  it("exposes data-slot", () => {
    render(<Textarea aria-label="Notiz" />);
    expect(screen.getByRole("textbox", { name: "Notiz" })).toHaveAttribute("data-slot", "textarea");
  });
});

describe("Textarea aria-invalid", () => {
  it("styles aria-invalid like data-invalid", () => {
    render(<Textarea aria-invalid="true" aria-label="Note" />);
    expect(screen.getByLabelText("Note")).toHaveClass("aria-[invalid=true]:border-pui-negative");
  });
});
