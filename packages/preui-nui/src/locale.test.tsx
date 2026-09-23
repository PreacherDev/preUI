import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeLocale, useNuiLocale, type UseNuiLocaleOptions } from ".";

function Probe(props: UseNuiLocaleOptions) {
  const { locale, language, ready } = useNuiLocale(props);
  return <output data-testid="locale">{JSON.stringify({ locale, language, ready })}</output>;
}
const state = () => JSON.parse(screen.getByTestId("locale").textContent!);

afterEach(() => {
  delete (window as Partial<Window>).invokeNative;
  delete (window as Partial<Window>).GetParentResourceName;
  vi.restoreAllMocks();
});

describe("normalizeLocale", () => {
  it.each([
    ["de", "de"],
    ["de_DE", "de-DE"],
    ["DE-de", "de-DE"],
    [" en-us ", "en-US"],
    ["", null],
    ["german", null],
    [42, null],
  ])("%j → %j", (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });
});

describe("useNuiLocale", () => {
  it("uses the fallback, then the mock in a browser, and becomes ready", async () => {
    render(<Probe mock="de_DE" fallback="en-GB" />);
    expect(state()).toEqual({ locale: "en-GB", language: "en", ready: false });
    await act(async () => {});
    expect(state()).toEqual({ locale: "de-DE", language: "de", ready: true });
  });

  it("asks the getLocale callback in the game and follows setLocale messages", async () => {
    Object.assign(window, { invokeNative: () => {}, GetParentResourceName: () => "shop" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify("fr")));
    render(<Probe />);
    await act(async () => {});
    expect(fetchSpy).toHaveBeenCalledWith("https://shop/getLocale", expect.anything());
    expect(state()).toMatchObject({ locale: "fr", language: "fr", ready: true });
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: { action: "setLocale", data: "de-AT" } }));
    });
    expect(state().locale).toBe("de-AT");
    act(() => {
      window.dispatchEvent(new MessageEvent("message", { data: { action: "setLocale", data: "!!" } }));
    });
    expect(state().locale).toBe("de-AT"); // invalid values are ignored
  });

  it("stays on the fallback when Lua returns nothing usable or fails", async () => {
    Object.assign(window, { invokeNative: () => {}, GetParentResourceName: () => "shop" });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no callback"));
    render(<Probe fallback="de-DE" />);
    await act(async () => {});
    expect(state()).toEqual({ locale: "de-DE", language: "de", ready: true });
  });

  it("is ready at once with event={false}", () => {
    render(<Probe event={false} />);
    expect(state()).toEqual({ locale: "en-US", language: "en", ready: true });
  });
});
