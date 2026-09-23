import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import { cn, mergeClassName } from "../../utils/cn";

export const avatarVariants = /* @__PURE__ */ cva(
  "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-pui-muted align-middle",
  {
    variants: {
      size: {
        /** 24px, 10px initials. */
        sm: "size-6 text-pui-2xs",
        /** 32px, 12px initials. */
        default: "size-8 text-xs",
        /** 40px, 14px initials. */
        lg: "size-10 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export type AvatarSize = NonNullable<VariantProps<typeof avatarVariants>["size"]>;

export interface AvatarProps extends ComponentPropsWithoutRef<typeof BaseAvatar.Root> {
  size?: AvatarSize;
}

/** Round profile picture with an initials fallback. Children: `AvatarImage` and `AvatarFallback`. */
export const Avatar = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAvatar.Root>, AvatarProps>(function Avatar(
  { className, size, ...props },
  ref,
) {
  return (
    <BaseAvatar.Root
      ref={ref}
      data-slot="avatar"
      data-size={size ?? "default"}
      className={mergeClassName(avatarVariants({ size }), className)}
      {...props}
    />
  );
});

export type AvatarImageProps = ComponentPropsWithoutRef<typeof BaseAvatar.Image>;

/** The picture; only rendered once it has loaded. Always pass an `alt`. */
export const AvatarImage = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAvatar.Image>, AvatarImageProps>(
  function AvatarImage({ className, ...props }, ref) {
    return (
      <BaseAvatar.Image
        ref={ref}
        data-slot="avatar-image"
        className={mergeClassName("size-full object-cover", className)}
        {...props}
      />
    );
  },
);

export type AvatarFallbackProps = ComponentPropsWithoutRef<typeof BaseAvatar.Fallback>;

/** Initials or an icon, shown while the image is missing, loading or broken. */
export const AvatarFallback = /* @__PURE__ */ forwardRef<ComponentRef<typeof BaseAvatar.Fallback>, AvatarFallbackProps>(
  function AvatarFallback({ className, ...props }, ref) {
    return (
      <BaseAvatar.Fallback
        ref={ref}
        data-slot="avatar-fallback"
        className={mergeClassName(
          "flex size-full items-center justify-center rounded-full bg-pui-muted font-medium text-pui-muted-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);

export type AvatarGroupProps = ComponentPropsWithoutRef<"div">;

/**
 * Overlapping row of avatars. Each avatar gets a 1px border plus a 2px ring in the card colour as a cut-out;
 * on another surface, set the ring colour here (e.g. `[&>[data-slot=avatar]]:ring-pui-background`).
 */
export const AvatarGroup = /* @__PURE__ */ forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="avatar-group"
      className={cn(
        "flex items-center -space-x-1.5",
        "[&>[data-slot=avatar-group-count]]:ring-2 [&>[data-slot=avatar-group-count]]:ring-pui-card [&>[data-slot=avatar]]:ring-2 [&>[data-slot=avatar]]:ring-pui-card",
        "[&>[data-slot=avatar-group-count]]:border [&>[data-slot=avatar-group-count]]:border-pui-border [&>[data-slot=avatar]]:border [&>[data-slot=avatar]]:border-pui-border",
        className,
      )}
      {...props}
    />
  );
});

export interface AvatarGroupCountProps extends ComponentPropsWithoutRef<"span"> {
  size?: AvatarSize;
}

/** The trailing "+5" bubble of an `AvatarGroup`, sized like the avatars. */
export const AvatarGroupCount = /* @__PURE__ */ forwardRef<HTMLSpanElement, AvatarGroupCountProps>(function AvatarGroupCount(
  { className, size, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      data-slot="avatar-group-count"
      data-size={size ?? "default"}
      className={cn(avatarVariants({ size }), "font-medium text-pui-muted-foreground", className)}
      {...props}
    />
  );
});
