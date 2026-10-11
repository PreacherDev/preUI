// Layout stability of the ThemeEditor (nothing may jump while a slider or colour changes the contrast result) and the
// `samples` prop of the split preview.
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ThemeConfig } from "../../theming/theme-config";
import { allPairKeys, importantPairs, otherPairKeys } from "./theme-editor-config";
import { ThemeEditor } from "./ThemeEditor";

const slot = (container: HTMLElement, name: string) => container.querySelector<HTMLElement>(`[data-slot="${name}"]`);
const withTint = (scale: string): ThemeConfig => ({ v: 1, scheme: "dark", palette: {}, tokens: { shared: { "tint-scale": scale } } });
const visiblePairs = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-slot="theme-editor-contrast"] > ul > [data-slot="theme-editor-contrast-item"]')].map(
    (item) => item.getAttribute("data-pair"),
  );
const status = (container: HTMLElement, scheme: string) =>
  container.querySelector<HTMLElement>(`[data-slot="theme-editor-status-item"][data-scheme-status="${scheme}"]`)!;

describe("ThemeEditor layout stability", () => {
  it("the pair lists cover every checked pair exactly once", () => {
    expect([...importantPairs, ...otherPairKeys].sort()).toEqual([...allPairKeys].sort());
    expect(new Set(allPairKeys).size).toBe(allPairKeys.length);
  });

  it("the contrast details always list the same rows in the same order, whatever the accent strength", () => {
    const { container, rerender } = render(<ThemeEditor presets={[]} preview={false} value={withTint("0.5")} />);
    const low = visiblePairs(container);
    expect(low).toEqual([...importantPairs]);
    expect(slot(container, "theme-editor-contrast-other")).toHaveAttribute("data-problems", "0");

    rerender(<ThemeEditor presets={[]} preview={false} value={withTint("3")} />);
    // Strong tints make tinted text unreadable: more problems, but not more (or reordered) rows.
    expect(status(container, "dark")).not.toHaveAttribute("data-problems", "0");
    expect(visiblePairs(container)).toEqual(low);
    expect(Number(slot(container, "theme-editor-contrast-other")!.getAttribute("data-problems"))).toBeGreaterThan(0);
    expect(slot(container, "theme-editor-contrast-other-summary")).toHaveTextContent(/\d+ problems?/);
    expect(container.querySelector('[data-slot="theme-editor-contrast-item"][data-pair="primary/primary"]')).toHaveAttribute(
      "data-contrast",
      "fail",
    );
  });

  it("the other pairs open in a collapsible group, in a fixed order", async () => {
    const user = userEvent.setup();
    const { container } = render(<ThemeEditor presets={[]} preview={false} value={withTint("3")} />);
    const group = slot(container, "theme-editor-contrast-other")!;
    await user.click(within(group).getByRole("button", { name: /Other pairs/ }));
    const rows = [...group.querySelectorAll('[data-slot="theme-editor-contrast-item"]')].map((item) => item.getAttribute("data-pair"));
    expect(rows).toEqual([...otherPairKeys]);
    expect(group.querySelector('[data-pair="positive/positive"]')).toHaveAttribute("data-contrast", "fail");
  });

  it("status badges reserve the width of their longest summary without adding text", () => {
    const { container, rerender } = render(<ThemeEditor presets={[]} preview={false} value={withTint("1")} />);
    const dark = status(container, "dark");
    expect(dark).toHaveTextContent(/^Dark: all readable$/);
    const reserve = dark.querySelector<HTMLElement>("[data-reserve-a]")!;
    expect(reserve).toHaveAttribute("data-reserve-a", "Dark: all readable");
    expect(reserve).toHaveAttribute("data-reserve-b", `Dark: ${allPairKeys.length} problems`);
    expect(reserve).toHaveClass("inline-grid", "tabular-nums");

    rerender(<ThemeEditor presets={[]} preview={false} value={withTint("3")} />);
    expect(status(container, "dark")).toHaveTextContent(/^Dark: \d+ problems?$/);
  });

  it("the tab warning icon is always in the layout, invisible while readable", () => {
    const { container, rerender } = render(<ThemeEditor presets={[]} preview={false} value={withTint("1")} />);
    const darkTab = () => container.querySelector<HTMLElement>('[data-slot="theme-editor-colors"] [role="tab"][data-problems]')!;
    expect(darkTab().querySelector("svg")).toHaveClass("invisible");
    rerender(<ThemeEditor presets={[]} preview={false} value={withTint("3")} />);
    expect(darkTab().querySelector("svg")).not.toHaveClass("invisible");
  });
});

describe("ThemeEditor samples", () => {
  const sampleOf = (container: HTMLElement) =>
    slot(container, "theme-editor-preview")!.querySelector('[data-slot="theme-editor-sample"]')!.getAttribute("data-sample");

  it("offers both samples by default", () => {
    const { container } = render(<ThemeEditor layout="split" presets={[]} preview={false} />);
    const items = within(slot(container, "theme-editor-sample-switch")!).getAllByRole("button");
    expect(items.map((item) => item.textContent)).toEqual(["Interface", "Game"]);
  });

  it('samples={["web"]} hides the switch and shows only the interface sample', () => {
    const { container } = render(<ThemeEditor layout="split" presets={[]} preview={false} samples={["web"]} defaultSample="game" />);
    expect(slot(container, "theme-editor-sample-switch")).toBeNull();
    expect(sampleOf(container)).not.toBe("game");
  });

  it('samples={["game"]} shows only the game sample', () => {
    const { container } = render(<ThemeEditor layout="split" presets={[]} preview={false} samples={["game"]} />);
    expect(slot(container, "theme-editor-sample-switch")).toBeNull();
    expect(sampleOf(container)).toBe("game");
  });
});
