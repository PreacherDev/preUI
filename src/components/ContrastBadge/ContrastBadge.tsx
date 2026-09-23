import { forwardRef, type ReactNode } from "react";
import { getContrast, getContrastLevel, type ContrastLevel } from "../../theming/contrast";
import { Badge, type BadgeProps, type BadgeVariant } from "../Badge/Badge";

const levelVariant: Record<ContrastLevel, BadgeVariant> = {
  AAA: "positive",
  AA: "positive",
  "AA-large": "warning",
  fail: "destructive",
};

export interface ContrastBadgeLabels {
  /** Level names shown in the badge. */
  levels: Record<ContrastLevel, string>;
  /** Accessible description, e.g. "Contrast 4.52 to 1, AA". */
  description: (ratio: string, level: string) => string;
}

export const defaultContrastBadgeLabels: ContrastBadgeLabels = {
  levels: { AAA: "AAA", AA: "AA", "AA-large": "AA large", fail: "Fail" },
  description: (ratio, level) => `Contrast ${ratio} to 1, ${level}`,
};

export interface ContrastBadgeProps extends Omit<BadgeProps, "variant" | "children"> {
  /** Text colour (hex, rgb(), hsl() or HSL channels). Used with `background` when `ratio` is not given. */
  foreground?: string;
  background?: string;
  /** A precomputed ratio (e.g. from `checkTokenContrast`); wins over `foreground` / `background`. */
  ratio?: number;
  /** Show the ratio next to the level. @default true */
  showRatio?: boolean;
  /** Number formatting locale for the ratio. @default "en-US" */
  locale?: string;
  labels?: Partial<ContrastBadgeLabels>;
  /** Replaces the badge content; the level and ratio stay available as data attributes. */
  children?: ReactNode;
}

/**
 * WCAG contrast of a colour pair as a badge — green for AA/AAA, amber for "AA large" (3:1, large text only), red
 * below. For theme editors: it shows problems, it doesn't block anything.
 */
export const ContrastBadge = /* @__PURE__ */ forwardRef<HTMLElement, ContrastBadgeProps>(function ContrastBadge(
  { foreground, background, ratio: ratioProp, showRatio = true, locale = "en-US", labels, children, ...props },
  ref,
) {
  const resolved = { ...defaultContrastBadgeLabels, ...labels };
  const ratio =
    ratioProp ?? (foreground !== undefined && background !== undefined ? getContrast(foreground, background) : NaN);
  const valid = Number.isFinite(ratio);
  const level: ContrastLevel = valid ? getContrastLevel(ratio) : "fail";
  const ratioText = valid
    ? new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ratio)
    : "–";
  const levelText = resolved.levels[level];
  return (
    <Badge
      ref={ref}
      variant={levelVariant[level]}
      data-slot="contrast-badge"
      data-level={level}
      data-ratio={valid ? ratio.toFixed(2) : undefined}
      aria-label={resolved.description(ratioText, levelText)}
      {...props}
    >
      {children ?? (
        <>
          {showRatio && <span className="font-mono tabular-nums">{ratioText}</span>}
          <span>{levelText}</span>
        </>
      )}
    </Badge>
  );
});
