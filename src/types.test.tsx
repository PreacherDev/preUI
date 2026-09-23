import { render } from "@testing-library/react";
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  AlertDialogContentProps,
  AlertDialogPopupProps,
  AlertDialogPortalProps,
  AlertDialogTriggerProps,
  AutocompleteInputProps,
  ComboboxEmptyProps,
  ComboboxInputProps,
  ComboboxListProps,
  ContextMenuContentProps,
  DialogCloseProps,
  DialogContentProps,
  DialogPopupProps,
  DialogPortalProps,
  DialogTriggerProps,
  DrawerCloseProps,
  DrawerContentProps,
  DrawerPopupProps,
  DrawerPortalProps,
  DrawerTriggerProps,
  DropdownMenuContentProps,
  FieldSize,
  HoverCardContentProps,
  PopoverCloseProps,
  PopoverContentProps,
  PopoverTriggerProps,
  RadioGroupProps,
  SelectContentProps,
  SelectTriggerProps,
  SheetCloseProps,
  SheetContentProps,
  SheetPopupProps,
  SheetPortalProps,
  SheetTriggerProps,
  TooltipContentProps,
} from "./index";
import {
  AlertDialogPopup,
  DialogPopup,
  DrawerPopup,
  RadioGroup,
  RadioGroupItem,
  SheetPopup,
  SIDEBAR_COOKIE_MAX_AGE,
  getSidebarStateFromCookie,
} from "./index";

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

  it("modal contents take container, contained, overlay and overlayClassName", () => {
    expectTypeOf<DialogContentProps>().toHaveProperty("container");
    expectTypeOf<DialogContentProps>().toHaveProperty("contained");
    expectTypeOf<DialogContentProps>().toHaveProperty("overlay");
    expectTypeOf<DialogContentProps>().toHaveProperty("overlayClassName");
    expectTypeOf<DialogContentProps>().toHaveProperty("initialFocus");
    expectTypeOf<AlertDialogContentProps>().toHaveProperty("container");
    expectTypeOf<AlertDialogContentProps>().toHaveProperty("overlayClassName");
    expectTypeOf<SheetContentProps>().toHaveProperty("container");
    expectTypeOf<SheetContentProps>().toHaveProperty("overlay");
    expectTypeOf<DrawerContentProps>().toHaveProperty("container");
    expectTypeOf<DrawerContentProps>().toHaveProperty("overlayClassName");
    expectTypeOf<DialogPortalProps>().toHaveProperty("contained");
    expectTypeOf<SheetPortalProps>().toHaveProperty("contained");
  });

  it("exports the popup parts of the modals", () => {
    expectTypeOf<DialogPopupProps>().toHaveProperty("showCloseButton");
    expectTypeOf<SheetPopupProps>().toHaveProperty("side");
    expectTypeOf<AlertDialogPopupProps>().toHaveProperty("initialFocus");
    expectTypeOf<DrawerPopupProps>().toHaveProperty("showCloseButton");
    for (const part of [DialogPopup, AlertDialogPopup, SheetPopup, DrawerPopup]) expect(part).toBeDefined();
  });

  it("floating contents take a portal container", () => {
    expectTypeOf<PopoverContentProps>().toHaveProperty("container");
    expectTypeOf<TooltipContentProps>().toHaveProperty("container");
    expectTypeOf<HoverCardContentProps>().toHaveProperty("container");
    expectTypeOf<SelectContentProps>().toHaveProperty("container");
    expectTypeOf<DropdownMenuContentProps>().toHaveProperty("container");
    expectTypeOf<ContextMenuContentProps>().toHaveProperty("container");
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
