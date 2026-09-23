import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useIcon } from "../../icons";
import { cn } from "../../utils/cn";

// ---------------------------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------------------------

/** Highlight colour of a segment. `"default"` and `"primary"` both use the primary tint. */
export type RadialMenuTone = "default" | "primary" | "positive" | "warning" | "destructive";

export interface RadialMenuItem {
  /** Stable id, unique within its level. Reported in the `path` of `onSelect`. */
  id: string;
  /** Short label (one or two words), shown on the segment and in the centre while highlighted. */
  label: string;
  /** Icon on the segment, e.g. a lucide icon. It is sized to 20px. */
  icon?: ReactNode;
  /** Can't be highlighted or selected (skipped by the arrow keys). */
  disabled?: boolean;
  /** Submenu. An item with (non-empty) `items` opens them instead of being selected. */
  items?: RadialMenuItem[];
  /** Longer hint, shown in the centre below the label while the item is highlighted (not with `renderCenter`). */
  description?: string;
  /** Extra classes for this item's content (the `radial-menu-item` element), after `classNames.item`. */
  className?: string;
  /** Highlight colour of the segment and its text, e.g. `"destructive"` for an "Arrest" item. Default `"default"`. */
  tone?: RadialMenuTone;
}

/** State passed to `renderItem`. */
export interface RadialMenuItemState {
  highlighted: boolean;
  disabled: boolean;
  /** Submenu depth, 0 = root level. */
  level: number;
  /** Position in the current level (0 = the first item, at `startAngle`). */
  index: number;
  /** Items on the current level. */
  count: number;
  hasSubmenu: boolean;
}

/** State passed to `renderCenter`. */
export interface RadialMenuCenterState {
  /** The highlighted item of the current level, if any. */
  highlighted: RadialMenuItem | null;
  /** Submenu depth, 0 = root level. */
  level: number;
  /** The opened submenu items from the root level down (empty on the root level). */
  path: RadialMenuItem[];
  /** What a click on the centre does: `"back"` in a submenu, `"close"` on a closable root level, else `null`. */
  action: "back" | "close" | null;
  /** The pointer rests on the centre. */
  centerActive: boolean;
}

/** Parts that `classNames` can style. */
export type RadialMenuPart =
  | "root"
  | "ring"
  | "segment"
  | "segmentHighlight"
  | "item"
  | "icon"
  | "label"
  | "center"
  | "centerContent"
  | "centerLabel"
  | "centerDescription";

export type RadialMenuClassNames = Partial<Record<RadialMenuPart, string>>;

export interface RadialMenuLabels {
  /** Accessible name of the menu. */
  menu: string;
  /** Shown in the centre inside a submenu (the centre goes back one level). */
  back: string;
  /** Shown in the centre on the root level while the pointer is over it (the centre closes the menu). */
  close: string;
}

export const defaultRadialMenuLabels: RadialMenuLabels = {
  menu: "Radial menu",
  back: "Back",
  close: "Close",
};

export interface RadialMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect" | "children"> {
  /** Items of the root level (2–10 per level; up to 8 reads best). */
  items: RadialMenuItem[];
  /** A leaf item was chosen. `path` = the ids from the root level down to the item (incl. its own id). */
  onSelect?: (item: RadialMenuItem, path: string[]) => void;
  /** Controlled open state. While closed nothing is rendered. */
  open?: boolean;
  /** Initial open state when uncontrolled. Default `true`. */
  defaultOpen?: boolean;
  /**
   * Called when the menu wants to close: Escape on the root level, a click on the centre on the root level, or after
   * a selection (unless `keepOpenOnSelect`). Without `open` and `onOpenChange` the menu never closes itself.
   */
  onOpenChange?: (open: boolean) => void;
  /** Stay open (on the current level) after a selection. */
  keepOpenOnSelect?: boolean;
  /** Diameter in px. Default `320`. */
  size?: number;
  /** Radius of the centre as a fraction of the outer radius (0.2–0.7). Default `0.36`. */
  innerRadius?: number;
  /**
   * Where the first item sits, in degrees clockwise from 12 o'clock. Default `0` (first item at the top). E.g.
   * `-90` puts it at 9 o'clock, `180 / items.length` puts a segment edge (instead of a segment centre) at the top.
   */
  startAngle?: number;
  /** Gap between two segments in px (0 = segments touch). Default `4`. */
  gap?: number;
  /** Space between the ring's outer edge and the box edge in px, e.g. room for badges outside the ring. Default `1`. */
  outerPadding?: number;
  /**
   * `"window"` (default): the segment follows the pointer's angle anywhere on the page, like FiveM wheels.
   * `"element"`: only while the pointer is over the menu's box.
   */
  pointerTracking?: "window" | "element";
  /** Focus the menu when it opens (keyboard control right away). */
  autoFocus?: boolean;
  /** Visible texts and the accessible name (English by default). */
  labels?: Partial<RadialMenuLabels>;
  /** Shown in the centre while nothing is highlighted (root level). */
  centerLabel?: ReactNode;
  /**
   * Replaces the icon + label of every segment. The result is rendered inside the segment's `role="menuitem"`
   * element (centred on the segment), so keyboard and screen reader behaviour stay the same.
   */
  renderItem?: (item: RadialMenuItem, state: RadialMenuItemState) => ReactNode;
  /** Replaces the centre content (label, description, back/close hint and `centerLabel`). */
  renderCenter?: (state: RadialMenuCenterState) => ReactNode;
  /** Extra classes per part, merged after the defaults (conflicting Tailwind classes win). `root` = `className`. */
  classNames?: RadialMenuClassNames;
}

// ---------------------------------------------------------------------------------------------------------------------
// Geometry (angles in radians, 0 = 12 o'clock, clockwise)
// ---------------------------------------------------------------------------------------------------------------------

const TAU = Math.PI * 2;
/** Default gap between two segments in px (measured perpendicular, so the edges stay parallel). */
const SEGMENT_GAP = 4;
/** Gap between the ring and the centre circle in px. */
const CENTER_GAP = 4;

/** Radii in the svg's own coordinates (size × size). */
function ringGeometry(size: number, innerRadius: number, outerPadding: number) {
  const c = size / 2;
  const outer = Math.max(16, c - Math.max(0, outerPadding));
  const inner = Math.max(8, outer * Math.min(0.7, Math.max(0.2, innerRadius)));
  const centerRadius = Math.max(4, inner - CENTER_GAP);
  return { c, outer, inner, centerRadius };
}

const toRadians = (degrees: number) => (Number.isFinite(degrees) ? (degrees * Math.PI) / 180 : 0);

/** Highlight colours per tone (full class names, so Tailwind's scanner finds them). */
const toneClasses: Record<RadialMenuTone, { highlight: string; item: string; text: string }> = {
  default: {
    highlight: "fill-pui-primary/tint stroke-pui-primary/tint-border",
    item: "data-[highlighted]:text-pui-primary",
    text: "text-pui-primary",
  },
  primary: {
    highlight: "fill-pui-primary/tint stroke-pui-primary/tint-border",
    item: "data-[highlighted]:text-pui-primary",
    text: "text-pui-primary",
  },
  positive: {
    highlight: "fill-pui-positive/tint stroke-pui-positive/tint-border",
    item: "data-[highlighted]:text-pui-positive",
    text: "text-pui-positive",
  },
  warning: {
    highlight: "fill-pui-warning/tint stroke-pui-warning/tint-border",
    item: "data-[highlighted]:text-pui-warning",
    text: "text-pui-warning",
  },
  // Like Badge/Alert: the tinted "destructive" look uses the lighter negative colour (readable as text).
  destructive: {
    highlight: "fill-pui-negative/tint stroke-pui-negative/tint-border",
    item: "data-[highlighted]:text-pui-negative",
    text: "text-pui-negative",
  },
};

const toneOf = (item: RadialMenuItem): RadialMenuTone => (item.tone && item.tone in toneClasses ? item.tone : "default");

function point(c: number, r: number, a: number) {
  return `${round(c + r * Math.sin(a))} ${round(c - r * Math.cos(a))}`;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

/** Path of an annulus sector between the angles `a0` and `a1` (a full ring when there is only one segment). */
function sectorPath(c: number, inner: number, outer: number, a0: number, a1: number, full: boolean, gap: number) {
  if (full) {
    return [
      `M ${point(c, outer, 0)} A ${outer} ${outer} 0 1 1 ${point(c, outer, Math.PI)} A ${outer} ${outer} 0 1 1 ${point(c, outer, 0)} Z`,
      `M ${point(c, inner, 0)} A ${inner} ${inner} 0 1 0 ${point(c, inner, Math.PI)} A ${inner} ${inner} 0 1 0 ${point(c, inner, 0)} Z`,
    ].join(" ");
  }
  const outerPad = Math.min(gap / 2 / outer, (a1 - a0) / 4);
  const innerPad = Math.min(gap / 2 / inner, (a1 - a0) / 4);
  const o0 = a0 + outerPad;
  const o1 = a1 - outerPad;
  const i0 = a0 + innerPad;
  const i1 = a1 - innerPad;
  const largeOuter = o1 - o0 > Math.PI ? 1 : 0;
  const largeInner = i1 - i0 > Math.PI ? 1 : 0;
  return (
    `M ${point(c, outer, o0)} A ${outer} ${outer} 0 ${largeOuter} 1 ${point(c, outer, o1)} ` +
    `L ${point(c, inner, i1)} A ${inner} ${inner} 0 ${largeInner} 0 ${point(c, inner, i0)} Z`
  );
}

/** Walks `path` down from `root`; stops at the first id that no longer exists. */
function resolvePath(root: RadialMenuItem[], path: string[]) {
  const chain: RadialMenuItem[] = [];
  let items = root;
  for (const id of path) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || !hasSubmenu(item)) break;
    chain.push(item);
    items = item.items!;
  }
  return { chain, items };
}

const hasSubmenu = (item: RadialMenuItem) => Array.isArray(item.items) && item.items.length > 0;

/** Next enabled index from `from` in direction `step` (wraps), or `null` when every item is disabled. */
function nextEnabled(items: RadialMenuItem[], from: number, step: 1 | -1): number | null {
  const count = items.length;
  for (let offset = 0; offset < count; offset += 1) {
    const index = (((from + step * offset) % count) + count) % count;
    if (!items[index].disabled) return index;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------------
// RadialMenu
// ---------------------------------------------------------------------------------------------------------------------

type PointerZone = { zone: "outside" } | { zone: "center" } | { zone: "ring"; index: number };

/**
 * Interaction wheel (like the radial menus of FiveM servers): the items sit in a ring of equal segments, the pointer's
 * angle from the centre picks the segment (also outside the ring), a click selects it or opens its submenu. The centre
 * shows the highlighted item's label and goes back one level (on the root level it closes the menu). Keyboard: arrows
 * move around the ring, Home/End, Enter/Space select, Backspace/Escape go back, Escape on the root level closes.
 */
export const RadialMenu = /* @__PURE__ */ forwardRef<HTMLDivElement, RadialMenuProps>(function RadialMenu(
  {
    items,
    onSelect,
    open: openProp,
    defaultOpen = true,
    onOpenChange,
    keepOpenOnSelect = false,
    size = 320,
    innerRadius = 0.36,
    startAngle = 0,
    gap = SEGMENT_GAP,
    outerPadding = 1,
    pointerTracking = "window",
    autoFocus = false,
    labels: labelOverrides,
    centerLabel,
    renderItem,
    renderCenter,
    classNames,
    className,
    style,
    onKeyDown,
    onClick,
    onPointerMove,
    onPointerLeave,
    ...props
  },
  forwardedRef,
) {
  const BackIcon = useIcon("chevronLeft");
  const CloseIcon = useIcon("close");
  const baseId = useId();
  const labels = useMemo(() => ({ ...defaultRadialMenuLabels, ...labelOverrides }), [labelOverrides]);

  const [openState, setOpenState] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  /** Without `open` and `onOpenChange` nobody could reopen the menu, so it never closes itself. */
  const closable = controlled || onOpenChange !== undefined;

  const [path, setPath] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [centerActive, setCenterActive] = useState(false);
  const [entering, setEntering] = useState(true);

  const { chain, items: levelItems } = resolvePath(items, path);
  const level = chain.length;
  const count = levelItems.length;
  const current = highlighted !== null && highlighted < count ? highlighted : null;
  const currentItem = current !== null ? levelItems[current] : null;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const start = toRadians(startAngle);
  const stateRef = useRef({ count, levelItems, size, innerRadius, outerPadding, start });
  stateRef.current = { count, levelItems, size, innerRadius, outerPadding, start };

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  // Geometry in the svg's own coordinates (size × size).
  const { c, outer, inner, centerRadius } = ringGeometry(size, innerRadius, outerPadding);
  const step = count > 0 ? TAU / count : TAU;
  const segmentGap = Number.isFinite(gap) ? Math.max(0, gap) : SEGMENT_GAP;

  // --- open state ----------------------------------------------------------------------------------------------------

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setOpenState(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  useEffect(() => {
    if (open) return;
    // Reopening starts on the root level again.
    setPath([]);
    setHighlighted(null);
    setCenterActive(false);
    lastPointer.current = null;
  }, [open]);

  // Subtle fade-in on open.
  useEffect(() => {
    if (!open) {
      setEntering(true);
      return;
    }
    const frame = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (open && autoFocus) rootRef.current?.focus({ preventScroll: true });
  }, [open, autoFocus]);

  // --- pointer -------------------------------------------------------------------------------------------------------

  /** Where a pointer at (x, y) is, by distance and angle from the centre of the rendered box. */
  const zoneAt = useCallback((x: number, y: number, segments?: number): PointerZone => {
    const root = rootRef.current;
    const { size: nominal, innerRadius: ratio, outerPadding: padding, start: offset } = stateRef.current;
    const n = segments ?? stateRef.current.count;
    if (!root || n === 0) return { zone: "outside" };
    const rect = root.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { zone: "outside" };
    const scale = rect.width / nominal;
    const dx = x - (rect.left + rect.width / 2);
    const dy = y - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) <= ringGeometry(nominal, ratio, padding).centerRadius * scale) return { zone: "center" };
    // Angle relative to the first item's centre, 0…TAU.
    const angle = (((Math.atan2(dx, -dy) - offset) % TAU) + TAU) % TAU;
    const slice = TAU / n;
    return { zone: "ring", index: Math.floor((angle + slice / 2) / slice) % n };
  }, []);

  const trackPointer = useCallback(
    (x: number, y: number) => {
      lastPointer.current = { x, y };
      const hit = zoneAt(x, y);
      setCenterActive(hit.zone === "center");
      if (hit.zone === "ring") {
        setHighlighted(stateRef.current.levelItems[hit.index]?.disabled ? null : hit.index);
      } else setHighlighted(null);
    },
    [zoneAt],
  );

  useEffect(() => {
    if (!open || pointerTracking !== "window") return;
    const view = rootRef.current?.ownerDocument.defaultView;
    if (!view) return;
    const move = (event: PointerEvent) => trackPointer(event.clientX, event.clientY);
    view.addEventListener("pointermove", move);
    return () => view.removeEventListener("pointermove", move);
  }, [open, pointerTracking, trackPointer]);

  // --- actions -------------------------------------------------------------------------------------------------------

  const activate = useCallback(
    (index: number, via: "pointer" | "keyboard") => {
      const item = levelItems[index];
      if (!item || item.disabled) return;
      if (hasSubmenu(item)) {
        setPath(chain.map((entry) => entry.id).concat(item.id));
        if (via === "keyboard") setHighlighted(nextEnabled(item.items!, 0, 1));
        else {
          // The pointer hasn't moved yet: highlight what is under it in the submenu's layout.
          const last = lastPointer.current;
          const hit = last ? zoneAt(last.x, last.y, item.items!.length) : null;
          setHighlighted(hit?.zone === "ring" && !item.items![hit.index].disabled ? hit.index : null);
        }
        return;
      }
      onSelect?.(item, chain.map((entry) => entry.id).concat(item.id));
      if (closable && !keepOpenOnSelect) setOpen(false);
    },
    [chain, closable, keepOpenOnSelect, levelItems, onSelect, setOpen, zoneAt],
  );

  const back = useCallback(
    (via: "pointer" | "keyboard") => {
      if (level === 0) return false;
      const parentId = path[level - 1];
      const parentItems = level > 1 ? chain[level - 2].items! : items;
      setPath(path.slice(0, level - 1));
      const parentIndex = parentItems.findIndex((item) => item.id === parentId);
      setHighlighted(via === "keyboard" && parentIndex !== -1 ? parentIndex : null);
      return true;
    },
    [chain, items, level, path],
  );

  const handleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const hit = zoneAt(event.clientX, event.clientY);
    if (hit.zone === "center") {
      if (!back("pointer") && closable) setOpen(false);
    } else if (hit.zone === "ring") {
      lastPointer.current = { x: event.clientX, y: event.clientY };
      activate(hit.index, "pointer");
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.target !== event.currentTarget) return;
    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        if (count === 0) return;
        handled();
        setHighlighted(nextEnabled(levelItems, current === null ? 0 : current + 1, 1));
        return;
      case "ArrowLeft":
      case "ArrowUp":
        if (count === 0) return;
        handled();
        setHighlighted(nextEnabled(levelItems, current === null ? count - 1 : current - 1, -1));
        return;
      case "Home":
        if (count === 0) return;
        handled();
        setHighlighted(nextEnabled(levelItems, 0, 1));
        return;
      case "End":
        if (count === 0) return;
        handled();
        setHighlighted(nextEnabled(levelItems, count - 1, -1));
        return;
      case "Enter":
      case " ":
        if (current === null) return;
        handled();
        activate(current, "keyboard");
        return;
      case "Backspace":
        if (back("keyboard")) handled();
        return;
      case "Escape":
        if (back("keyboard")) handled();
        else if (closable) {
          handled();
          setOpen(false);
        }
        return;
      default:
    }
  };

  if (!open) return null;

  // --- render --------------------------------------------------------------------------------------------------------

  const centerAction = level > 0 ? "back" : closable ? "close" : null;
  const itemId = (index: number) => `${baseId}-item-${index}`;
  const descriptionId = (index: number) => `${baseId}-description-${index}`;
  const ringWidth = outer - inner;
  const labelRadius = (outer + inner) / 2;
  const percent = (value: number) => `${(value / size) * 100}%`;
  const currentTone = currentItem ? toneOf(currentItem) : "default";

  // Texts never shrink (a shrunk line-clamped block would be cut mid-line); with a description the label keeps one line.
  const centerText = (text: ReactNode, toned = false, lines: 1 | 2 = 2) => (
    <span
      data-slot="radial-menu-center-label"
      className={cn(
        "shrink-0 break-words",
        lines === 1 ? "line-clamp-1" : "line-clamp-2",
        toned && toneClasses[currentTone].text,
        classNames?.centerLabel,
      )}
    >
      {text}
    </span>
  );
  let centerContent: ReactNode = null;
  if (renderCenter) {
    centerContent = renderCenter({ highlighted: currentItem, level, path: chain, action: centerAction, centerActive });
  } else if (currentItem) {
    centerContent = (
      <>
        {centerText(currentItem.label, currentTone !== "default", currentItem.description ? 1 : 2)}
        {currentItem.description && (
          <span
            data-slot="radial-menu-center-description"
            className={cn(
              "line-clamp-2 shrink-0 break-words text-xs font-normal text-pui-muted-foreground",
              classNames?.centerDescription,
            )}
          >
            {currentItem.description}
          </span>
        )}
      </>
    );
  } else if (centerAction && (centerActive || level > 0)) {
    // Inside a submenu with nothing highlighted, or the pointer rests on the centre: show what a click there does.
    const Icon = centerAction === "back" ? BackIcon : CloseIcon;
    centerContent = (
      <>
        <Icon data-slot="radial-menu-center-icon" className="size-5 shrink-0" aria-hidden="true" />
        {centerText(centerAction === "back" ? labels.back : labels.close)}
      </>
    );
  } else if (centerLabel != null) centerContent = centerText(centerLabel);

  const rootStyle: CSSProperties = { width: size, height: size, ...style };
  const hasDescriptions = levelItems.some((item) => item.description);

  return (
    <div
      ref={setRefs}
      role="menu"
      tabIndex={0}
      aria-label={level > 0 ? `${labels.menu}: ${chain[level - 1].label}` : labels.menu}
      aria-activedescendant={current !== null ? itemId(current) : undefined}
      data-slot="radial-menu"
      data-level={level}
      data-starting-style={entering ? "" : undefined}
      className={cn(
        "relative inline-block shrink-0 select-none touch-none rounded-full text-pui-foreground outline-none",
        "focus-visible:ring-pui focus-visible:ring-pui-ring",
        "transition-opacity duration-pui-base ease-pui motion-reduce:transition-none data-[starting-style]:opacity-0",
        classNames?.root,
        className,
      )}
      style={rootStyle}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (pointerTracking === "element") trackPointer(event.clientX, event.clientY);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        if (pointerTracking === "element") {
          setHighlighted(null);
          setCenterActive(false);
        }
      }}
      {...props}
    >
      <svg
        data-slot="radial-menu-ring"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        focusable="false"
        className={cn("absolute inset-0 size-full overflow-visible", classNames?.ring)}
      >
        {levelItems.map((item, index) => {
          const a0 = start + index * step - step / 2;
          const d = sectorPath(c, inner, outer, a0, a0 + step, count === 1, segmentGap);
          const isHighlighted = index === current;
          const tone = toneOf(item);
          return (
            <g
              key={item.id}
              data-slot="radial-menu-segment"
              data-highlighted={isHighlighted ? "" : undefined}
              data-disabled={item.disabled ? "" : undefined}
              data-tone={tone}
              className="group"
            >
              <path
                data-slot="radial-menu-segment-shape"
                d={d}
                fillRule="evenodd"
                strokeWidth={1}
                className={cn("fill-pui-card stroke-pui-border", classNames?.segment)}
              />
              <path
                data-slot="radial-menu-segment-highlight"
                d={d}
                fillRule="evenodd"
                strokeWidth={1}
                className={cn(
                  toneClasses[tone].highlight,
                  "opacity-0 transition-opacity duration-pui-fast ease-pui group-data-[highlighted]:opacity-100",
                  classNames?.segmentHighlight,
                )}
              />
            </g>
          );
        })}
        <circle
          data-slot="radial-menu-center"
          data-action={centerAction ?? undefined}
          data-active={centerActive && centerAction ? "" : undefined}
          cx={c}
          cy={c}
          r={centerRadius}
          strokeWidth={1}
          className={cn(
            "fill-pui-card stroke-pui-border transition-[fill] duration-pui-fast ease-pui data-[active]:fill-pui-accent",
            classNames?.center,
          )}
        />
      </svg>

      {levelItems.map((item, index) => {
        const angle = start + index * step;
        const x = c + labelRadius * Math.sin(angle);
        const y = c - labelRadius * Math.cos(angle);
        const isHighlighted = index === current;
        const disabled = item.disabled === true;
        const submenu = hasSubmenu(item);
        const tone = toneOf(item);
        return (
          <div
            key={item.id}
            id={itemId(index)}
            role="menuitem"
            aria-disabled={disabled ? true : undefined}
            aria-haspopup={submenu ? "menu" : undefined}
            aria-describedby={item.description ? descriptionId(index) : undefined}
            data-slot="radial-menu-item"
            data-highlighted={isHighlighted ? "" : undefined}
            data-disabled={disabled ? "" : undefined}
            data-tone={tone}
            className={cn(
              "pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 text-center",
              "text-pui-muted-foreground transition-colors duration-pui-fast ease-pui",
              toneClasses[tone].item,
              "data-[disabled]:opacity-50",
              classNames?.item,
              item.className,
            )}
            style={{ left: percent(x), top: percent(y), width: percent(ringWidth * 0.9) }}
          >
            {renderItem ? (
              renderItem(item, { highlighted: isHighlighted, disabled, level, index, count, hasSubmenu: submenu })
            ) : (
              <>
                {item.icon != null && (
                  <span
                    data-slot="radial-menu-icon"
                    className={cn("flex items-center justify-center [&_svg]:size-5", classNames?.icon)}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                )}
                <span
                  data-slot="radial-menu-label"
                  className={cn(
                    "line-clamp-2 max-w-full break-words text-xs font-medium leading-tight",
                    isHighlighted ? toneClasses[tone].text : "text-pui-foreground",
                    classNames?.label,
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </div>
        );
      })}

      {hasDescriptions && (
        // Texts for aria-describedby (the visible centre is aria-hidden).
        <div hidden>
          {levelItems.map((item, index) =>
            item.description ? (
              <span key={item.id} id={descriptionId(index)}>
                {item.description}
              </span>
            ) : null,
          )}
        </div>
      )}

      <div
        aria-hidden="true"
        data-slot="radial-menu-center-content"
        className={cn(
          // The square inscribed in the centre circle (side = r·√2): content never reaches past the circle's edge.
          "pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 overflow-hidden text-center",
          "text-sm font-medium leading-tight",
          currentItem || centerActive ? "text-pui-foreground" : "text-pui-muted-foreground",
          classNames?.centerContent,
        )}
        style={{ width: percent(centerRadius * Math.SQRT2), height: percent(centerRadius * Math.SQRT2) }}
      >
        {centerContent}
      </div>
    </div>
  );
});
