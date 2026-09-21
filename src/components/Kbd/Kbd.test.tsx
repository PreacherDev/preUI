import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { Kbd, KbdGroup } from "./Kbd";

describe("Kbd", () => {
  it("renders key caps inside a group", () => {
    render(
      <KbdGroup data-testid="group">
        <Kbd>Strg</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>,
    );
    const key = screen.getByText("Strg");
    expect(key.tagName).toBe("KBD");
    expect(key).toHaveClass("h-5", "min-w-5", "px-1", "text-xs", "rounded-pui-sm", "border-pui-border", "bg-pui-muted");
    const group = screen.getByTestId("group");
    expect(group.tagName).toBe("KBD");
    expect(group).toHaveClass("inline-flex", "gap-1");
    expect(group.children).toHaveLength(2);
  });

  it("merges className and forwards refs", () => {
    const ref = createRef<HTMLElement>();
    render(
      <Kbd ref={ref} className="bg-pui-background px-2">
        Esc
      </Kbd>,
    );
    const key = screen.getByText("Esc");
    expect(ref.current).toBe(key);
    expect(key).toHaveClass("bg-pui-background", "px-2");
    expect(key).not.toHaveClass("bg-pui-muted", "px-1");
  });
});
