import { createContext, useContext, useMemo, type ReactNode } from "react";
import { defaultIcons } from "./defaults";
import type { IconName, IconSet } from "./types";

const IconContext = /* @__PURE__ */ createContext<IconSet>(defaultIcons);

export interface IconProviderProps {
  /** Icons to override. Anything not provided falls back to the built-in set. */
  icons: Partial<IconSet>;
  children: ReactNode;
}

export function IconProvider({ icons, children }: IconProviderProps) {
  const parent = useContext(IconContext);
  const value = useMemo(() => ({ ...parent, ...icons }), [parent, icons]);
  return <IconContext.Provider value={value}>{children}</IconContext.Provider>;
}

/** Returns the icon component currently registered for `name`. */
export function useIcon(name: IconName) {
  return useContext(IconContext)[name];
}
