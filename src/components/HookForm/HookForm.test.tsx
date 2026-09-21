import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { Checkbox } from "../Checkbox/Checkbox";
import { Input } from "../Input/Input";
import { NumberField } from "../NumberField/NumberField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../Select/Select";
import { Switch } from "../Switch/Switch";
import { Textarea } from "../Textarea/Textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "./HookForm";

interface Values {
  name: string;
  bio: string;
  terms: boolean;
  newsletter: boolean;
  category: string | null;
  capital: number | null;
}

const defaults: Values = { name: "", bio: "", terms: false, newsletter: false, category: null, capital: null };

function TestForm({ onSubmit = () => {} }: { onSubmit?: (values: Values) => void }) {
  const form = useForm<Values>({ defaultValues: defaults });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          rules={{
            required: "Bitte gib einen Firmennamen ein.",
            minLength: { value: 3, message: "Mindestens 3 Zeichen." },
          }}
          render={({ field }) => (
            <FormItem data-testid="name-item">
              <FormLabel>Firmenname</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>So erscheint die Firma im Register.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bio"
          rules={{ maxLength: { value: 10, message: "Höchstens 10 Zeichen." } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="terms"
          rules={{ required: "Bitte akzeptiere die AGB." }}
          render={({ field }) => (
            <FormItem orientation="horizontal">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              </FormControl>
              <FormLabel>AGB akzeptieren</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newsletter"
          render={({ field }) => (
            <FormItem orientation="horizontal">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel>Newsletter</FormLabel>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          rules={{ required: "Bitte wähle eine Kategorie." }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategorie</FormLabel>
              <Select
                items={[
                  { value: "logistik", label: "Logistik" },
                  { value: "handel", label: "Handel" },
                ]}
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle eine Kategorie" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="logistik">Logistik</SelectItem>
                  <SelectItem value="handel">Handel</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="capital"
          rules={{ min: { value: 10000, message: "Mindestens 10.000." } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Startkapital</FormLabel>
              <FormControl>
                <NumberField value={field.value} onValueChange={field.onChange} />
              </FormControl>
              <FormDescription>In Dollar.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Absenden</button>
      </form>
    </Form>
  );
}

describe("HookForm", () => {
  it("links the label to the control and lists the description in aria-describedby", async () => {
    render(<TestForm />);
    const input = screen.getByLabelText("Firmenname");
    expect(input.tagName).toBe("INPUT");
    const description = screen.getByText("So erscheint die Firma im Register.");
    await waitFor(() => expect(input).toHaveAttribute("aria-describedby", description.id));
    expect(input).toHaveAccessibleDescription("So erscheint die Firma im Register.");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("data-invalid");
    expect(description).toHaveClass("text-xs", "text-pui-muted-foreground");
  });

  it("renders FormItem as a vertical stack and label in the guide style", () => {
    render(<TestForm />);
    expect(screen.getByTestId("name-item")).toHaveClass("flex", "flex-col", "gap-1.5");
    expect(screen.getByText("Firmenname")).toHaveClass("text-xs", "font-medium", "text-pui-muted-foreground");
  });

  it("shows FormMessage and marks the control invalid on a validation error", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Firmenname"), "ab");
    await user.click(screen.getByRole("button", { name: "Absenden" }));

    const message = await screen.findByText("Mindestens 3 Zeichen.");
    expect(message).toHaveClass("text-xs", "text-pui-negative");
    const input = screen.getByLabelText("Firmenname");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("data-invalid");
    expect(input).toHaveClass("data-[invalid]:border-pui-negative");
    await waitFor(() => expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(message.id));
    expect(input).toHaveAccessibleDescription(/Mindestens 3 Zeichen\./);
    expect(screen.getByText("Firmenname")).toHaveClass("data-[error=true]:text-pui-negative");
    expect(screen.getByText("Firmenname")).toHaveAttribute("data-error", "true");
    expect(onSubmit).not.toHaveBeenCalled();

    // Fixing the value clears the error state again.
    await user.type(input, "c");
    await waitFor(() => expect(screen.queryByText("Mindestens 3 Zeichen.")).not.toBeInTheDocument());
    expect(input).not.toHaveAttribute("data-invalid");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks Textarea, Checkbox and Select trigger invalid", async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    await user.type(screen.getByLabelText("Beschreibung"), "viel zu lang hier");
    await user.click(screen.getByRole("button", { name: "Absenden" }));

    await screen.findByText("Höchstens 10 Zeichen.");
    expect(screen.getByLabelText("Beschreibung")).toHaveAttribute("data-invalid");
    expect(screen.getByLabelText("Beschreibung")).toHaveAttribute("aria-invalid", "true");

    expect(screen.getByText("Bitte akzeptiere die AGB.")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox", { name: "AGB akzeptieren" });
    expect(checkbox).toHaveAttribute("data-invalid");
    expect(checkbox).toHaveAttribute("aria-invalid", "true");

    expect(screen.getByText("Bitte wähle eine Kategorie.")).toBeInTheDocument();
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAttribute("data-invalid");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  });

  it("submits valid data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Firmenname"), "Nordlicht");
    await user.click(screen.getByRole("checkbox", { name: "AGB akzeptieren" }));
    await user.click(screen.getByRole("switch", { name: "Newsletter" }));
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Handel" }));
    await user.click(screen.getByRole("button", { name: "Absenden" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: "Nordlicht",
      bio: "",
      terms: true,
      newsletter: true,
      category: "handel",
      capital: null,
    });
  });

  it("maps Checkbox and Switch checked state through onCheckedChange and links their labels", async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    const checkbox = screen.getByRole("checkbox", { name: "AGB akzeptieren" });
    const toggle = screen.getByRole("switch", { name: "Newsletter" });
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    await user.click(toggle);
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(toggle).not.toBeChecked();
    // FormLabel names the control and toggles it on click.
    await user.click(screen.getByText("Newsletter"));
    expect(toggle).toBeChecked();
    await user.click(screen.getByText("AGB akzeptieren"));
    expect(checkbox).not.toBeChecked();
  });

  it("wires the Select trigger (value / onValueChange) and links its label", async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    const trigger = screen.getByRole("combobox");
    expect(screen.getByText("Kategorie")).toHaveAttribute("for", trigger.id);
    expect(trigger).toHaveTextContent("Wähle eine Kategorie");
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "Logistik" }));
    await waitFor(() => expect(trigger).toHaveTextContent("Logistik"));
  });

  it("wires NumberField: id and ARIA on the inner input, data-invalid on the root", async () => {
    const user = userEvent.setup();
    render(<TestForm />);
    const input = screen.getByLabelText("Startkapital");
    expect(input.tagName).toBe("INPUT");
    await waitFor(() => expect(input).toHaveAccessibleDescription("In Dollar."));
    await user.type(input, "500");
    await user.click(screen.getByRole("button", { name: "Absenden" }));
    await screen.findByText("Mindestens 10.000.");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/Mindestens 10\.000\./);
    expect(input.closest("[data-invalid]")).toHaveClass("data-[invalid]:border-pui-negative");
  });

  it("FormMessage shows its children when there is no error, and merges className", () => {
    function Static() {
      const form = useForm({ defaultValues: { a: "" } });
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="a"
            render={({ field }) => (
              <FormItem className="extra">
                <FormLabel className="lbl">A</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage className="msg">Hinweis</FormMessage>
              </FormItem>
            )}
          />
        </Form>
      );
    }
    const { container } = render(<Static />);
    expect(container.firstChild).toHaveClass("extra", "flex-col");
    expect(screen.getByText("Hinweis")).toHaveClass("msg", "text-pui-negative");
    expect(screen.getByText("A")).toHaveClass("lbl");
  });

  it("keeps the error colour on a FormLabel whose className sets a text colour", async () => {
    // e.g. a checkbox label styled `text-sm text-pui-foreground`: a plain `text-pui-negative` would be
    // merged away by tailwind-merge, so the error colour comes from the data-[error=true] variant.
    function Terms() {
      const form = useForm({ defaultValues: { terms: false } });
      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(() => {})}>
            <FormField
              control={form.control}
              name="terms"
              rules={{ required: "Bitte akzeptieren." }}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm text-pui-foreground">AGB</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <button type="submit">Los</button>
          </form>
        </Form>
      );
    }
    const user = userEvent.setup();
    render(<Terms />);
    const label = screen.getByText("AGB");
    expect(label).toHaveAttribute("data-error", "false");
    await user.click(screen.getByRole("button", { name: "Los" }));
    await screen.findByText("Bitte akzeptieren.");
    expect(label).toHaveAttribute("data-error", "true");
    expect(label).toHaveClass("text-pui-foreground", "data-[error=true]:text-pui-negative");
  });

  it("supports the render prop on FormControl and forwards refs", () => {
    let node: HTMLElement | null = null;
    function WithRender() {
      const form = useForm({ defaultValues: { a: "" } });
      return (
        <Form {...form}>
          <FormField
            control={form.control}
            name="a"
            render={({ field }) => (
              <FormItem>
                <FormLabel>A</FormLabel>
                <FormControl ref={(el) => {
                    node = el;
                  }} render={<Input {...field} />} />
              </FormItem>
            )}
          />
        </Form>
      );
    }
    render(<WithRender />);
    expect(screen.getByLabelText("A")).toBe(node);
  });

  it("useFormField throws outside FormField", () => {
    function Broken() {
      useFormField();
      return null;
    }
    function Host() {
      const form = useForm();
      return (
        <Form {...form}>
          <Broken />
        </Form>
      );
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Host />)).toThrow("useFormField should be used within <FormField>");
    spy.mockRestore();
  });
});

describe("HookForm data attributes", () => {
  it("marks item, label, description and message with data-slot", async () => {
    render(<TestForm />);
    const item = screen.getByTestId("name-item");
    expect(item).toHaveAttribute("data-slot", "form-item");
    expect(item.querySelector("[data-slot=form-label]")).not.toBeNull();
    expect(item.querySelector("[data-slot=form-description]")).not.toBeNull();
    // The control keeps its own slot (FormControl renders no element of its own).
    expect(item.querySelector("[data-slot=input]")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /speichern|absenden|submit/i }));
    expect(await screen.findByText("Bitte gib einen Firmennamen ein.")).toHaveAttribute("data-slot", "form-message");
  });
});
