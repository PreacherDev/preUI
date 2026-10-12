import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes } from "react";
import { fetchNui } from "./nui";

/** One batched movement, as `NuiDragArea` sends it to Lua. All three are deltas since the last message. */
export interface NuiDragMove {
  /** Turn in radians: dragging to the right gives a negative value. */
  yaw: number;
  /** Tilt in radians: dragging down gives a positive value. */
  pitch: number;
  /** Zoom: the wheel turned towards the user (down) gives a positive value. */
  zoom: number;
}

type HandledEvents =
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
  | "onLostPointerCapture"
  | "onWheel";

export interface NuiDragAreaProps extends Omit<HTMLAttributes<HTMLDivElement>, HandledEvents> {
  /**
   * NUI callback that gets every movement as `{ yaw, pitch, zoom }` (at most once per frame). `false` sends nothing,
   * e.g. when `onMove` handles it. In a browser (`isEnvBrowser()`) nothing is sent, like `fetchNui`. @default "camera"
   */
  event?: string | false;
  /** Radians of `yaw` per pixel dragged sideways. @default 0.008 */
  turnSpeed?: number;
  /** Radians of `pitch` per pixel dragged up or down. @default 0.004 */
  tiltSpeed?: number;
  /** `zoom` per pixel of wheel movement (`deltaY`). @default 0.0015 */
  zoomSpeed?: number;
  /** Called with every batched movement, also in a browser. */
  onMove?: (move: NuiDragMove) => void;
  /** Ignores dragging and the wheel (a drag in progress ends). */
  disabled?: boolean;
}

const EMPTY: NuiDragMove = { yaw: 0, pitch: 0, zoom: 0 };

/**
 * A surface without a look of its own that turns a game camera: dragging sends `yaw` / `pitch`, the wheel `zoom`,
 * summed up and posted to the `event` NUI callback at most once per animation frame. The pointer is captured while
 * dragging, so the drag goes on outside the area. Fills its nearest positioned parent (`position: absolute; inset:
 * 0`; without one, the page) and shows the grab cursor. Put it behind your panels:
 *
 * ```tsx
 * <NuiDragArea event="camera" />
 * <ShopPanel className="relative" />
 * ```
 *
 * ```lua
 * RegisterNUICallback('camera', function(data, cb)
 *   exports.pre_lib:moveVehicleCamera(data.yaw, data.pitch, data.zoom)
 *   cb({})
 * end)
 * ```
 */
export function NuiDragArea({
  event = "camera",
  turnSpeed = 0.008,
  tiltSpeed = 0.004,
  zoomSpeed = 0.0015,
  onMove,
  disabled = false,
  style,
  ...props
}: NuiDragAreaProps) {
  // The ref drives the handlers, the state only the cursor and `data-dragging`.
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const pending = useRef<NuiDragMove>({ ...EMPTY });
  const frame = useRef<number | null>(null);

  // Latest props for the frame callback, which may run after a re-render.
  const target = useRef({ event, onMove });
  target.current = { event, onMove };

  function flush() {
    frame.current = null;
    const move = pending.current;
    pending.current = { ...EMPTY };
    if (move.yaw === 0 && move.pitch === 0 && move.zoom === 0) return;
    target.current.onMove?.(move);
    if (target.current.event) void fetchNui(target.current.event, move, {}).catch(() => {});
  }

  function queue(yaw: number, pitch: number, zoom: number) {
    pending.current.yaw += yaw;
    pending.current.pitch += pitch;
    pending.current.zoom += zoom;
    if (frame.current === null) frame.current = window.requestAnimationFrame(flush);
  }

  // Nothing is sent after unmount.
  useEffect(
    () => () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      frame.current = null;
    },
    [],
  );

  function setDrag(next: boolean) {
    draggingRef.current = next;
    setDragging(next);
  }

  useEffect(() => {
    if (disabled) setDrag(false);
  }, [disabled]);

  const areaStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    cursor: disabled ? undefined : dragging ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: "none",
    ...style,
  };

  return (
    <div
      data-slot="nui-drag-area"
      data-dragging={dragging ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...props}
      style={areaStyle}
      onPointerDown={(e) => {
        if (disabled) return;
        last.current = { x: e.clientX, y: e.clientY };
        setDrag(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // The pointer is already gone (released before the handler ran).
        }
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current || disabled) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        if (dx !== 0 || dy !== 0) queue(-dx * turnSpeed, dy * tiltSpeed, 0);
      }}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
      onLostPointerCapture={() => setDrag(false)}
      onWheel={(e) => {
        if (disabled || e.deltaY === 0) return;
        queue(0, 0, e.deltaY * zoomSpeed);
      }}
    />
  );
}
