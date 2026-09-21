import { render, screen } from "@testing-library/react";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "./Avatar";

describe("Avatar", () => {
  it("renders the fallback while the image is not loaded", () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarImage src="/nicht-vorhanden.png" alt="Lena Tausch" />
        <AvatarFallback>LT</AvatarFallback>
      </Avatar>,
    );
    const avatar = screen.getByTestId("avatar");
    expect(avatar).toHaveClass("rounded-full", "size-8", "text-xs");
    const fallback = screen.getByText("LT");
    expect(fallback).toHaveClass("bg-pui-muted", "text-pui-muted-foreground", "font-medium");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("applies size variants", () => {
    render(
      <>
        <Avatar data-testid="sm" size="sm">
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar data-testid="lg" size="lg">
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
      </>,
    );
    expect(screen.getByTestId("sm")).toHaveClass("size-6", "text-pui-2xs");
    expect(screen.getByTestId("lg")).toHaveClass("size-10", "text-sm");
    expect(screen.getByTestId("lg")).not.toHaveClass("size-8");
  });

  it("merges className, including the function form", () => {
    render(
      <Avatar data-testid="avatar" className="rounded-pui-md">
        <AvatarFallback className={(state) => `status-${state.imageLoadingStatus}`}>MK</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByTestId("avatar")).toHaveClass("rounded-pui-md");
    expect(screen.getByTestId("avatar")).not.toHaveClass("rounded-full");
    expect(screen.getByText("MK")).toHaveClass("status-idle", "bg-pui-muted");
  });

  it("marks root and fallback with data-slot and data-size", () => {
    render(
      <>
        <Avatar data-testid="default">
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
        <Avatar data-testid="lg" size="lg">
          <AvatarFallback>B</AvatarFallback>
        </Avatar>
      </>,
    );
    expect(screen.getByTestId("default")).toHaveAttribute("data-slot", "avatar");
    expect(screen.getByTestId("default")).toHaveAttribute("data-size", "default");
    expect(screen.getByTestId("lg")).toHaveAttribute("data-size", "lg");
    expect(screen.getByText("A")).toHaveAttribute("data-slot", "avatar-fallback");
  });

  it("stacks avatars in an AvatarGroup with a cut-out ring and a count bubble", () => {
    render(
      <AvatarGroup data-testid="group">
        <Avatar>
          <AvatarFallback>MK</AvatarFallback>
        </Avatar>
        <AvatarGroupCount size="lg">+5</AvatarGroupCount>
      </AvatarGroup>,
    );
    const group = screen.getByTestId("group");
    expect(group).toHaveAttribute("data-slot", "avatar-group");
    expect(group).toHaveClass("-space-x-1.5", "[&>[data-slot=avatar]]:ring-2", "[&>[data-slot=avatar]]:ring-pui-card", "[&>[data-slot=avatar]]:border-pui-border");
    const count = screen.getByText("+5");
    expect(count).toHaveAttribute("data-slot", "avatar-group-count");
    expect(count).toHaveAttribute("data-size", "lg");
    expect(count).toHaveClass("size-10", "rounded-full", "bg-pui-muted");
  });
});
