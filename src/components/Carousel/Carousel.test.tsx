import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
  type CarouselApi,
} from "./Carousel";

// jsdom lacks the browser APIs Embla relies on.
beforeAll(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
  class MockObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", MockObserver);
  vi.stubGlobal("ResizeObserver", MockObserver);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function Slides({ count = 3 }: { count?: number }) {
  return (
    <CarouselContent>
      {Array.from({ length: count }, (_, i) => (
        <CarouselItem key={i}>Folie {i + 1}</CarouselItem>
      ))}
    </CarouselContent>
  );
}

describe("Carousel", () => {
  it("renders region and slides with roledescriptions", () => {
    render(
      <Carousel aria-label="Lager" className="max-w-sm">
        <Slides />
      </Carousel>,
    );
    const region = screen.getByRole("region", { name: "Lager" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    expect(region).toHaveAttribute("data-orientation", "horizontal");
    expect(region).toHaveClass("relative", "max-w-sm");
    const slides = screen.getAllByRole("group");
    expect(slides).toHaveLength(3);
    slides.forEach((slide) => {
      expect(slide).toHaveAttribute("aria-roledescription", "slide");
      expect(slide).toHaveClass("basis-full", "pl-4");
    });
    expect(slides[0].parentElement).toHaveClass("flex", "-ml-4");
  });

  it("lays out vertically", () => {
    render(
      <Carousel orientation="vertical" aria-label="Vertikal">
        <Slides />
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    expect(screen.getByRole("region")).toHaveAttribute("data-orientation", "vertical");
    const slide = screen.getAllByRole("group")[0];
    expect(slide).toHaveClass("pt-4");
    expect(slide.parentElement).toHaveClass("flex-col", "-mt-4");
    expect(screen.getByRole("button", { name: "Previous slide" })).toHaveClass("-top-12", "[&_svg]:rotate-90");
    expect(screen.getByRole("button", { name: "Next slide" })).toHaveClass("-bottom-12");
  });

  it("renders previous/next buttons with default and custom labels", () => {
    const { rerender } = render(
      <Carousel>
        <Slides />
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    const prev = screen.getByRole("button", { name: "Previous slide" });
    expect(prev).toHaveClass("rounded-full", "size-pui-control-sm", "border-pui-border", "-left-12");
    expect(prev).toHaveAttribute("data-slot", "carousel-previous");
    expect(prev).not.toHaveClass("rounded-pui-md");
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();

    rerender(
      <Carousel>
        <Slides />
        <CarouselPrevious label="Vorherige Folie" className={() => "custom-prev"} />
        <CarouselNext label="Nächste Folie" />
      </Carousel>,
    );
    expect(screen.getByRole("button", { name: "Vorherige Folie" })).toHaveClass("custom-prev", "rounded-full");
    expect(screen.getByRole("button", { name: "Nächste Folie" })).toBeInTheDocument();
  });

  it("disables the buttons when embla cannot scroll (jsdom has no layout)", () => {
    render(
      <Carousel>
        <Slides />
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();
  });

  it("passes the embla api to setApi", async () => {
    const setApi = vi.fn();
    render(
      <Carousel setApi={setApi}>
        <Slides />
      </Carousel>,
    );
    await waitFor(() => expect(setApi).toHaveBeenCalled());
    const api = setApi.mock.calls[0][0] as NonNullable<CarouselApi>;
    expect(typeof api.scrollNext).toBe("function");
    expect(api.slideNodes()).toHaveLength(3);
  });

  it("buttons and arrow keys call the api", async () => {
    const user = userEvent.setup();
    const setApi = vi.fn();
    render(
      <Carousel setApi={setApi} aria-label="Lager">
        <Slides />
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    await waitFor(() => expect(setApi).toHaveBeenCalled());
    const api = setApi.mock.calls[0][0] as NonNullable<CarouselApi>;
    const next = vi.spyOn(api, "scrollNext");
    const prev = vi.spyOn(api, "scrollPrev");
    // Pretend embla has room to scroll, then trigger a re-evaluation.
    vi.spyOn(api, "canScrollNext").mockReturnValue(true);
    vi.spyOn(api, "canScrollPrev").mockReturnValue(true);
    act(() => {
      api.reInit();
    });

    const nextButton = screen.getByRole("button", { name: "Next slide" });
    await waitFor(() => expect(nextButton).toBeEnabled());
    await user.click(nextButton);
    expect(next).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Previous slide" }));
    expect(prev).toHaveBeenCalledTimes(1);

    const region = screen.getByRole("region");
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(next).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(region, { key: "ArrowLeft" });
    expect(prev).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(region, { key: "ArrowDown" });
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("uses up/down arrows when vertical", async () => {
    const setApi = vi.fn();
    render(
      <Carousel orientation="vertical" setApi={setApi}>
        <Slides />
      </Carousel>,
    );
    await waitFor(() => expect(setApi).toHaveBeenCalled());
    const api = setApi.mock.calls[0][0] as NonNullable<CarouselApi>;
    const next = vi.spyOn(api, "scrollNext");
    const prev = vi.spyOn(api, "scrollPrev");
    const region = screen.getByRole("region");
    fireEvent.keyDown(region, { key: "ArrowDown" });
    fireEvent.keyDown(region, { key: "ArrowUp" });
    fireEvent.keyDown(region, { key: "ArrowRight" });
    expect(next).toHaveBeenCalledTimes(1);
    expect(prev).toHaveBeenCalledTimes(1);
  });

  it("useCarousel exposes context and throws outside", () => {
    function Probe() {
      const { orientation, canScrollNext } = useCarousel();
      return <span>{`${orientation}-${String(canScrollNext)}`}</span>;
    }
    render(
      <Carousel orientation="vertical">
        <Probe />
      </Carousel>,
    );
    expect(screen.getByText("vertical-false")).toBeInTheDocument();

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useCarousel must be used within a <Carousel />");
    spy.mockRestore();
  });
});

describe("Carousel slots", () => {
  it("marks root, viewport, content and items", () => {
    const { container } = render(
      <Carousel aria-label="Lager">
        <Slides />
      </Carousel>,
    );
    expect(screen.getByRole("region", { name: "Lager" })).toHaveAttribute("data-slot", "carousel");
    expect(container.querySelector('[data-slot="carousel-viewport"]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="carousel-content"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-slot="carousel-item"]')).toHaveLength(3);
  });
});

describe("Carousel vertical slides", () => {
  it("vertical slides keep their basis height (min-h-0)", () => {
    render(
      <Carousel orientation="vertical" aria-label="Vertikal">
        <CarouselContent className="h-48">
          <CarouselItem className="basis-1/2">A</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );
    expect(screen.getByRole("group")).toHaveClass("min-h-0", "pt-4");
  });
});
