import { render } from "@testing-library/react";
import { describe, expectTypeOf, it } from "vitest";
import type {
  AlertDialogPortalProps,
  AlertDialogTriggerProps,
  AutocompleteInputProps,
  ComboboxEmptyProps,
  ComboboxInputProps,
  ComboboxListProps,
  DialogCloseProps,
  DialogPortalProps,
  DialogTriggerProps,
  DrawerCloseProps,
  DrawerPortalProps,
  DrawerTriggerProps,
  FieldSize,
  HoverCardContentProps,
  PopoverCloseProps,
  PopoverContentProps,
  PopoverTriggerProps,
  RadioGroupProps,
  SelectTriggerProps,
  SheetCloseProps,
  SheetPortalProps,
  SheetTriggerProps,
  TooltipContentProps,
} from "./index";
import { RadioGroup, RadioGroupItem, SIDEBAR_COOKIE_MAX_AGE, getSidebarStateFromCookie } from "./index";

describe("public types", () => {
  it("exports FieldSize and uses it on the field-like controls", () => {
    expectTypeOf<FieldSize>().toEqualTypeOf<"sm" | "default" | "lg">();
    expectTypeOf<NonNullable<SelectTriggerProps["size"]>>().toEqualTypeOf<FieldSize>();
    expectTypeOf<NonNullable<ComboboxInputProps["size"]>>().toEqualTypeOf<FieldSize>();
    expectTypeOf<NonNullable<AutocompleteInputProps["size"]>>().toEqualTypeOf<FieldSize>();
  });

  it("ComboboxInput and AutocompleteInput share the icon type", () => {
    expectTypeOf<ComboboxInputProps["icon"]>().toEqualTypeOf<AutocompleteInputProps["icon"]>();
  });

  it("exports the trigger / close / portal prop types of the overlays", () => {
    expectTypeOf<DialogTriggerProps>().toHaveProperty("render");
    expectTypeOf<DialogCloseProps>().toHaveProperty("render");
    expectTypeOf<DialogPortalProps>().toHaveProperty("container");
    expectTypeOf<SheetTriggerProps>().toHaveProperty("render");
    expectTypeOf<SheetCloseProps>().toHaveProperty("render");
    expectTypeOf<SheetPortalProps>().toHaveProperty("container");
    expectTypeOf<DrawerTriggerProps>().toHaveProperty("render");
    expectTypeOf<DrawerCloseProps>().toHaveProperty("render");
    expectTypeOf<DrawerPortalProps>().toHaveProperty("container");
    expectTypeOf<PopoverTriggerProps>().toHaveProperty("render");
    expectTypeOf<PopoverCloseProps>().toHaveProperty("render");
    expectTypeOf<AlertDialogTriggerProps>().toHaveProperty("render");
    expectTypeOf<AlertDialogPortalProps>().toHaveProperty("container");
    expectTypeOf<ComboboxListProps>().toHaveProperty("className");
    expectTypeOf<ComboboxEmptyProps>().toHaveProperty("className");
  });

  it("floating contents take alignOffset and positionerProps", () => {
    expectTypeOf<PopoverContentProps>().toHaveProperty("alignOffset");
    expectTypeOf<PopoverContentProps>().toHaveProperty("positionerProps");
    expectTypeOf<HoverCardContentProps>().toHaveProperty("positionerProps");
    expectTypeOf<TooltipContentProps>().toHaveProperty("positionerProps");
  });

  it("RadioGroup is generic like Base UI's", () => {
    expectTypeOf<RadioGroupProps<"a" | "b">["value"]>().toEqualTypeOf<"a" | "b" | undefined>();
    // Explicit type argument: onValueChange receives the union, not `unknown`.
    render(
      <RadioGroup<"a" | "b">
        defaultValue="a"
        onValueChange={(value) => {
          expectTypeOf(value).toEqualTypeOf<"a" | "b">();
        }}
        aria-label="Choice"
      >
        <RadioGroupItem value="a" aria-label="A" />
      </RadioGroup>,
    );
  });

  it("exports the sidebar cookie helpers", () => {
    expectTypeOf(SIDEBAR_COOKIE_MAX_AGE).toBeNumber();
    expectTypeOf(getSidebarStateFromCookie).returns.toEqualTypeOf<boolean | undefined>();
  });
});
