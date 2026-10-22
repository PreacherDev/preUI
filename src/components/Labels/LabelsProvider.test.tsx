import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "../Dialog";
import { ConfirmDialog } from "../EditorWindow";
import { NumberField } from "../NumberField";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "../Pagination";
import { Spinner } from "../Spinner";
import { defaultPreuiLabels, LabelsProvider, usePreuiLabels } from "./LabelsProvider";

const german = {
  close: "Schließen",
  decrease: "Weniger",
  increase: "Mehr",
  confirm: "Bestätigen",
  cancel: "Abbrechen",
  pagination: "Seiten",
  previous: "Zurück",
  previousPage: "Vorherige Seite",
  next: "Weiter",
  nextPage: "Nächste Seite",
  loading: "Lädt",
};

describe("LabelsProvider", () => {
  it("sets the texts of built-in controls in one place", async () => {
    render(
      <LabelsProvider labels={german}>
        <NumberField defaultValue={1} inputProps={{ "aria-label": "Menge" }} stepperTooltip={false} />
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <Spinner />
      </LabelsProvider>,
    );
    expect(screen.getByRole("button", { name: "Weniger" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mehr" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Seiten" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Vorherige Seite" })).toHaveTextContent("Zurück");
    expect(screen.getByRole("link", { name: "Nächste Seite" })).toHaveTextContent("Weiter");
    expect(screen.getByRole("status", { name: "Lädt" })).toBeInTheDocument();
  });

  it("names the close X of dialogs", async () => {
    render(
      <LabelsProvider labels={german}>
        <Dialog defaultOpen>
          <DialogContent closeTooltip={false}>
            <DialogTitle>Konto</DialogTitle>
          </DialogContent>
        </Dialog>
      </LabelsProvider>,
    );
    expect(await screen.findByRole("button", { name: "Schließen" })).toHaveAttribute("data-slot", "dialog-close");
  });

  it("a prop on the component wins, and an inner provider changes only its own keys", async () => {
    render(
      <LabelsProvider labels={german}>
        <LabelsProvider labels={{ confirm: "Löschen" }}>
          <ConfirmDialog defaultOpen title="Löschen?" cancelLabel="Lieber nicht" />
        </LabelsProvider>
      </LabelsProvider>,
    );
    expect(await screen.findByRole("button", { name: "Löschen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lieber nicht" })).toBeInTheDocument();
  });

  it("falls back to English without a provider", () => {
    function Probe() {
      const labels = usePreuiLabels();
      return <span>{`${labels.close} / ${labels.pageOf(2, 5)}`}</span>;
    }
    render(<Probe />);
    expect(screen.getByText("Close / Page 2 of 5")).toBeInTheDocument();
    expect(defaultPreuiLabels.selectedRows(1, 3)).toBe("1 of 3 row(s) selected.");
  });
});
