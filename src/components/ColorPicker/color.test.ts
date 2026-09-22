import { describe, expect, it } from "vitest";
import { hexToHsl, hexToHsv, hslToHex, hslToHsv, hsvToHex, hsvToHsl, normalizeHex, parseColor, rgbToHex } from "./color";

describe("colour helpers", () => {
  it("parseColor: hex forms, with and without #", () => {
    expect(parseColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor("0f0")).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseColor("#00F8")).toEqual({ r: 0, g: 0, b: 255, a: 0.533 });
    expect(parseColor("#10b77f80")).toEqual({ r: 16, g: 183, b: 127, a: 0.502 });
    expect(parseColor(" #ABCDEF ")).toEqual({ r: 171, g: 205, b: 239, a: 1 });
  });

  it("parseColor: rgb() and hsl(), comma and space syntax", () => {
    expect(parseColor("rgb(16, 183, 127)")).toEqual({ r: 16, g: 183, b: 127, a: 1 });
    expect(parseColor("rgba(16,183,127,0.5)")).toEqual({ r: 16, g: 183, b: 127, a: 0.5 });
    expect(parseColor("rgb(16 183 127 / 50%)")).toEqual({ r: 16, g: 183, b: 127, a: 0.5 });
    expect(rgbToHex(parseColor("hsl(160 84% 39%)")!)).toBe("#10b77f");
    expect(rgbToHex(parseColor("hsla(0, 100%, 50%, 1)")!)).toBe("#ff0000");
  });

  it("parseColor: rejects everything else", () => {
    for (const bad of ["", "#", "#zz", "#12345", "#1234567", "red", "rgb(1,2)", "hsl(a b c)", "rgb(1, 2, 3, 4, 5)"]) {
      expect(parseColor(bad), bad).toBeNull();
    }
  });

  it("normalizeHex and rgbToHex", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("#abc", true)).toBe("#aabbccff");
    expect(normalizeHex("#aabbcc80")).toBe("#aabbcc");
    expect(normalizeHex("nope")).toBeNull();
    expect(rgbToHex({ r: 300, g: -5, b: 127.6 })).toBe("#ff0080");
    expect(rgbToHex({ r: 0, g: 0, b: 0, a: 0.5 }, true)).toBe("#00000080");
  });

  it("hexToHsv / hsvToHex", () => {
    expect(hexToHsv("#ff0000")).toEqual({ h: 0, s: 100, v: 100, a: 1 });
    expect(hexToHsv("#000000")).toEqual({ h: 0, s: 0, v: 0, a: 1 });
    expect(hexToHsv("#ffffff")).toEqual({ h: 0, s: 0, v: 100, a: 1 });
    expect(hexToHsv("#00ff00")!.h).toBe(120);
    expect(hexToHsv("#0000ff")!.h).toBe(240);
    expect(hexToHsv("invalid")).toBeNull();
    expect(hsvToHex({ h: 0, s: 100, v: 100 })).toBe("#ff0000");
    expect(hsvToHex({ h: 360, s: 100, v: 100 })).toBe("#ff0000");
    expect(hsvToHex({ h: 200, s: 0, v: 0 })).toBe("#000000");
    expect(hsvToHex({ h: 120, s: 100, v: 100, a: 0.5 }, true)).toBe("#00ff0080");
  });

  it("hexToHsl / hslToHex", () => {
    const hsl = hexToHsl("#10b77f")!;
    expect(Math.round(hsl.h)).toBe(160);
    expect(Math.round(hsl.s)).toBe(84);
    expect(Math.round(hsl.l)).toBe(39);
    expect(hslToHex({ h: 160, s: 84, l: 39 })).toBe("#10b77f");
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe("#ffffff");
    expect(hslToHex({ h: 0, s: 100, l: 50, a: 0 }, true)).toBe("#ff000000");
  });

  it("hsl()/rgb() input keeps full precision (no 8-bit rounding)", () => {
    const hsv = hexToHsv("hsl(200 50% 50%)")!;
    expect(hsv.h).toBeCloseTo(200, 9);
    expect(hsv.s).toBeCloseTo(66.6667, 3);
    expect(hsv.v).toBeCloseTo(75, 9);
    expect(parseColor("rgb(10.5, 0, 0)")!.r).toBe(10.5);
    expect(normalizeHex("hsl(200 50% 50%)")).toBe("#4095bf");
  });

  it("round-trips every 6-digit colour on a grid through HSV and HSL", () => {
    for (let r = 0; r <= 255; r += 17) {
      for (let g = 0; g <= 255; g += 51) {
        for (let b = 0; b <= 255; b += 85) {
          const hex = rgbToHex({ r, g, b });
          expect(hsvToHex(hexToHsv(hex)!), hex).toBe(hex);
          expect(hslToHex(hexToHsl(hex)!), hex).toBe(hex);
        }
      }
    }
  });

  it("round-trips 8-digit colours (alpha)", () => {
    for (const hex of ["#10b77f80", "#00000000", "#ffffffff", "#3366cc1a"]) {
      expect(hsvToHex(hexToHsv(hex)!, true)).toBe(hex);
      expect(hslToHex(hexToHsl(hex)!, true)).toBe(hex);
    }
  });

  it("hsvToHsl / hslToHsv are inverse", () => {
    const hsv = { h: 210, s: 60, v: 80, a: 1 };
    const back = hslToHsv(hsvToHsl(hsv));
    expect(back.h).toBe(210);
    expect(back.s).toBeCloseTo(60, 6);
    expect(back.v).toBeCloseTo(80, 6);
    expect(hslToHsv({ h: 10, s: 50, l: 0 })).toEqual({ h: 10, s: 0, v: 0, a: 1 });
  });
});
