import type { SectionType } from '@domain/entities/section'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { SECTION_TYPE_OPTIONS } from '../section-type-options'
import type { SectionDialogState } from '../useBackofficeSectionsViewModel'
import { useSectionFormDialogViewModel } from '../useSectionFormDialogViewModel'

interface SectionFormDialogProps {
  dialog: SectionDialogState
  onClose: () => void
}

// specs/section-and-teams.md UI design, "Composants formulaire — patron
// réutilisable tel quel" — modeled on SeasonFormDialog.tsx. One component,
// remounted (via `key` below) rather than reset by a useEffect, whenever
// the target row or mode changes.
export function SectionFormDialog({ dialog, onClose }: SectionFormDialogProps) {
  if (!dialog) return null

  return (
    <SectionFormDialogContent
      key={dialog.mode === 'edit' ? dialog.section.id : 'create'}
      dialog={dialog}
      onClose={onClose}
    />
  )
}

const DIALOG_TITLE = {
  create: 'Créer une section',
  edit: 'Modifier la section',
} as const

const SUBMIT_LABEL = {
  create: 'Créer',
  edit: 'Enregistrer',
} as const

const SUBMITTING_LABEL = {
  create: 'Création…',
  edit: 'Enregistrement…',
} as const

function SectionFormDialogContent({ dialog, onClose }: SectionFormDialogProps & { dialog: NonNullable<SectionDialogState> }) {
  const section = dialog.mode === 'edit' ? dialog.section : null
  const vm = useSectionFormDialogViewModel({
    mode: dialog.mode,
    section,
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
          {vm.errorMessage && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{vm.errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="section-name" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Nom
            </Label>
            <Input
              id="section-name"
              placeholder="Ex. Senior masculin"
              required
              disabled={vm.isSubmitting}
              value={vm.values.name}
              onChange={(event) => vm.setName(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="section-type" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Type (sport)
            </Label>
            <Select
              value={vm.values.type}
              onValueChange={(value) => vm.setType(value as SectionType)}
              disabled={vm.isSubmitting}
            >
              <SelectTrigger id="section-type" className="h-11 rounded-xl">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {SECTION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
