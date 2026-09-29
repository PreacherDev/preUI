import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createNuiTexts, flattenTexts, formatText, NuiTextsProvider, useNuiTexts, type NuiTextsProviderProps } from ".";

afterEach(() => {
  delete (window as Partial<Window>).invokeNative;
  delete (window as Partial<Window>).GetParentResourceName;
  vi.restoreAllMocks();
});

describe("text helpers", () => {
  it("flattenTexts turns nested tables into dot keys", () => {
    expect(flattenTexts({ shop: { title: "Laden", slots: 12 }, "ui.close": "Schließen", bad: [1], none: null })).toEqual({
      "shop.title": "Laden",
      "shop.slots": "12",
      "ui.close": "Schließen",
    });
    expect(flattenTexts(undefined)).toEqual({});
  });

  it("formatText fills known placeholders and keeps unknown ones", () => {
    expect(formatText("{name} hat {amount}", { name: "Max", amount: "$5" })).toBe("Max hat $5");
    expect(formatText("{name} {missing}", { name: "Max" })).toBe("Max {missing}");
    expect(formatText("ohne")).toBe("ohne");
  });

  it("t falls back to the key, plural follows the locale's rules", () => {
    const t = createNuiTexts(
      {
        "shop.not_enough": "Dir fehlen {amount}",
        "ui.items_zero": "Keine Artikel",
        "ui.items_one": "{count} Artikel",
        "ui.items_other": "{count} Artikel (mehrere)",
        "ui.pl_one": "{count} przedmiot",
        "ui.pl_few": "{count} przedmioty",
        "ui.pl_many": "{count} przedmiotów",
      },
      { locale: "de-DE" },
    );
    expect(t("shop.not_enough", { amount: "$500" })).toBe("Dir fehlen $500");
    expect(t("unknown.key")).toBe("unknown.key");
    expect(t.has("shop.not_enough")).toBe(true);
    expect(t.plural("ui.items", 0)).toBe("Keine Artikel");
    expect(t.plural("ui.items", 1)).toBe("1 Artikel");
    expect(t.plural("ui.items", 1200)).toBe("1.200 Artikel (mehrere)");
    expect(t.plural("ui.missing", 3)).toBe("ui.missing");
    const pl = createNuiTexts(
      { "ui.pl_one": "{count} przedmiot", "ui.pl_few": "{count} przedmioty", "ui.pl_many": "{count} przedmiotów" },
      { locale: "pl" },
    );
    expect([1, 3, 5].map((n) => pl.plural("ui.pl", n))).toEqual(["1 przedmiot", "3 przedmioty", "5 przedmiotów"]);
  });
});

function Probe() {
  const t = useNuiTexts();
  return <output data-testid="t">{JSON.stringify({ title: t("shop.title"), items: t.plural("ui.items", 2), ready: t.ready })}</output>;
}
const state = () => JSON.parse(screen.getByTestId("t").textContent!);
const renderWith = (props: NuiTextsProviderProps) =>
  render(
    <NuiTextsProvider {...props}>
      <Probe />
    </NuiTextsProvider>,
  );

describe("NuiTextsProvider", () => {
  it("uses the fallback in a browser and becomes ready", async () => {
    renderWith({ fallback: { shop: { title: "Shop" }, ui: { items_one: "{count} item", items_other: "{count} items" } } });
    await act(async () => {});
    expect(state()).toEqual({ title: "Shop", items: "2 items", ready: true });
  });

  it("asks getTexts in the game, merges over the fallback and follows setTexts", async () => {
    Object.assign(window, { invokeNative: () => {}, GetParentResourceName: () => "pre_shops" });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ shop: { title: "Laden" } })));
    renderWith({ fallback: { "shop.title": "Shop", "ui.items_other": "{count} items" }, locale: "de-DE" });
    expect(state().ready).toBe(false);
    await act(async () => {});
    expect(fetchSpy).toHaveBeenCalledWith("https://pre_shops/getTexts", expect.anything());
    expect(state()).toEqual({ title: "Laden", items: "2 items", ready: true });
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: { action: "setTexts", data: { "shop.title": "Magasin" } } }));
    });
    expect(state().title).toBe("Magasin");
  });

  it("returns keys without a provider", () => {
    render(<Probe />);
    expect(state()).toEqual({ title: "shop.title", items: "ui.items", ready: true });
  });
});
