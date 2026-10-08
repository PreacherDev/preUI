import { createContext, useContext, type ReactNode, type RefObject } from "react";

/** What a Base UI Portal accepts as `container`. `null` makes the portal wait until the element exists. */
export type PortalContainer = HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;

const PortalContainerContext = /* @__PURE__ */ createContext<PortalContainer | undefined>(undefined);

export interface PortalContainerProviderProps {
  /**
   * Element the popups below render into instead of `document.body` (`Select`, menus, `Popover`, `Tooltip`,
   * `HoverCard`, `Dialog`, `Sheet`, `Drawer`, `Toaster` …). Pass the element itself (e.g. from a callback ref kept in
   * state) rather than a ref object: Base UI reads a ref only once. `null` = not mounted yet; the popups wait for it.
   * `undefined` = no default (Base UI's: the parent popup's portal, else `document.body`).
   */
  container: PortalContainer | undefined;
  children?: ReactNode;
}

/**
 * Sets the default portal `container` of every preUI popup below it — e.g. a scoped theme root
 * (`<div data-scheme="light" style={tokens}>`), so menus, selects and dialogs opened inside it render inside it
 * and pick up its tokens instead of the page's. An explicit `container` prop on a `…Content` still wins.
 * Popups nested in another popup keep following their parent (Base UI's default).
 *
 * Modals (`DialogContent`, `SheetContent` …) stay positioned against the viewport; use their `container` prop for
 * modals that should be contained in a frame. Give the container element no `transform`/`filter` (it would become
 * the containing block of `fixed` popups) and keep it outside `overflow` clipping, or popups get cut off.
 */
export function PortalContainerProvider({ container, children }: PortalContainerProviderProps) {
  return <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>;
}

/**
 * The portal container for a `…Content` component: the explicit prop when given (also `null`), else the one from
 * the nearest `PortalContainerProvider`, else `undefined` (Base UI default).
 * @internal
 */
export function usePortalContainer(container: PortalContainer | undefined): PortalContainer | undefined {
  const fromProvider = useContext(PortalContainerContext);
  return container !== undefined ? container : fromProvider;
}

/**
 * Wraps the content of a preUI portal: popups opened from inside it ignore the provider's container again and
 * follow Base UI's default (the parent popup's portal), so nested popups stay inside their parent's portal —
 * Base UI treats them as part of the parent there (focus trap, outside clicks, `aria-hidden` of modals).
 * @internal
 */
export function PortalContainerScope({ children }: { children?: ReactNode }) {
  return <PortalContainerContext.Provider value={undefined}>{children}</PortalContainerContext.Provider>;
}
