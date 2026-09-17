import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import type { SeasonDialogState } from '../useBackofficeSeasonsViewModel'
import { useSeasonFormDialogViewModel } from '../useSeasonFormDialogViewModel'

interface SeasonFormDialogProps {
  dialog: SeasonDialogState
  onClose: () => void
}

// specs/web-seasons.md UI design — modeled on NewsFormDialog.tsx (§7 of the
// spec: "s'en inspirer plutôt que d'inventer une seconde convention de
// dialogue dans le même backoffice", the mockup has no dialog reference at
// all). One component, remounted (via `key` below) rather than reset by a
// useEffect, whenever the target row or mode changes. Renders nothing while
// closed: AC-WS-29's focus-trap/Escape-close behavior comes from Radix
// Dialog for free, only while it's actually in the tree.
export function SeasonFormDialog({ dialog, onClose }: SeasonFormDialogProps) {
  if (!dialog) return null

  return (
    <SeasonFormDialogContent
      key={dialog.mode === 'edit' ? dialog.season.id : 'create'}
      dialog={dialog}
      onClose={onClose}
    />
  )
}

const DIALOG_TITLE = {
  create: 'Créer une saison',
  edit: 'Modifier la saison',
} as const

const SUBMIT_LABEL = {
  create: 'Créer',
  edit: 'Enregistrer',
} as const

const SUBMITTING_LABEL = {
  create: 'Création…',
  edit: 'Enregistrement…',
} as const

function SeasonFormDialogContent({ dialog, onClose }: SeasonFormDialogProps & { dialog: NonNullable<SeasonDialogState> }) {
  const season = dialog.mode === 'edit' ? dialog.season : null
  const vm = useSeasonFormDialogViewModel({
    mode: dialog.mode,
    season,
    onSuccess: onClose,
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLE[dialog.mode]}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            vm.submit()
          }}
        >
          {/* AC-WS-16/AC-WS-23 — the dialog's most frequent failure is an
              overlap (already existing, already tested inline message); it
              renders here, on top of the fields, without closing the dialog
              or clearing what was typed. The domain-level start/end/label
              rejection (AC-WS-10) surfaces through the exact same slot. */}
          {vm.errorMessage && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{vm.errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="season-label" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Libellé
            </Label>
            <Input
              id="season-label"
              placeholder="Ex. 2026-2027"
              required
              disabled={vm.isSubmitting}
              value={vm.values.label}
              onChange={(event) => vm.setLabel(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {/* Début/Fin side by side — the same adjacent pair as the list's
              own DÉBUT/FIN columns (spec UI design). CLAUDE.md §6/spec §7:
              min-w-0 on BOTH grid items is mandatory for a native
              <input type="date"> pair on one row — its segmented value has
              an intrinsic width floor that overlaps its sibling without it,
              even on a desktop dialog at a narrow width. h-11 touch targets
              on both, same reasoning as NewsFormDialog's own date fields. */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="season-start-date" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Début
              </Label>
              <Input
                id="season-start-date"
                type="date"
                required
                disabled={vm.isSubmitting}
                value={vm.values.startDate}
                onChange={(event) => vm.setStartDate(event.target.value)}
                className="h-11 min-w-0 rounded-xl"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="season-end-date" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Fin
              </Label>
              <Input
                id="season-end-date"
                type="date"
                required
                disabled={vm.isSubmitting}
                value={vm.values.endDate}
                onChange={(event) => vm.setEndDate(event.target.value)}
                className="h-11 min-w-0 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={vm.isSubmitting}
              onClick={onClose}
              className="h-11 rounded-full"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!vm.canSubmit}
              className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
            >
              {vm.isSubmitting ? SUBMITTING_LABEL[dialog.mode] : SUBMIT_LABEL[dialog.mode]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
