import type { TrainingLocation } from '@domain/entities/training-location'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@presentation/shared/components/ui/alert-dialog'

interface ArchiveTrainingLocationDialogProps {
  trainingLocation: TrainingLocation | null
  isArchiving: boolean
  errorMessage: string | null
  onConfirm: () => void
  onCancel: () => void
}

// specs/web-localizations.md UI design "Archivage" — confirmation proposed
// pending PO-WL-14 (archiving has no way back in the UI). Same structure as
// ArchiveNewsDialog, but NOT red: this is not a deletion, and the repo's
// red is reserved for cancelled/rejected states. The copy says explicitly
// that the location is not deleted.
export function ArchiveTrainingLocationDialog({
  trainingLocation,
  isArchiving,
  errorMessage,
  onConfirm,
  onCancel,
}: ArchiveTrainingLocationDialogProps) {
  return (
    <AlertDialog open={!!trainingLocation} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archiver ce lieu ?</AlertDialogTitle>
          <AlertDialogDescription>
            {trainingLocation &&
              `« ${trainingLocation.name} » ne sera plus proposé lors de la création d’un entraînement. Les entraînements qui l’utilisent déjà continuent de l’afficher. Le lieu n’est pas supprimé.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isArchiving} onClick={onCancel} className="h-11 rounded-full">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isArchiving}
            onClick={(event) => {
              // Radix's AlertDialog.Action closes the dialog on click by
              // default — prevented so it stays open (with its pending
              // label) while the mutation is in flight, and only closes
              // from the ViewModel's onSuccess.
              event.preventDefault()
              onConfirm()
            }}
            className="h-11 rounded-full bg-white font-bold text-black hover:bg-white/90 disabled:opacity-60"
          >
            {isArchiving ? 'Archivage…' : 'Archiver'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
