import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react";
import { useIcon } from "../../icons";
import { cn, mergeClassName } from "../../utils/cn";
import { Button, type ButtonProps } from "../Button/Button";

export type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
export type CarouselOptions = UseCarouselParameters[0];
export type CarouselPlugin = UseCarouselParameters[1];
export type CarouselOrientation = "horizontal" | "vertical";

export interface CarouselProps extends HTMLAttributes<HTMLDivElement> {
  /** Embla options (`axis` is derived from `orientation`). */
  opts?: CarouselOptions;
  /** Embla plugins, e.g. `Autoplay()`. */
  plugins?: CarouselPlugin;
  orientation?: CarouselOrientation;
  /** Receives the Embla API once the carousel is ready. */
  setApi?: (api: CarouselApi) => void;
}

interface CarouselContextValue {
  carouselRef: UseEmblaCarouselType[0];
  api: CarouselApi;
  opts?: CarouselOptions;
  orientation: CarouselOrientation;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
}

const CarouselContext = /* @__PURE__ */ createContext<CarouselContextValue | null>(null);

/** Access the carousel state (api, orientation, scroll helpers) inside `<Carousel>`. */
export function useCarousel(): CarouselContextValue {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }
  return context;
}

/** Root of the carousel: sets up Embla, keyboard navigation and the context for its parts. */
export const Carousel = /* @__PURE__ */ forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  { orientation = "horizontal", opts, setApi, plugins, className, children, onKeyDownCapture, ...props },
  ref,
) {
  const [carouselRef, api] = useEmblaCarousel(
    { ...opts, axis: orientation === "horizontal" ? "x" : "y" },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback((emblaApi: CarouselApi) => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, []);

  const scrollPrev = useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = useCallback(() => api?.scrollNext(), [api]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDownCapture?.(event);
      if (event.defaultPrevented) return;
      const prevKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
      const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
      if (event.key === prevKey) {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === nextKey) {
        event.preventDefault();
        scrollNext();
      }
    },
    [orientation, scrollPrev, scrollNext, onKeyDownCapture],
  );

  useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("reInit", onSelect);
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{ carouselRef, api, opts, orientation, scrollPrev, scrollNext, canScrollPrev, canScrollNext }}
    >
      <div
        ref={ref}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        data-orientation={orientation}
        className={cn("relative", className)}
        onKeyDownCapture={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
});

/** Viewport + slide track. */
export const CarouselContent = /* @__PURE__ */ forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CarouselContent({ className, ...props }, ref) {
    const { carouselRef, orientation } = useCarousel();
    return (
      <div ref={carouselRef} className="overflow-hidden" data-slot="carousel-viewport">
        <div
          ref={ref}
          data-slot="carousel-content"
          className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)}
          {...props}
        />
      </div>
    );
  },
);

/** One slide. Use `basis-1/2`, `basis-1/3` … to show several slides per view. */
export const CarouselItem = /* @__PURE__ */ forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CarouselItem({ className, ...props }, ref) {
    const { orientation } = useCarousel();
    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        data-slot="carousel-item"
        className={cn(
          "min-w-0 shrink-0 grow-0 basis-full",
          // min-h-0: in a vertical track a slide must keep its basis height (like min-w-0 horizontally) —
          // taller content would otherwise grow the slide and push the next one past the viewport's edge.
          orientation === "horizontal" ? "pl-4" : "min-h-0 pt-4",
          className,
        )}
        {...props}
      />
    );
  },
);

export interface CarouselPreviousProps extends ButtonProps {
  /** Accessible label of the button. */
  label?: string;
}

export interface CarouselNextProps extends ButtonProps {
  /** Accessible label of the button. */
  label?: string;
}

const navButtonBase = "absolute rounded-full";

/** Scrolls to the previous slide; disabled at the start (unless `loop`). */
export const CarouselPrevious = /* @__PURE__ */ forwardRef<HTMLElement, CarouselPreviousProps>(function CarouselPrevious(
  { className, variant = "outline", size = "icon-sm", label = "Previous slide", onClick, ...props },
  ref,
) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();
  const ChevronLeft = useIcon("chevronLeft");
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      aria-label={label}
      data-slot="carousel-previous"
      className={mergeClassName(
        [
          navButtonBase,
          orientation === "horizontal"
            ? "-left-12 top-1/2 -translate-y-1/2"
            : "-top-12 left-1/2 -translate-x-1/2 [&_svg]:rotate-90",
        ],
        className,
      )}
      disabled={!canScrollPrev}
      onClick={(event) => {
        onClick?.(event);
        scrollPrev();
      }}
      {...props}
    >
      <ChevronLeft aria-hidden="true" />
    </Button>
  );
});

/** Scrolls to the next slide; disabled at the end (unless `loop`). */
export const CarouselNext = /* @__PURE__ */ forwardRef<HTMLElement, CarouselNextProps>(function CarouselNext(
  { className, variant = "outline", size = "icon-sm", label = "Next slide", onClick, ...props },
  ref,
) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();
  const ChevronRight = useIcon("chevronRight");
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      aria-label={label}
      data-slot="carousel-next"
      className={mergeClassName(
        [
          navButtonBase,
          orientation === "horizontal"
            ? "-right-12 top-1/2 -translate-y-1/2"
            : "-bottom-12 left-1/2 -translate-x-1/2 [&_svg]:rotate-90",
        ],
        className,
      )}
      disabled={!canScrollNext}
      onClick={(event) => {
        onClick?.(event);
        scrollNext();
      }}
      {...props}
    >
      <ChevronRight aria-hidden="true" />
    </Button>
  );
});
