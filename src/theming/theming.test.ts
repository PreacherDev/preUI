import { afterEach, describe, expect, it, vi } from "vitest";
import { parseColor } from "../components/ColorPicker/color";
import { lightTokens, tokens } from "../tailwind/tokens";
import { tokensToCss } from "../tailwind/preset";
import { applyTokens, clearTokens } from "./apply-tokens";
import {
  checkTokenContrast,
  contrastPairs,
  getContrast,
  getContrastLevel,
  tintContrastColors,
  tintContrastSurfaces,
} from "./contrast";
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
  // `text-pui-<status>` on `bg-pui-<status>/tint` (badges, alerts, default buttons) over every surface they sit on.
  const blend = (fg: string, bg: string, alpha: number) => {
    const a = parseColor(`hsl(${fg})`)!;
    const b = parseColor(`hsl(${bg})`)!;
    const mix = (x: number, y: number) => Math.round(x * alpha + y * (1 - alpha));
    return `rgb(${mix(a.r, b.r)} ${mix(a.g, b.g)} ${mix(a.b, b.b)})`;
  };
  it.each([
    ["dark", tokens],
    ["light", lightTokens],
  ] as const)("default %s reaches 4.5:1 for every tinted colour on every surface", (_, set) => {
    const values = set as Record<string, string>;
    const tint = Number(values["--pui-tint-rest"]);
    for (const name of tintContrastColors) {
      for (const surface of tintContrastSurfaces) {
        const colour = values[name];
        const ratio = getContrast(colour, blend(colour, values[surface], tint));
        expect({ name, surface, ok: ratio >= 4.5 }).toEqual({ name, surface, ok: true });
      }
    }
  });
});

describe("checkTokenContrast", () => {
  it.each([
    ["dark", tokens],
    ["light", lightTokens],
  ] as const)("default %s passes every pair with at least AA", (_, set) => {
    const results = checkTokenContrast(set);
    expect(results).toHaveLength(contrastPairs.length + tintContrastColors.length);
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

  it("checks each status colour as text on its own tint over the surfaces and reports the worst", () => {
    const tinted = checkTokenContrast(tokens).filter((result) => result.tint !== undefined);
    expect(tinted.map((result) => result.fg)).toEqual(tintContrastColors);
    for (const result of tinted) {
      expect(result.bg).toBe(result.fg);
      expect(result.tint).toBeCloseTo(0.15, 5);
      expect(tintContrastSurfaces).toContain(result.surface);
    }
    // Plain pairs carry no tint fields.
    expect(checkTokenContrast(tokens)[0]).not.toHaveProperty("surface");
    // The tint over the grey surface is darker than over white: the grey one is reported.
    const [result] = checkTokenContrast({
      "--pui-primary": "#2563eb",
      "--pui-background": "#ffffff",
      "--pui-muted": "#e5e7eb",
      "--pui-tint-rest": "0.1",
    }).filter((entry) => entry.tint !== undefined);
    expect(result).toMatchObject({ fg: "--pui-primary", bg: "--pui-primary", surface: "--pui-muted", tint: 0.1 });
  });

  it("follows --pui-tint-scale: stronger tints lower the ratio, no tint-rest skips the tinted pairs", () => {
    const primary = (set: Record<string, string>) =>
      checkTokenContrast(set).find((result) => result.tint !== undefined && result.fg === "--pui-primary")!;
    const normal = primary(tokens);
    const strong = primary({ ...tokens, "--pui-tint-scale": "3" });
    expect(strong.tint).toBeCloseTo(0.45, 5);
    expect(strong.ratio).toBeLessThan(normal.ratio);
    expect(strong.level).not.toBe("AA");
    // Scale 0: no tint, the plain ratio on the lowest-contrast surface.
    const surfaces = tintContrastSurfaces.map((surface) => getContrast(tokens["--pui-primary"], tokens[surface]));
    expect(primary({ ...tokens, "--pui-tint-scale": "0" }).ratio).toBeCloseTo(Math.min(...surfaces), 5);
    expect(primary({ ...tokens, "--pui-tint-scale": "nope" }).tint).toBeCloseTo(0.15, 5); // unparsable scale = 1
    const { "--pui-tint-rest": _rest, ...withoutTint } = tokens;
    expect(checkTokenContrast(withoutTint).some((result) => result.tint !== undefined)).toBe(false);
  });

  it("the defaults stay readable on their tints at tint scale 1, not at 1.5", () => {
    for (const set of [tokens, lightTokens]) {
      const passes = (scale: number) =>
        checkTokenContrast({ ...set, "--pui-tint-scale": String(scale) }).every((result) => result.ratio >= 4.5);
      expect(passes(1)).toBe(true);
      expect(passes(1.5)).toBe(false);
    }
  });
});

describe("deriveTokens", () => {
  it("the default primary reproduces the default token sets", () => {
    expect(deriveTokens({ primary: "255 92% 76%" }, "dark")).toEqual(tokens);
    expect(deriveTokens({ primary: "263 70% 50%" }, "light")).toEqual(lightTokens);
    expect(deriveTokens({ primary: "hsl(255 92% 76%)", background: "225 12% 9%" }, "dark")).toEqual(tokens);
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
    // card: default +3 L; chroma scaled like the defaults (this background is 1.85× as colourful as the default one)
    expect(derived["--pui-card"]).toBe("30 19% 13%");
    expect(derived["--pui-border"]).toBe("30 18% 19%");
    expect(derived["--pui-input"]).toBe("30 18% 21%");
    expect(derived["--pui-ring"]).toBe(derived["--pui-primary"]);
    expect(derived["--pui-chart-primary"]).toBe("var(--pui-primary)");
    expect(derived["--pui-quality-premium"]).toBe(tokens["--pui-quality-premium"]);
  });

  it("scales chroma, not saturation: near-white and navy backgrounds keep neutral text and surfaces", () => {
    const chroma = (value: string) => {
      const [, s, l] = value.replace(/%/g, "").split(" ").map(Number);
      return (1 - Math.abs((2 * l) / 100 - 1)) * (s / 100);
    };
    // #fffdf8 is 100 % saturated but almost white: surfaces and text get a light tint, not yellow / brown / mustard.
    const cream = deriveTokens({ primary: "#9f4706", background: "#fffdf8" }, "light");
    expect(cream["--pui-background"]).toBe("43 100% 99%");
    for (const name of ["--pui-shell", "--pui-muted", "--pui-border", "--pui-input"] as const) {
      expect(chroma(cream[name])).toBeLessThan(0.05);
    }
    expect(cream["--pui-card"]).toBe(cream["--pui-background"]); // white card on a white page → cream on cream
    expect(cream["--pui-foreground"]).toBe("43 19% 12%");
    expect(chroma(cream["--pui-muted-foreground"])).toBeLessThanOrEqual(chroma(lightTokens["--pui-muted-foreground"]) * 1.5);
    // Navy (#0b1324, 53 % saturation): surfaces stay navy, text is only slightly blue (≤ 1.5× the default tint).
    const navy = deriveTokens({ primary: "#60a5fa", background: "#0b1324" }, "dark");
    expect(navy["--pui-card"]).toBe("221 49% 12%");
    expect(navy["--pui-foreground"]).toBe("221 18% 92%");
    // (+ 0.01: the saturation is rounded to whole percent)
    expect(chroma(navy["--pui-muted-foreground"])).toBeLessThanOrEqual(chroma(tokens["--pui-muted-foreground"]) * 1.5 + 0.01);
    // A grey background gives grey surfaces and text.
    const grey = deriveTokens({ primary: "#e5e5e5", background: "#111111" }, "dark");
    expect(grey["--pui-card"]).toBe("0 0% 10%");
    expect(grey["--pui-foreground"]).toBe("0 0% 92%");
  });

  it("moves status colours you left out until they are readable on their tint over the derived surfaces", () => {
    const base = { primary: "#7c3aed", background: "#f1f5f9" };
    const derived = deriveTokens(base, "light");
    const tinted = checkTokenContrast(derived).filter((result) => result.tint !== undefined && result.fg !== "--pui-primary");
    for (const result of tinted) expect({ fg: result.fg, ok: result.ratio >= 4.5 }).toEqual({ fg: result.fg, ok: true });
    // Same hue and saturation, only darker on this light page.
    const [h, s, l] = derived["--pui-negative"].replace(/%/g, "").split(" ").map(Number);
    expect([h, s]).toEqual([0, 81]);
    expect(l).toBeLessThan(42);
    // Colours you give are kept as they are; destructive (a solid fill) is never moved.
    expect(deriveTokens({ ...base, negative: "#ef4444" }, "light")["--pui-negative"]).toBe("0 84% 60%");
    expect(derived["--pui-destructive"]).toBe(lightTokens["--pui-destructive"]);
    // Without a background of your own nothing moves.
    expect(deriveTokens({ primary: "#7c3aed" }, "light")["--pui-negative"]).toBe(lightTokens["--pui-negative"]);
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
