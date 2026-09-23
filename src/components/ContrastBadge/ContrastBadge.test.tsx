import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { ContrastBadge } from "./ContrastBadge";

describe("ContrastBadge", () => {
  it("shows ratio and level for a colour pair", () => {
    render(<ContrastBadge foreground="#ffffff" background="#000000" />);
    const badge = screen.getByLabelText("Contrast 21.00 to 1, AAA");
    expect(badge).toHaveAttribute("data-slot", "contrast-badge");
    expect(badge).toHaveAttribute("data-level", "AAA");
    expect(badge).toHaveAttribute("data-ratio", "21.00");
    expect(badge).toHaveAttribute("data-variant", "positive");
    expect(badge).toHaveTextContent("21.00AAA");
  });

  it("maps levels to badge variants", () => {
    const { rerender } = render(<ContrastBadge ratio={3.5} />);
    expect(screen.getByLabelText(/AA large/)).toHaveAttribute("data-variant", "warning");
    rerender(<ContrastBadge ratio={1.2} />);
    expect(screen.getByLabelText(/Fail/)).toHaveAttribute("data-variant", "destructive");
    rerender(<ContrastBadge ratio={4.5} showRatio={false} />);
    expect(screen.getByLabelText("Contrast 4.50 to 1, AA")).toHaveTextContent(/^AA$/);
  });

  it("accepts HSL channels, labels, locale, className and refs", () => {
    const ref = createRef<HTMLElement>();
    render(
      <ContrastBadge
        ref={ref}
        foreground="225 12% 92%"
        background="225 12% 9%"
        locale="de-DE"
        className="ml-2"
        labels={{ description: (ratio, level) => `Kontrast ${ratio}:1 (${level})` }}
      />,
    );
    const badge = screen.getByLabelText("Kontrast 15,01:1 (AAA)");
    expect(ref.current).toBe(badge);
    expect(badge).toHaveClass("ml-2");
  });

  it("treats invalid colours as fail", () => {
    render(<ContrastBadge foreground="nope" background="#fff" />);
    expect(screen.getByLabelText("Contrast – to 1, Fail")).not.toHaveAttribute("data-ratio");
  });
});
