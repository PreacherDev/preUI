import { describe, expect, it } from "vitest";
import preuiPreset, {
  createPreuiPreset,
  lightTokens,
  schemeSelectors,
  schemeTokens,
  schemes,
  sharedTokenNames,
  tokens,
  tokensHeader,
  tokensToCss,
} from "./preset";

describe("Tailwind preset", () => {
  it("defines the indeterminate progress animation", () => {
    const { keyframes, animation } = createPreuiPreset().theme.extend;
    expect(keyframes["pui-progress-indeterminate"]).toEqual({
      "0%": { transform: "translateX(-100%)" },
      "100%": { transform: "translateX(250%)" },
    });
    expect(animation["pui-progress-indeterminate"]).toMatch(/^pui-progress-indeterminate .* infinite$/);
  });

  it("the default export equals createPreuiPreset()", () => {
    expect(preuiPreset.theme).toEqual(createPreuiPreset().theme);
  });
});

/** Runs the preset's plugin and collects everything it passes to addBase. */
function baseStyles(options?: Parameters<typeof createPreuiPreset>[0]) {
  const bases: Record<string, Record<string, unknown>> = {};
  const plugin = createPreuiPreset(options).plugins[0] as (api: { addBase: (styles: object) => void }) => void;
  plugin({ addBase: (styles) => Object.assign(bases, styles) });
  return bases;
}

const declarations = (css: string, selector: string) => {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  return [...body.matchAll(/^\s+(--[\w-]+):/gm)].map((match) => match[1]);
};

describe("colour schemes", () => {
  it("lightTokens has exactly the same key set (and order) as the dark tokens", () => {
    expect(Object.keys(lightTokens)).toEqual(Object.keys(tokens));
    expect(schemes).toEqual({ dark: tokens, light: lightTokens });
  });

  it("the light scheme changes every scheme-dependent colour surface", () => {
    for (const name of ["--pui-background", "--pui-foreground", "--pui-card", "--pui-border", "--pui-primary", "--pui-shadow-floating"] as const) {
      expect(lightTokens[name], name).not.toBe(tokens[name]);
    }
    for (const name of sharedTokenNames) expect(lightTokens[name]).toBe(tokens[name]);
    for (const name of Object.keys(tokens).filter((key) => key.startsWith("--pui-syntax-"))) {
      expect(lightTokens[name as keyof typeof lightTokens]).toBeTruthy();
    }
    expect(Object.keys(tokens).filter((key) => key.startsWith("--pui-syntax-"))).toHaveLength(20);
  });

  it("schemeTokens leaves out the shared tokens only", () => {
    const light = Object.keys(schemeTokens("light"));
    expect(light).toEqual(Object.keys(tokens).filter((name) => !(sharedTokenNames as readonly string[]).includes(name)));
  });

  it("tokensToCss emits both blocks by default", () => {
    const css = tokensToCss();
    expect(css).toContain(':root, [data-scheme="dark"] {');
    expect(css).toContain('[data-scheme="light"] {');
    expect(css.indexOf(":root")).toBeLessThan(css.indexOf('[data-scheme="light"]'));
    expect(declarations(css, ':root, [data-scheme="dark"]')).toEqual(Object.keys(tokens));
    expect(declarations(css, '[data-scheme="light"]')).toEqual(Object.keys(schemeTokens("light")));
    expect(css).toMatch(/\[data-scheme="light"\] \{[^}]*color-scheme: light;/);
    expect(css).toMatch(/:root, \[data-scheme="dark"\] \{[^}]*color-scheme: dark;/);
    expect(css).toContain(`--pui-background: ${lightTokens["--pui-background"]};`);
  });

  it("tokensToCss with a single scheme writes that scheme's complete set on :root", () => {
    const light = tokensToCss({ scheme: "light" });
    expect(light).not.toContain("data-scheme");
    expect(declarations(light, ":root")).toEqual(Object.keys(tokens));
    expect(light).toContain(`--pui-primary: ${lightTokens["--pui-primary"]};`);
    expect(light).toContain("color-scheme: light;");
    const dark = tokensToCss({ scheme: "dark", header: true });
    expect(dark.startsWith(tokensHeader)).toBe(true);
    expect(dark).toContain("color-scheme: dark;");
  });

  it("the header explains scheme and theme", () => {
    expect(tokensHeader).toContain('data-scheme="dark" | "light"');
    expect(tokensHeader).toContain('[data-theme="brand"][data-scheme="light"]');
    expect(tokensHeader).toContain('themes={{ paper: "light" }}');
  });

  it("the preset injects dark on :root and light under [data-scheme=light]", () => {
    const bases = baseStyles();
    expect(bases[schemeSelectors.dark]).toMatchObject({ "--pui-background": tokens["--pui-background"], colorScheme: "dark" });
    expect(bases[schemeSelectors.light]).toMatchObject({ "--pui-background": lightTokens["--pui-background"], colorScheme: "light" });
    expect(bases[schemeSelectors.light]).not.toHaveProperty("--pui-radius");
  });

  it("injects a single scheme on :root, or nothing with injectTokens: false", () => {
    expect(baseStyles({ scheme: "light" })[":root"]).toMatchObject({ "--pui-primary": lightTokens["--pui-primary"], colorScheme: "light" });
    const none = baseStyles({ injectTokens: false });
    expect(none[schemeSelectors.dark]).toBeUndefined();
    expect(none[schemeSelectors.light]).toBeUndefined();
  });

  it("leaves out colorScheme with colorScheme: false (FiveM NUI iframes stay transparent)", () => {
    const bases = baseStyles({ colorScheme: false });
    expect(bases[schemeSelectors.dark]).toMatchObject({ "--pui-background": tokens["--pui-background"] });
    expect(bases[schemeSelectors.dark]).not.toHaveProperty("colorScheme");
    expect(bases[schemeSelectors.light]).not.toHaveProperty("colorScheme");
    expect(baseStyles({ scheme: "dark", colorScheme: false })[":root"]).not.toHaveProperty("colorScheme");
  });

  it("scrollbar thumbs use a token colour (works in both schemes)", () => {
    const bases = baseStyles();
    expect(JSON.stringify(bases["*:hover::-webkit-scrollbar-thumb"])).toContain("var(--pui-muted-foreground)");
  });
});
