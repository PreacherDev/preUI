import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { HudContainer, getHudPositionStyle, hudAnchors } from "./HudContainer";

describe("HudContainer", () => {
  it("defaults to fixed, top-left, no offset, not interactive", () => {
    render(<HudContainer data-testid="hud">Minimap</HudContainer>);
    const hud = screen.getByTestId("hud");
    expect(hud).toHaveAttribute("data-slot", "hud-container");
    expect(hud).toHaveAttribute("data-anchor", "top-left");
    expect(hud).not.toHaveAttribute("data-interactive");
    expect(hud).toHaveClass("fixed", "pointer-events-none");
    expect(hud).not.toHaveClass("transition-[left,right,top,bottom,transform]");
    expect(hud.style.left).toBe("0px");
    expect(hud.style.top).toBe("0px");
    expect(hud.style.transform).toBe("");
  });

  it("updates position styles when anchor and offset change at runtime", () => {
    const { rerender } = render(<HudContainer data-testid="hud" anchor="top-right" offset={24} />);
    const hud = screen.getByTestId("hud");
    expect(hud.style.right).toBe("24px");
    expect(hud.style.top).toBe("24px");
    expect(hud.style.left).toBe("");

    rerender(<HudContainer data-testid="hud" anchor="bottom" offset={{ x: 10, y: 32 }} />);
    expect(hud).toHaveAttribute("data-anchor", "bottom");
    expect(hud.style.left).toBe("calc(50% + 10px)");
    expect(hud.style.bottom).toBe("32px");
    expect(hud.style.right).toBe("");
    expect(hud.style.top).toBe("");
    expect(hud.style.transform).toBe("translate(-50%, 0)");

    rerender(<HudContainer data-testid="hud" anchor="center" />);
    expect(hud.style.left).toBe("50%");
    expect(hud.style.top).toBe("50%");
    expect(hud.style.transform).toBe("translate(-50%, -50%)");

    rerender(<HudContainer data-testid="hud" anchor="left" offset={16} />);
    expect(hud.style.left).toBe("16px");
    expect(hud.style.top).toBe("calc(50% + 16px)");
    expect(hud.style.transform).toBe("translate(0, -50%)");
  });

  it("covers every anchor", () => {
    expect(hudAnchors).toHaveLength(9);
    for (const anchor of hudAnchors) {
      const style = getHudPositionStyle(anchor, 8);
      const horizontal = ["left", "right"].filter((key) => key in style);
      const vertical = ["top", "bottom"].filter((key) => key in style);
      expect(horizontal).toHaveLength(1);
      expect(vertical).toHaveLength(1);
    }
    expect(getHudPositionStyle("bottom-right", 8)).toEqual({ right: 8, bottom: 8 });
  });

  it("supports absolute position, transition and interactive", () => {
    render(<HudContainer data-testid="hud" position="absolute" transition interactive />);
    const hud = screen.getByTestId("hud");
    expect(hud).toHaveClass(
      "absolute",
      "pointer-events-auto",
      "transition-[left,right,top,bottom,transform]",
      "duration-pui-base",
      "ease-pui",
    );
    expect(hud).not.toHaveClass("fixed", "pointer-events-none");
    expect(hud).toHaveAttribute("data-interactive");
  });

  it("merges className and style; forwards the ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<HudContainer ref={ref} data-testid="hud" className="z-10 flex" style={{ width: 200, top: 5 }} />);
    const hud = screen.getByTestId("hud");
    expect(ref.current).toBe(hud);
    expect(hud).toHaveClass("z-10", "flex");
    expect(hud).not.toHaveClass("z-40");
    expect(hud.style.width).toBe("200px");
    expect(hud.style.top).toBe("5px");
  });
});
