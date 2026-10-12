import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NuiDragArea, type NuiDragAreaProps } from ".";

/** Pretends to run inside FiveM's CEF. */
function enterGame(resource = "my_resource") {
  Object.assign(window, { invokeNative: () => {}, GetParentResourceName: () => resource });
}

function mockFetch() {
  const fetchMock = vi.fn(async () => new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const sent = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.map((call) => {
    const [url, init] = call as unknown as [string, RequestInit];
    return { url, body: JSON.parse(String(init.body)) };
  });

function renderArea(props: NuiDragAreaProps = {}) {
  render(<NuiDragArea data-testid="area" {...props} />);
  const area = screen.getByTestId("area");
  // jsdom has no pointer capture
  area.setPointerCapture = vi.fn();
  return area;
}

const nextFrame = () => act(() => vi.advanceTimersToNextFrame());

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  delete (window as Partial<Window>).invokeNative;
  delete (window as Partial<Window>).GetParentResourceName;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("NuiDragArea", () => {
  it("fills its parent without a look of its own and shows the grab cursor", () => {
    const area = renderArea({ className: "z-0", style: { position: "fixed" } });
    expect(area).toHaveAttribute("data-slot", "nui-drag-area");
    expect(area).toHaveClass("z-0");
    expect(area.style.position).toBe("fixed"); // the caller's style wins
    expect(area.style.cursor).toBe("grab");
    expect(area.style.touchAction).toBe("none");
    expect(area).toBeEmptyDOMElement();
  });

  it("sends the summed movement once per frame, with the same signs as the old CameraArea", async () => {
    enterGame();
    const fetchMock = mockFetch();
    const area = renderArea();

    fireEvent.pointerDown(area, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(area.setPointerCapture).toHaveBeenCalledWith(1);
    expect(area).toHaveAttribute("data-dragging");
    expect(area.style.cursor).toBe("grabbing");

    fireEvent.pointerMove(area, { clientX: 110, clientY: 104 });
    fireEvent.pointerMove(area, { clientX: 120, clientY: 108 });
    fireEvent.wheel(area, { deltaY: 100 });
    expect(fetchMock).not.toHaveBeenCalled();

    await nextFrame();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [call] = sent(fetchMock);
    expect(call.url).toBe("https://my_resource/camera");
    expect(call.body.yaw).toBeCloseTo(-20 * 0.008);
    expect(call.body.pitch).toBeCloseTo(8 * 0.004);
    expect(call.body.zoom).toBeCloseTo(100 * 0.0015);

    // Nothing pending: no empty message next frame
    await nextFrame();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("only moves while dragging; release, cancel and lost capture end the drag", async () => {
    enterGame();
    const fetchMock = mockFetch();
    const area = renderArea();

    fireEvent.pointerMove(area, { clientX: 50, clientY: 50 });
    await nextFrame();
    expect(fetchMock).not.toHaveBeenCalled();

    for (const end of ["pointerUp", "pointerCancel", "lostPointerCapture"] as const) {
      fireEvent.pointerDown(area, { clientX: 0, clientY: 0, pointerId: 1 });
      fireEvent[end](area, { pointerId: 1 });
      expect(area).not.toHaveAttribute("data-dragging");
      fireEvent.pointerMove(area, { clientX: 30, clientY: 30 });
      await nextFrame();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the given speeds and event, and calls onMove", async () => {
    enterGame("garage");
    const fetchMock = mockFetch();
    const onMove = vi.fn();
    const area = renderArea({ event: "orbit", turnSpeed: 0.01, tiltSpeed: 0.02, zoomSpeed: 0.5, onMove });

    fireEvent.pointerDown(area, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(area, { clientX: -10, clientY: -5 });
    fireEvent.wheel(area, { deltaY: -2 });
    await nextFrame();

    expect(onMove).toHaveBeenCalledTimes(1);
    const move = onMove.mock.calls[0][0];
    expect(move.yaw).toBeCloseTo(0.1);
    expect(move.pitch).toBeCloseTo(-0.1);
    expect(move.zoom).toBeCloseTo(-1);
    expect(sent(fetchMock)[0].url).toBe("https://garage/orbit");
  });

  it("sends nothing in a browser or with event={false}, but still calls onMove", async () => {
    const fetchMock = mockFetch();
    const onMove = vi.fn();
    const area = renderArea({ onMove });
    fireEvent.wheel(area, { deltaY: 10 });
    await nextFrame();
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("event={false} sends nothing inside the game", async () => {
    enterGame();
    const fetchMock = mockFetch();
    const area = renderArea({ event: false });
    fireEvent.wheel(area, { deltaY: 10 });
    await nextFrame();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disabled ignores drag and wheel and has no grab cursor", async () => {
    enterGame();
    const fetchMock = mockFetch();
    const area = renderArea({ disabled: true });
    expect(area).toHaveAttribute("data-disabled");
    expect(area.style.cursor).toBe("");
    fireEvent.pointerDown(area, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(area, { clientX: 40, clientY: 0 });
    fireEvent.wheel(area, { deltaY: 10 });
    await nextFrame();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops a pending movement on unmount", async () => {
    enterGame();
    const fetchMock = mockFetch();
    const { unmount } = render(<NuiDragArea data-testid="area" />);
    fireEvent.wheel(screen.getByTestId("area"), { deltaY: 10 });
    unmount();
    await nextFrame();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a failing callback doesn't throw", async () => {
    enterGame();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    const area = renderArea();
    fireEvent.wheel(area, { deltaY: 10 });
    await nextFrame();
    await act(async () => {});
  });
});
