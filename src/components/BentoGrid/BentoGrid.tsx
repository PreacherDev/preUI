import { useRender } from "@base-ui/react/use-render";
import { createContext, forwardRef, useContext, type CSSProperties, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

interface BentoGridContextValue {
  responsive: boolean;
}

const BentoGridContext = /* @__PURE__ */ createContext<BentoGridContextValue>({ responsive: true });

const toLength = (value: number | string) => (typeof value === "number" ? `${value}px` : value);

export interface BentoGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of columns. @default 3 */
  columns?: number;
  /** Height of one row (a card with `rowSpan={2}` is two rows plus the gap). Number = px. @default "11rem" */
  rowHeight?: number | string;
  /**
   * Stack the cards in one column below the `md` breakpoint (768px), with auto height. `false` keeps the columns
   * at every width — e.g. a fixed-size FiveM tablet or phone UI.
   * @default true
   */
  responsive?: boolean;
}

/**
 * Bento layout: a grid of cards in different sizes (`BentoCard` with `colSpan` / `rowSpan`) — dashboards, tablet and
 * phone home screens, feature overviews. Plain CSS grid, no measuring, works in Chromium 103.
 */
export const BentoGrid = /* @__PURE__ */ forwardRef<HTMLDivElement, BentoGridProps>(function BentoGrid(
  { columns = 3, rowHeight = "11rem", responsive = true, className, style, ...props },
  ref,
) {
  return (
    <BentoGridContext.Provider value={{ responsive }}>
      <div
        ref={ref}
        data-slot="bento-grid"
        data-responsive={responsive ? "" : undefined}
        className={cn(
          "grid gap-3",
          responsive
            ? "grid-cols-1 auto-rows-auto md:auto-rows-[var(--bento-row-height)] md:[grid-template-columns:repeat(var(--bento-columns),minmax(0,1fr))]"
            : "auto-rows-[var(--bento-row-height)] [grid-template-columns:repeat(var(--bento-columns),minmax(0,1fr))]",
          className,
        )}
        style={
          { "--bento-columns": String(columns), "--bento-row-height": toLength(rowHeight), ...style } as CSSProperties
        }
        {...props}
      />
    </BentoGridContext.Provider>
  );
});

export interface BentoCardProps extends Omit<useRender.ComponentProps<"div">, "ref"> {
  /** Columns the card spans. @default 1 */
  colSpan?: number;
  /** Rows the card spans. @default 1 */
  rowSpan?: number;
  /**
   * Hover and focus styles for a clickable card. On by default when `render` swaps the element (e.g.
   * `render={<a href="…" />}` or `render={<button type="button" />}`).
   */
  interactive?: boolean;
}

/**
 * One tile of a `BentoGrid`: card surface, fills its cells. Compose it from `BentoCardVisual` (picture, chart or
 * live content that takes the free space) and `BentoCardContent` (icon, title, description) — or anything else.
 */
export const BentoCard = /* @__PURE__ */ forwardRef<HTMLElement, BentoCardProps>(function BentoCard(
  { colSpan = 1, rowSpan = 1, interactive, render, className, style, ...props },
  ref,
) {
  const { responsive } = useContext(BentoGridContext);
  const clickable = interactive ?? render !== undefined;
  return useRender({
    defaultTagName: "div",
    render,
    ref,
    props: {
      "data-slot": "bento-card",
      "data-interactive": clickable ? "" : undefined,
      className: cn(
        "group/bento relative flex min-w-0 flex-col overflow-hidden rounded-pui border border-pui-border bg-pui-card text-left text-pui-card-foreground",
        // Stacked (small screens): at least one row high, grows with its content.
        responsive
          ? "min-h-[var(--bento-row-height,11rem)] md:min-h-0 md:[grid-column:span_var(--bento-col-span)/span_var(--bento-col-span)] md:[grid-row:span_var(--bento-row-span)/span_var(--bento-row-span)]"
          : "[grid-column:span_var(--bento-col-span)/span_var(--bento-col-span)] [grid-row:span_var(--bento-row-span)/span_var(--bento-row-span)]",
        clickable &&
          "cursor-pointer outline-none transition-colors duration-pui-fast ease-pui hover:border-pui-primary/tint-border hover:bg-pui-accent/40 focus-visible:ring-pui focus-visible:ring-pui-ring",
        className,
      ),
      style: { "--bento-col-span": String(colSpan), "--bento-row-span": String(rowSpan), ...style } as CSSProperties,
      ...props,
    },
  });
});

export type BentoCardVisualProps = HTMLAttributes<HTMLDivElement>;

/** Free area of the card (picture, chart, live value …): takes the space above the content, clipped to the card. */
export const BentoCardVisual = /* @__PURE__ */ forwardRef<HTMLDivElement, BentoCardVisualProps>(function BentoCardVisual(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="bento-card-visual"
      className={cn("relative min-h-0 flex-1 overflow-hidden", className)}
      {...props}
    />
  );
});

export type BentoCardContentProps = HTMLAttributes<HTMLDivElement>;

/** Text block at the bottom of the card: icon, title, description. */
export const BentoCardContent = /* @__PURE__ */ forwardRef<HTMLDivElement, BentoCardContentProps>(function BentoCardContent(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="bento-card-content"
      className={cn("mt-auto flex flex-col gap-1 p-4", className)}
      {...props}
    />
  );
});

export type BentoCardIconProps = HTMLAttributes<HTMLDivElement>;

/** Tinted icon tile above the title. */
export const BentoCardIcon = /* @__PURE__ */ forwardRef<HTMLDivElement, BentoCardIconProps>(function BentoCardIcon(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="bento-card-icon"
      className={cn(
        "mb-2 flex size-8 shrink-0 items-center justify-center rounded-pui-md bg-pui-primary/tint text-pui-primary [&>svg]:size-4",
        className,
      )}
      {...props}
    />
  );
});

export type BentoCardTitleProps = HTMLAttributes<HTMLDivElement>;

export const BentoCardTitle = /* @__PURE__ */ forwardRef<HTMLDivElement, BentoCardTitleProps>(function BentoCardTitle(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="bento-card-title"
      className={cn("text-sm font-semibold leading-5 text-pui-card-foreground", className)}
      {...props}
    />
  );
});

export type BentoCardDescriptionProps = HTMLAttributes<HTMLDivElement>;

export const BentoCardDescription = /* @__PURE__ */ forwardRef<HTMLDivElement, BentoCardDescriptionProps>(function BentoCardDescription(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="bento-card-description"
      className={cn("text-xs leading-relaxed text-pui-muted-foreground", className)}
      {...props}
    />
  );
});
