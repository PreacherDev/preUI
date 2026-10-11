import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatMoney, useNuiMoney, type UseNuiMoneyOptions } from ".";

afterEach(() => {
  delete (window as Partial<Window>).invokeNative;
  delete (window as Partial<Window>).GetParentResourceName;
  vi.restoreAllMocks();
});

describe("formatMoney", () => {
  it.each([
    [1234.5, {}, "1,235"],
    [1234.5, { format: "${amount}" }, "$1,235"],
    [1234.5, { format: "{amount} €", decimals: 2, locale: "de-DE" }, "1.234,50 €"],
    [-500, { format: "${amount}" }, "-$500"],
    [-0.2, { format: "${amount}" }, "$0"],
    [99, { format: "$" }, "$99"],
    [1234567.891, { decimals: 2, locale: "de-DE", thousands: " " }, "1 234 567,89"],
    [1234.5, { format: "{amount} €", decimals: 2, locale: "fr-FR", thousands: " ", decimal: "," }, "1 234,50 €"],
    [1234.5, { decimals: 2, thousands: "'", decimal: "." }, "1'234.50"],
    [1234567, { thousands: "" }, "1234567"],
    [-1234.5, { format: "${amount}", decimals: 1, thousands: ".", decimal: "," }, "-$1.234,5"],
    [1234.5, { decimals: 2, locale: "not a locale!", thousands: ".", decimal: "," }, "1.234,50"],
    [1234.5, { decimals: 2, locale: "not a locale!" }, "1234.50"],
  ] as const)("%j with %j → %j", (amount, options, expected) => {
    expect(formatMoney(amount, options)).toBe(expected);
  });
});

function Probe(props: UseNuiMoneyOptions) {
  const money = useNuiMoney(props);
  return <output data-testid="m">{JSON.stringify({ text: money.format(1500), ready: money.ready })}</output>;
}
const state = () => JSON.parse(screen.getByTestId("m").textContent!);

describe("useNuiMoney", () => {
  it("uses the fallback in a browser", async () => {
    render(<Probe fallback={{ format: "{amount} €" }} locale="de-DE" />);
    await act(async () => {});
    expect(state()).toEqual({ text: "1.500 €", ready: true });
  });

  it("asks getCurrency in the game once and follows setCurrency", async () => {
    Object.assign(window, { invokeNative: () => {}, GetParentResourceName: () => "pre_shops" });
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ format: "${amount}", decimals: 2 })));
    render(<Probe />);
    expect(state()).toEqual({ text: "$1,500", ready: false });
    await act(async () => {});
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("https://pre_shops/getCurrency", expect.anything());
    expect(state()).toEqual({ text: "$1,500.00", ready: true });
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: { action: "setCurrency", data: { format: "{amount} $", decimals: 0 } } }));
    });
    expect(state().text).toBe("1,500 $");
  });

  it("uses the separators Lua sends and keeps the locale's for the rest", async () => {
    Object.assign(window, { invokeNative: () => {}, GetParentResourceName: () => "pre_shops" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ format: "{amount} €", decimals: 2, thousands: " ", decimal: "," })),
    );
    function Currency() {
      const money = useNuiMoney({ locale: "fr-FR" });
      return <output data-testid="c">{JSON.stringify({ text: money.format(1500), currency: money.currency })}</output>;
    }
    render(<Currency />);
    await act(async () => {});
    const read = () => JSON.parse(screen.getByTestId("c").textContent!);
    expect(read()).toEqual({
      text: "1 500,00 €",
      currency: { format: "{amount} €", decimals: 2, thousands: " ", decimal: "," },
    });
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", { data: { action: "setCurrency", data: { format: "{amount} €", decimals: 2, decimal: "" } } }),
      );
    });
    // No separators sent (an empty decimal is ignored): back to Intl's for fr-FR (narrow no-break space).
    expect(read().text).toBe("1\u202f500,00 €");
    expect(read().currency).toEqual({ format: "{amount} €", decimals: 2 });
  });

  it("takes separators from the fallback", async () => {
    render(<Probe fallback={{ format: "{amount} €", thousands: "." }} locale="en-US" />);
    await act(async () => {});
    expect(state()).toEqual({ text: "1.500 €", ready: true });
  });
});
