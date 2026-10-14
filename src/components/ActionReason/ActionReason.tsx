import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";
import { Badge, type BadgeVariant } from "../Badge/Badge";

/**
 * Why an action can't run right now:
 * - `hint`: the form is still empty — a quiet helper text
 * - `invalid`: the entry is wrong — the user fixes it
 * - `blocked`: the state blocks it (rights, money, limits) — the user can't fix it here
 */
export type ActionReasonKind = "hint" | "invalid" | "blocked";

export const actionReasonVariants = /* @__PURE__ */ cva("flex min-w-0 items-start gap-1.5 text-xs", {
  variants: {
    kind: {
      hint: "text-pui-muted-foreground",
      invalid: "text-pui-negative",
      blocked: "text-pui-warning",
    },
    /** Keeps the line's height, so nothing moves when the reason comes or goes. */
    reserve: {
      true: "min-h-6",
      false: "",
    },
  },
  defaultVariants: {
    kind: "hint",
    reserve: true,
  },
});

type ActionReasonVariantProps = VariantProps<typeof actionReasonVariants>;

const badgeVariantForKind: Record<ActionReasonKind, BadgeVariant> = {
  hint: "secondary",
  invalid: "destructive",
  blocked: "warning",
};

export interface ActionReasonProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** @default "hint" */
  kind?: ActionReasonKind;
  /** The reason. Without it the slot stays empty (and keeps its height unless `reserve` is `false`). */
  children?: ReactNode;
  /**
   * `"text"` (default): one line next to or under the action. `"badge"`: a pill, for a tile or a panel header —
   * `reveal` turns it on automatically.
   */
  variant?: "text" | "badge";
  /** Keep the height of the line when there is no reason, so a form never jumps. @default true */
  reserve?: boolean;
  /** Icon before the text; `null` removes it. Default: none for `hint`, a warning sign for `invalid`, a lock for `blocked`. */
  icon?: ReactNode;
  /**
   * `"hover"`: only the icon shows (badge form); the reason slides open while the badge — or, with `revealGroup`,
   * its `group` parent (a tile) — is hovered or holds the focus.
   */
  reveal?: "hover";
  /** Open when the nearest parent with the `group` class is hovered, not only the badge itself. */
  revealGroup?: boolean;
  /** ms before a `reveal` badge opens. @default 300 */
  revealDelay?: number;
}

/**
 * Says why an action is disabled, in a slot that keeps its height. Put it next to the button, in the dialog footer
 * or — as a badge — into a tile or a panel header.
 *
 * ```tsx
 * <ActionReason kind="hint">{amount ? null : "Enter an amount"}</ActionReason>
 * <ActionReason kind="blocked" reveal="hover" revealGroup icon={<Lock />}>Your rank may not transfer money</ActionReason>
 * ```
 */
export const ActionReason = /* @__PURE__ */ forwardRef<HTMLDivElement, ActionReasonProps>(function ActionReason(
  { kind = "hint", children, variant, reserve = true, icon, reveal, revealGroup, revealDelay = 300, className, ...props },
  ref,
) {
  const Warning = useIcon("warning");
  const Lock = useIcon("lock");
  const asBadge = (variant ?? (reveal ? "badge" : "text")) === "badge";
  const empty = children == null || children === false || children === "";
  if (empty && !reserve) return null;

  const defaultIcon =
    kind === "invalid" ? (
      <Warning aria-hidden="true" />
    ) : kind === "blocked" ? (
      <Lock aria-hidden="true" />
    ) : null;
  const marker = icon === undefined ? defaultIcon : icon;

  if (asBadge) {
    return (
      <div
        ref={ref}
        data-slot="action-reason"
        data-kind={kind}
        data-variant="badge"
        className={cn("flex items-center", reserve && "min-h-6", className)}
        {...props}
      >
        {!empty && (
          <Badge
            variant={badgeVariantForKind[kind]}
            icon={marker}
            reveal={reveal}
            revealGroup={revealGroup}
            revealDelay={revealDelay}
          >
            {children}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-slot="action-reason"
      data-kind={kind}
      data-variant="text"
      className={cn(actionReasonVariants({ kind, reserve } as ActionReasonVariantProps), className)}
      {...props}
    >
      {!empty && (
        <>
          {marker != null && <span className="mt-px inline-flex shrink-0 [&>svg]:size-3.5">{marker}</span>}
          <span className="min-w-0 break-words">{children}</span>
        </>
      )}
    </div>
  );
});
