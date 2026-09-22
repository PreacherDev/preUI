import { describe, expect, it } from "vitest";
import preuiPreset, { createPreuiPreset } from "./preset";

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
