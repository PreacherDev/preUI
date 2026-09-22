import { act, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";

/** Installs a `window.matchMedia` mock whose queries all report `matches`. */
export function mockMatchMedia(matches: boolean | ((query: string) => boolean)): (query: string) => unknown {
  const fn = vi.fn((query: string) => ({
    matches: typeof matches === "function" ? matches(query) : matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: fn });
  return fn;
}

export interface SsrResult {
  html: string;
  container: HTMLElement;
  root: Root;
  /** console.error calls and recoverable (hydration) errors collected during server render + hydration. */
  errors: unknown[];
  unmount: () => void;
}

/**
 * Renders `ui` with `renderToString` while `window.matchMedia` throws (so any media query read during the
 * server render fails the test), then installs `clientMatchMedia` and hydrates the markup with `hydrateRoot`.
 * Collects console errors and recoverable errors (hydration mismatches) in `errors`.
 */
export async function renderToStringAndHydrate(
  ui: ReactElement,
  { clientMatchMedia = false }: { clientMatchMedia?: boolean | ((query: string) => boolean) } = {},
): Promise<SsrResult> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const errors: unknown[] = [];
  const consoleError = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
  const serverMatchMedia = vi.fn(() => {
    throw new Error("matchMedia must not be called during the server render");
  });
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: serverMatchMedia });

  let html: string;
  try {
    html = renderToString(ui);
  } finally {
    mockMatchMedia(clientMatchMedia);
  }
  expect(serverMatchMedia).not.toHaveBeenCalled();

  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  let root!: Root;
  await act(async () => {
    root = hydrateRoot(container, ui, {
      onRecoverableError: (error) => errors.push(error),
    });
  });
  // Let effects and post-hydration re-renders settle.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return {
    html,
    container,
    root,
    errors,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
      consoleError.mockRestore();
    },
  };
}
