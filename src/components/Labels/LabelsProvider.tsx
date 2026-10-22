import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * The texts of preUI's built-in controls (close buttons, steppers, page buttons …), by meaning rather than by
 * component: one `close` serves Dialog, Sheet, Drawer and Toast. English defaults in `defaultPreuiLabels`.
 */
export interface PreuiLabels {
  /** Close X of Dialog, Sheet, Drawer and toasts. */
  close: string;
  /** Confirming and cancel button of `ConfirmDialog`. */
  confirm: string;
  cancel: string;
  /** Combobox / Autocomplete: the trigger, the clear button, a chip's remove button. */
  open: string;
  clear: string;
  remove: string;
  /** NumberField steppers. */
  decrease: string;
  increase: string;
  /** Pagination: the landmark, the text buttons, their accessible names and the ellipsis. */
  pagination: string;
  previous: string;
  next: string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
  morePages: string;
  /** DataTable: footer texts, column header menu and the column chooser. */
  rowsPerPage: string;
  pageOf: (page: number, pageCount: number) => string;
  selectedRows: (selected: number, total: number) => string;
  sortAscending: string;
  sortDescending: string;
  clearSort: string;
  hideColumn: string;
  columns: string;
  toggleColumns: string;
  /** Breadcrumb landmark and its ellipsis. */
  breadcrumb: string;
  more: string;
  /** Carousel buttons. */
  previousSlide: string;
  nextSlide: string;
  /** CodeBlock copy button. */
  copyCode: string;
  copied: string;
  /** SidebarTrigger / SidebarRail, ThemeToggle, Spinner. */
  toggleSidebar: string;
  toggleColorScheme: string;
  loading: string;
}

export const defaultPreuiLabels: PreuiLabels = {
  close: "Close",
  confirm: "Confirm",
  cancel: "Cancel",
  open: "Open",
  clear: "Clear",
  remove: "Remove",
  decrease: "Decrease",
  increase: "Increase",
  pagination: "Pagination",
  previous: "Previous",
  next: "Next",
  firstPage: "Go to first page",
  previousPage: "Go to previous page",
  nextPage: "Go to next page",
  lastPage: "Go to last page",
  morePages: "More pages",
  rowsPerPage: "Rows per page",
  pageOf: (page, pageCount) => `Page ${page} of ${pageCount}`,
  selectedRows: (selected, total) => `${selected} of ${total} row(s) selected.`,
  sortAscending: "Asc",
  sortDescending: "Desc",
  clearSort: "Clear sort",
  hideColumn: "Hide",
  columns: "Columns",
  toggleColumns: "Toggle columns",
  breadcrumb: "Breadcrumb",
  more: "More",
  previousSlide: "Previous slide",
  nextSlide: "Next slide",
  copyCode: "Copy code",
  copied: "Copied",
  toggleSidebar: "Toggle Sidebar",
  toggleColorScheme: "Toggle color scheme",
  loading: "Loading",
};

const LabelsContext = /* @__PURE__ */ createContext<PreuiLabels>(defaultPreuiLabels);

export interface LabelsProviderProps {
  /** The texts to change; the rest comes from an outer `LabelsProvider`, else the English defaults. */
  labels: Partial<PreuiLabels>;
  children?: ReactNode;
}

/**
 * Sets the texts of every built-in control once, at the app root — e.g. German or French for a whole NUI:
 *
 * ```tsx
 * <LabelsProvider labels={{ close: "Schließen", decrease: "Weniger", increase: "Mehr", cancel: "Abbrechen" }}>
 *   <App />
 * </LabelsProvider>
 * ```
 *
 * A prop on the component still wins (`<DialogContent closeLabel="Fertig">`). Providers nest: an inner one changes only
 * the keys it sets.
 */
export function LabelsProvider({ labels, children }: LabelsProviderProps) {
  const parent = useContext(LabelsContext);
  const value = useMemo(() => ({ ...parent, ...labels }), [parent, labels]);
  return <LabelsContext.Provider value={value}>{children}</LabelsContext.Provider>;
}

/** The current built-in control texts (`LabelsProvider`, else the English defaults). */
export function usePreuiLabels(): PreuiLabels {
  return useContext(LabelsContext);
}
