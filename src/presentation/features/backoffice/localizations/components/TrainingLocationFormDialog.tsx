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
import type { TrainingLocationDialogState } from '../useBackofficeLocalizationsViewModel'
import { useTrainingLocationFormDialogViewModel } from '../useTrainingLocationFormDialogViewModel'

interface TrainingLocationFormDialogProps {
  dialog: TrainingLocationDialogState
  onClose: () => void
}

// specs/web-localizations.md UI design — one component, two modes, same
// pattern as SeasonFormDialog: remounted via `key` whenever the target row
// or mode changes, renders nothing while closed (Radix Dialog gives the
// focus trap and Escape-to-close for free while it is in the tree).
export function TrainingLocationFormDialog({ dialog, onClose }: TrainingLocationFormDialogProps) {
  if (!dialog) return null

  return (
    <TrainingLocationFormDialogContent
      key={dialog.mode === 'edit' ? dialog.trainingLocation.id : 'create'}
      dialog={dialog}
      onClose={onClose}
    />
  )
}

const DIALOG_TITLE = {
  create: 'Ajouter un lieu',
  edit: 'Modifier le lieu',
} as const

const SUBMIT_LABEL = {
  create: 'Ajouter',
  edit: 'Enregistrer',
} as const

const SUBMITTING_LABEL = {
  create: 'Ajout…',
  edit: 'Enregistrement…',
} as const

const LABEL_CLASSNAME = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase'

function TrainingLocationFormDialogContent({
  dialog,
  onClose,
}: TrainingLocationFormDialogProps & { dialog: NonNullable<TrainingLocationDialogState> }) {
  const trainingLocation = dialog.mode === 'edit' ? dialog.trainingLocation : null
  const vm = useTrainingLocationFormDialogViewModel({
    mode: dialog.mode,
    trainingLocation,
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
          {/* Failure (domain refusal or database error) renders here, on top
              of the fields, without closing the dialog or clearing what was
              typed. */}
          {vm.errorMessage && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{vm.errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Fields stacked full width like the mockup — no side-by-side
              pair, so no min-w-0 needed here (CLAUDE.md §6). */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="training-location-name" className={LABEL_CLASSNAME}>
              Nom du lieu
            </Label>
            <Input
              id="training-location-name"
              placeholder="Ex. Stade municipal"
              required
              disabled={vm.isSubmitting}
              value={vm.values.name}
              onChange={(event) => vm.setName(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="training-location-address" className={LABEL_CLASSNAME}>
              Adresse
            </Label>
            <Input
              id="training-location-address"
              placeholder="Ex. 1 rue du Stade, Ville"
              required
              disabled={vm.isSubmitting}
              value={vm.values.address}
              onChange={(event) => vm.setAddress(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={vm.isSubmitting} onClick={onClose} className="h-11 rounded-full">
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
