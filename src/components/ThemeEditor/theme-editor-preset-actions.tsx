// Rename / delete for the presets a user saved (`ThemePreset.removable`): the menu on a preset tile and the two
// dialogs it opens. Kept apart from ThemeEditor.tsx so that file stays readable.
import { useEffect, useId, useState } from "react";
import { useIcon } from "../../icons";
import type { ThemePreset } from "../../theming/theme-config";
import { cn } from "../../utils/cn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../AlertDialog/AlertDialog";
import { Button } from "../Button/Button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../Dialog/Dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../DropdownMenu/DropdownMenu";
import { Input } from "../Input/Input";
import type { ThemeEditorLabels } from "./ThemeEditor";

/** What the user is about to do with a saved preset. */
export type PendingPresetAction = { kind: "rename" | "delete"; preset: ThemePreset } | null;

/**
 * The "…" button of a saved preset tile. Absolutely positioned over the space its tile reserves at the end of the
 * label row, so tiles with and without it are laid out the same and opening it moves nothing.
 */
export function PresetActionsMenu({
  preset,
  labels,
  canRename,
  canDelete,
  onAction,
}: {
  preset: ThemePreset;
  labels: ThemeEditorLabels;
  canRename: boolean;
  canDelete: boolean;
  onAction: (action: NonNullable<PendingPresetAction>) => void;
}) {
  const More = useIcon("more");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-slot="theme-editor-preset-actions"
        aria-label={labels.presetActions(preset.label)}
        className={cn(
          "absolute bottom-1 right-2 inline-flex size-5 items-center justify-center rounded-pui-xs text-pui-muted-foreground outline-none",
          "transition-colors duration-pui-fast ease-pui hover:bg-pui-accent hover:text-pui-accent-foreground",
          "focus-visible:ring-pui focus-visible:ring-pui-ring data-[popup-open]:bg-pui-accent data-[popup-open]:text-pui-accent-foreground",
        )}
      >
        <More className="size-3.5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {canRename && (
          <DropdownMenuItem data-action="rename" onClick={() => onAction({ kind: "rename", preset })}>
            {labels.renamePreset}
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem data-action="delete" variant="destructive" onClick={() => onAction({ kind: "delete", preset })}>
            {labels.deletePreset}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The confirmation (delete) and the name dialog (rename) of a saved preset. */
export function PresetActionDialogs({
  pending,
  labels,
  onClose,
  onDelete,
  onRename,
}: {
  pending: PendingPresetAction;
  labels: ThemeEditorLabels;
  onClose: () => void;
  onDelete?: (preset: ThemePreset) => void;
  onRename?: (preset: ThemePreset, label: string) => void;
}) {
  // The last preset stays shown while a dialog animates out.
  const [shown, setShown] = useState(pending);
  useEffect(() => {
    if (pending) setShown(pending);
  }, [pending]);
  const [name, setName] = useState("");
  useEffect(() => {
    if (pending?.kind === "rename") setName(pending.preset.label);
  }, [pending]);
  const nameId = useId();
  const preset = shown?.preset;
  const trimmed = name.trim();

  return (
    <>
      <AlertDialog open={pending?.kind === "delete"} onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent data-slot="theme-editor-delete-preset">
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.deletePresetTitle(preset?.label ?? "")}</AlertDialogTitle>
            <AlertDialogDescription>{labels.deletePresetText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pending?.kind === "delete") onDelete?.(pending.preset);
              }}
            >
              {labels.deletePresetConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={pending?.kind === "rename"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent data-slot="theme-editor-rename-preset" className="max-w-sm">
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending?.kind !== "rename" || !trimmed) return;
              if (trimmed !== pending.preset.label) onRename?.(pending.preset, trimmed);
              onClose();
            }}
          >
            <DialogHeader>
              <DialogTitle>{labels.renamePresetTitle}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className="text-xs font-medium text-pui-muted-foreground">
                {labels.presetName}
              </label>
              <Input
                id={nameId}
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                autoComplete="off"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                {labels.cancel}
              </Button>
              <Button type="submit" variant="solid" disabled={!trimmed}>
                {labels.renamePresetConfirm}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
