import type { AdminFinanceCarrier } from '@domain/entities/finance'
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

interface ArchiveFinanceCarrierDialogProps {
  carrier: AdminFinanceCarrier | null
  isArchiving: boolean
  errorMessage: string | null
  onConfirm: () => void
  onCancel: () => void
}

// specs/finances-member-advances.md B2/B3 — confirmation of the archive, NOT
// red (not a deletion; the copy says the carrier is kept and can be restored).
// A refusal keeps the dialog OPEN with a destructive Alert naming the cause
// (no season, opening balance not entered, balance not zero) — never raw
// Postgres text; "Archiver" stays available for a new attempt.
export function ArchiveFinanceCarrierDialog({
  carrier,
  isArchiving,
  errorMessage,
  onConfirm,
  onCancel,
}: ArchiveFinanceCarrierDialogProps) {
  return (
    <AlertDialog open={!!carrier} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archiver ce porteur ?</AlertDialogTitle>
          <AlertDialogDescription>
            {carrier &&
              `« ${carrier.label} » ne sera plus proposé comme payeur d’une dépense, ni dans les versements, ni dans les prochains points de trésorerie. Son historique, ses soldes et ses points passés restent visibles. Le porteur n’est pas supprimé et pourra être restauré.`}
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
              // Radix closes the dialog on click by default — prevented so it
              // stays open (also on a refusal) until the ViewModel closes it.
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
