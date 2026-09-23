import { afterEach, describe, expect, it, vi } from "vitest";
import { parseColor } from "../components/ColorPicker/color";
import { lightTokens, tokens } from "../tailwind/tokens";
import { tokensToCss } from "../tailwind/preset";
import { applyTokens, clearTokens } from "./apply-tokens";
import { checkTokenContrast, contrastPairs, getContrast, getContrastLevel } from "./contrast";
import { deriveTokens } from "./derive";
import {
  normalizeTokenValue,
  renderTokenOverrides,
  runtimeTokenSelectors,
  toHslChannels,
  type TokenInput,
} from "./token-css";

const styleElement = () => document.getElementById("preui-runtime-tokens") as HTMLStyleElement | null;

afterEach(() => {
  clearTokens();
  document.documentElement.removeAttribute("data-scheme");
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
});

describe("toHslChannels / normalizeTokenValue", () => {
  it.each([
    ["#3b82f6", "217 91% 60%"],
    ["#38f", "215 100% 60%"],
    ["#3b82f680", "217 91% 60%"], // alpha dropped
    ["rgb(59, 130, 246)", "217 91% 60%"],
    ["rgb(59 130 246 / 0.5)", "217 91% 60%"],
    ["hsl(217 91% 60%)", "217 91% 60%"],
    ["hsl(217.4, 91.2%, 59.8%)", "217 91% 60%"],
    ["hsla(217deg 91% 60% / 0.3)", "217 91% 60%"],
    ["217 91% 60%", "217 91% 60%"],
    ["217.6 90.5% 59.5%", "218 91% 60%"],
    ["#fff", "0 0% 100%"],
    ["#000000", "0 0% 0%"],
  ])("%s → %s", (input, expected) => {
    expect(toHslChannels(input)).toBe(expected);
    expect(normalizeTokenValue("--pui-primary", input)).toEqual({ name: "--pui-primary", value: expected });
  });

  it.each(["red", "#12", "#ggg", "123", "rgb(1, 2)", "hsl(x 1% 2%)", "217 91 60", ""])("rejects %j", (input) => {
    expect(normalizeTokenValue("--pui-primary", input)).toHaveProperty("issue");
  });

  it("accepts short names and passes non-colour values through", () => {
    expect(normalizeTokenValue("primary", "#fff")).toEqual({ name: "--pui-primary", value: "0 0% 100%" });
    expect(normalizeTokenValue("radius", "0.75rem")).toEqual({ name: "--pui-radius", value: "0.75rem" });
    expect(normalizeTokenValue("--pui-font-sans", '"Geist", sans-serif')).toEqual({
      name: "--pui-font-sans",
      value: '"Geist", sans-serif',
    });
    expect(normalizeTokenValue("--pui-duration-fast", "120ms")).toEqual({ name: "--pui-duration-fast", value: "120ms" });
  });

  it("keeps token references and writes syntax tokens as complete colours", () => {
    expect(normalizeTokenValue("--pui-scrim", "var(--pui-background)")).toEqual({
      name: "--pui-scrim",
      value: "var(--pui-background)",
    });
    expect(normalizeTokenValue("--pui-scrim", "#101010")).toEqual({ name: "--pui-scrim", value: "0 0% 6%" });
    expect(normalizeTokenValue("--pui-syntax-keyword", "#ff0000")).toEqual({
      name: "--pui-syntax-keyword",
      value: "hsl(0 100% 50%)",
    });
    expect(normalizeTokenValue("--pui-syntax-keyword", "#ff000080")).toEqual({
      name: "--pui-syntax-keyword",
      value: "hsl(0 100% 50% / 0.502)",
    });
    expect(normalizeTokenValue("--pui-syntax-keyword", "hsl(var(--pui-primary) / 0.8)")).toEqual({
      name: "--pui-syntax-keyword",
      value: "hsl(var(--pui-primary) / 0.8)",
    });
  });

  it("drops unknown tokens and values that could break out of the declaration", () => {
    expect(normalizeTokenValue("--pui-nope", "#fff")).toEqual({ issue: "unknown-token" });
    expect(normalizeTokenValue("--other", "#fff")).toEqual({ issue: "unknown-token" });
    expect(normalizeTokenValue("--pui-radius", "1px; } body { display: none")).toEqual({ issue: "unsafe-value" });
    expect(normalizeTokenValue("--pui-font-sans", "</style><script>")).toEqual({ issue: "unsafe-value" });
    expect(normalizeTokenValue("--pui-radius", "1px /* x */")).toEqual({ issue: "unsafe-value" });
  });
});

describe("renderTokenOverrides", () => {
  it("renders the three blocks with the runtime selectors, skipping empty ones", () => {
    const { css } = renderTokenOverrides({
      shared: { radius: "0.75rem" },
      dark: { "--pui-primary": "#3b82f6" },
    });
    expect(css).toBe(
      `${runtimeTokenSelectors.shared} {\n  --pui-radius: 0.75rem;\n}\n\n` +
        `${runtimeTokenSelectors.dark} {\n  --pui-primary: 217 91% 60%;\n}\n`,
    );
    expect(css).not.toContain('[data-scheme="light"] {');
  });

  it("selectors outrank the preset and [data-theme][data-scheme] rules", () => {
    // Specificity (ids, classes/attributes/pseudo-classes, types) of each selector in a list.
    const specificity = (selector: string) => {
      const attrs = (selector.match(/\[[^\]]+\]/g) ?? []).length;
      const pseudos = (selector.match(/:(root|not)/g) ?? []).length - (selector.match(/:not/g) ?? []).length;
      return attrs + pseudos;
    };
    const lists = (value: string) => value.split(/,\s*/);
    for (const selector of lists(runtimeTokenSelectors.dark)) expect(specificity(selector)).toBe(3);
    for (const selector of lists(runtimeTokenSelectors.light)) expect(specificity(selector)).toBe(3);
    expect(specificity(runtimeTokenSelectors.shared)).toBe(2);
    expect(specificity('[data-theme="brand"][data-scheme="light"]')).toBe(2);
  });

  it("selectors match the right scheme", () => {
    const html = document.documentElement;
    const [darkRoot, darkSubtree] = runtimeTokenSelectors.dark.split(/,\s*/);
    const [lightRoot] = runtimeTokenSelectors.light.split(/,\s*/);
    expect(html.matches(darkRoot)).toBe(true); // no attribute = dark
    expect(html.matches(lightRoot)).toBe(false);
    html.setAttribute("data-scheme", "light");
    expect(html.matches(darkRoot)).toBe(false); // dark-only values never reach light
    expect(html.matches(lightRoot)).toBe(true);
    const subtree = document.createElement("div");
    subtree.setAttribute("data-scheme", "dark");
    document.body.appendChild(subtree);
    expect(subtree.matches(darkSubtree)).toBe(true);
    subtree.remove();
  });
});

describe("tokensToCss({ tokens })", () => {
  it("renders overrides like applyTokens, with an optional header", () => {
    const overrides = { light: { primary: "#2563eb" } };
    expect(tokensToCss({ tokens: overrides })).toBe(renderTokenOverrides(overrides).css);
    expect(tokensToCss({ tokens: overrides, header: true })).toMatch(/^\/\*\n \* preUI token overrides/);
  });

  it("still renders the full token set without `tokens`", () => {
    expect(tokensToCss()).toContain(':root, [data-scheme="dark"] {');
  });
});

describe("applyTokens", () => {
  it("writes one reusable <style> element in <head>", () => {
    applyTokens({ dark: { primary: "#3b82f6" } });
    applyTokens({ dark: { primary: "#ef4444" }, light: { primary: "#b91c1c" } });
    const elements = document.querySelectorAll("#preui-runtime-tokens");
    expect(elements).toHaveLength(1);
    expect(elements[0].parentElement).toBe(document.head);
    expect(elements[0].textContent).toContain("--pui-primary: 0 84% 60%;");
    expect(elements[0].textContent).toContain("--pui-primary: 0 74% 42%;");
    expect(elements[0].textContent).not.toContain("217 91% 60%");
    expect(document.documentElement.getAttribute("style")).toBeNull(); // no inline style on <html>
  });

  it("the custom property resolves per scheme (dark/light keep their own values)", () => {
    applyTokens({ dark: { primary: "#3b82f6" }, light: { primary: "#1d4ed8" } });
    const html = document.documentElement;
    expect(getComputedStyle(html).getPropertyValue("--pui-primary").trim()).toBe("217 91% 60%");
    html.setAttribute("data-scheme", "light");
    expect(getComputedStyle(html).getPropertyValue("--pui-primary").trim()).toBe("224 76% 48%");
    html.setAttribute("data-scheme", "dark");
    expect(getComputedStyle(html).getPropertyValue("--pui-primary").trim()).toBe("217 91% 60%");
  });

  it("does not rewrite identical CSS", () => {
    applyTokens({ shared: { radius: "4px" } });
    const element = styleElement()!;
    const setter = vi.spyOn(element, "textContent", "set");
    applyTokens({ shared: { radius: "4px" } });
    expect(setter).not.toHaveBeenCalled();
  });

  it("supports own ids and documents; cleanup removes only its own state", () => {
    const first = applyTokens({ shared: { radius: "4px" } });
    applyTokens({ shared: { radius: "6px" } });
    first(); // a later call changed the element: stays
    expect(styleElement()).not.toBeNull();
    const second = applyTokens({ shared: { radius: "6px" } });
    second();
    expect(styleElement()).toBeNull();

    const own = applyTokens({ shared: { radius: "2px" } }, { id: "editor-preview" });
    expect(document.getElementById("editor-preview")?.textContent).toContain("--pui-radius: 2px;");
    own();

    const other = document.implementation.createHTMLDocument("frame");
    applyTokens({ shared: { radius: "1px" } }, { target: other });
    expect(other.getElementById("preui-runtime-tokens")).not.toBeNull();
    expect(styleElement()).toBeNull();
  });

  it("warns once per dropped entry in development and keeps the valid ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const input = { primary: "not-a-colour", radius: "3px", "--pui-bogus": "1" } as TokenInput;
    applyTokens({ dark: input });
    expect(styleElement()!.textContent).toContain("--pui-radius: 3px;");
    expect(styleElement()!.textContent).not.toContain("--pui-primary");
    applyTokens({ dark: { primary: "not-a-colour" } }); // same issue again: no second warning
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toMatch(/\[preUI\] applyTokens: ignored "not-a-colour" is no valid colour/);
  });

  it("is fast enough for a dragged slider", () => {
    const start = performance.now();
    for (let i = 0; i < 600; i++) {
      applyTokens({ dark: { ...deriveTokens({ primary: `hsl(${i % 360} 80% 55%)` }, "dark") } });
    }
    // 600 calls (10 s of dragging at 60 fps) — well under a frame budget each.
    expect((performance.now() - start) / 600).toBeLessThan(8);
  });
});

describe("getContrast", () => {
  it("white on black is 21, the same colour is 1", () => {
    expect(getContrast("#fff", "#000")).toBeCloseTo(21, 5);
    expect(getContrast("#000000", "0 0% 100%")).toBeCloseTo(21, 5);
    expect(getContrast("#3b82f6", "#3b82f6")).toBe(1);
    expect(getContrast("217 91% 60%", "rgb(59, 130, 246)")).toBeCloseTo(1, 1);
  });

  it("matches known WCAG values and handles translucent text", () => {
    expect(getContrast("#767676", "#fff")).toBeCloseTo(4.54, 2);
    expect(getContrast("rgb(0 0 0 / 0)", "#fff")).toBe(1);
    expect(getContrast("nope", "#fff")).toBeNaN();
  });

  it("levels", () => {
    expect(getContrastLevel(21)).toBe("AAA");
    expect(getContrastLevel(7)).toBe("AAA");
    expect(getContrastLevel(4.5)).toBe("AA");
    expect(getContrastLevel(3)).toBe("AA-large");
    expect(getContrastLevel(2.99)).toBe("fail");
  });
});

describe("text on tinted surfaces", () => {
  // `text-pui-<status>` on `bg-pui-<status>/tint` (badges, alerts, default buttons) over the page background.
  const blend = (fg: string, bg: string, alpha: number) => {
    const a = parseColor(`hsl(${fg})`)!;
    const b = parseColor(`hsl(${bg})`)!;
    const mix = (x: number, y: number) => Math.round(x * alpha + y * (1 - alpha));
    return `rgb(${mix(a.r, b.r)} ${mix(a.g, b.g)} ${mix(a.b, b.b)})`;
  };
  it.each([
    ["dark", tokens],
    ["light", lightTokens],
  ] as const)("default %s reaches 4.5:1 for every status colour", (_, set) => {
    const values = set as Record<string, string>;
    const tint = Number(values["--pui-tint-rest"]);
    for (const name of ["primary", "positive", "negative", "warning", "info"]) {
      const colour = values[`--pui-${name}`];
      const ratio = getContrast(colour, blend(colour, values["--pui-background"], tint));
      expect({ name, ok: ratio >= 4.5 }).toEqual({ name, ok: true });
    }
  });
});

describe("checkTokenContrast", () => {
  it.each([
    ["dark", tokens],
    ["light", lightTokens],
  ] as const)("default %s passes every pair with at least AA", (_, set) => {
    const results = checkTokenContrast(set);
    expect(results).toHaveLength(contrastPairs.length);
    for (const result of results) {
      expect({ pair: `${result.fg} on ${result.bg}`, ok: result.ratio >= 4.5 }).toEqual({
        pair: `${result.fg} on ${result.bg}`,
        ok: true,
      });
      expect(["AA", "AAA"]).toContain(result.level);
    }
  });

  it("reports failing pairs, follows references and skips missing tokens", () => {
    const results = checkTokenContrast({
      "--pui-background": "#ffffff",
      "--pui-foreground": "#eeeeee",
      "--pui-card": "var(--pui-background)",
      "--pui-card-foreground": "#111111",
    });
    expect(results).toEqual([
      expect.objectContaining({ fg: "--pui-foreground", bg: "--pui-background", level: "fail" }),
      expect.objectContaining({ fg: "--pui-card-foreground", bg: "--pui-card", level: "AAA" }),
    ]);
  });
});

describe("deriveTokens", () => {
  it("the default primary reproduces the default token sets", () => {
    expect(deriveTokens({ primary: "217 91% 63%" }, "dark")).toEqual(tokens);
    expect(deriveTokens({ primary: "221 83% 53%" }, "light")).toEqual(lightTokens);
    expect(deriveTokens({ primary: "hsl(217 91% 63%)", background: "225 12% 9%" }, "dark")).toEqual(tokens);
  });

  it("returns the same keys as tokens and is directly usable by applyTokens", () => {
    const derived = deriveTokens({ primary: "#e11d48", background: "#1a1410" }, "dark");
    expect(Object.keys(derived)).toEqual(Object.keys(tokens));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    applyTokens({ dark: derived });
    expect(warn).not.toHaveBeenCalled();
  });

  it("derives surfaces from the background", () => {
    const derived = deriveTokens({ primary: "#22c55e", background: "hsl(30 20% 10%)" }, "dark");
    expect(derived["--pui-background"]).toBe("30 20% 10%");
    // card: default +3 L; saturation scaled like the defaults (11/12 of the background's)
    expect(derived["--pui-card"]).toBe("30 18% 13%");
    expect(derived["--pui-border"]).toBe("30 17% 19%");
    expect(derived["--pui-input"]).toBe("30 17% 21%");
    expect(derived["--pui-ring"]).toBe(derived["--pui-primary"]);
    expect(derived["--pui-chart-primary"]).toBe("var(--pui-primary)");
    expect(derived["--pui-quality-premium"]).toBe(tokens["--pui-quality-premium"]);
  });

  it.each([
    [{ primary: "#facc15" }, "dark"],
    [{ primary: "#3b82f6", background: "#f5f0e6" }, "light"],
    [{ primary: "#ffffff", background: "#000000", positive: "#a3e635", warning: "#fde047" }, "dark"],
    [{ primary: "#6b7280", background: "#9ca3af", destructive: "#f87171", info: "#0ea5e9" }, "light"],
    [{ primary: "#7c3aed", background: "#0b1020", foreground: "#606070" }, "dark"],
  ] as const)("every *-foreground reaches 4.5:1 on its surface (%j, %s)", (base, scheme) => {
    const derived = deriveTokens(base, scheme);
    const textPairs = checkTokenContrast(derived).filter((result) => result.fg.endsWith("-foreground"));
    for (const result of textPairs) {
      expect({ pair: `${result.fg} on ${result.bg}`, ratio: result.ratio >= 4.5 }).toEqual({
        pair: `${result.fg} on ${result.bg}`,
        ratio: true,
      });
    }
  });

  it("keeps a readable default foreground and falls back to white/black otherwise", () => {
    expect(deriveTokens({ primary: "#3b82f6" }, "dark")["--pui-primary-foreground"]).toBe("225 12% 9%");
    expect(deriveTokens({ primary: "#1e3a8a" }, "dark")["--pui-primary-foreground"]).toBe("0 0% 100%");
    expect(deriveTokens({ primary: "#fde047" }, "light")["--pui-primary-foreground"]).toBe("0 0% 0%");
  });

  it("snapshot: a custom dark palette", () => {
    expect(
      deriveTokens({ primary: "#f97316", background: "#101418", positive: "#10b981", destructive: "#dc2626" }, "dark"),
    ).toMatchSnapshot();
  });
});

describe("colorScheme: false in the preset and tokensToCss", () => {
  it("leaves out color-scheme", () => {
    expect(tokensToCss()).toContain("color-scheme: dark;");
    expect(tokensToCss({ colorScheme: false })).not.toContain("color-scheme");
    expect(tokensToCss({ colorScheme: false, scheme: "light" })).not.toContain("color-scheme");
  });
});
