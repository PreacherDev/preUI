import { describe, expect, it } from "vitest";
import { parseThemeImport } from "../components/ThemeEditor/theme-editor-config";
import { decodeThemeCode, encodeThemeCode, isThemeCode, THEME_CODE_PREFIX } from "./theme-code";
import type { ThemeConfig } from "./theme-config";

describe("theme codes", () => {
  const config: ThemeConfig = {
    v: 1,
    scheme: "dark",
    palette: { dark: { primary: "#34d399" }, light: { primary: "#047052" } },
    tokens: { shared: { radius: "1rem", "font-sans": "Ünïcode Sans" } },
  };

  it("round-trips a config as one url-safe line", () => {
    const code = encodeThemeCode(config);
    expect(code.startsWith(THEME_CODE_PREFIX)).toBe(true);
    expect(code.slice(THEME_CODE_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(JSON.parse(decodeThemeCode(code)!)).toEqual(config);
  });

  it("carries only the theme fields", () => {
    const code = encodeThemeCode({ ...config, secret: "x" } as ThemeConfig);
    expect(JSON.parse(decodeThemeCode(code)!)).not.toHaveProperty("secret");
  });

  it("tolerates whitespace from chat and rejects anything else", () => {
    const code = encodeThemeCode(config);
    expect(isThemeCode(`  ${code}\n`)).toBe(true);
    expect(decodeThemeCode(`${code.slice(0, 20)} \n ${code.slice(20)}`)).not.toBeNull();
    expect(decodeThemeCode("PUI1.not base64!")).toBeNull();
    expect(decodeThemeCode('{"v":1}')).toBeNull();
  });

  it("is read by the theme import like pasted JSON", () => {
    const result = parseThemeImport(encodeThemeCode(config), "dark");
    expect(result.ok && result.config.palette).toEqual(config.palette);
    expect(parseThemeImport("PUI1.%%%", "dark")).toEqual({ ok: false, error: "code" });
  });
});
