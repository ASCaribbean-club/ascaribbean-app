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
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import type { ClubNews } from '@domain/entities/club-news'

interface ArchiveNewsDialogProps {
  news: ClubNews | null
  isArchiving: boolean
  errorMessage: string | null
  onConfirm: () => void
  onCancel: () => void
}

// 2026-09-17 developer decision (resolves PO-WA-06) — "Supprimer" is a
// destructive-looking action (it removes the row from the mobile feed and
// from the "Active"/normal admin view), so it goes through the confirmation
// primitive already vendored for exactly this class of action
// (alert-dialog.tsx — "patron de confirmation destructrice", per
// specs/web-actus.md's own note that this primitive was previously unused
// because nothing destructive existed yet). It's a soft archive, not a real
// SQL DELETE — copy says so explicitly, not just "Supprimer" left to imply
// permanence it doesn't have.
export function ArchiveNewsDialog({ news, isArchiving, errorMessage, onConfirm, onCancel }: ArchiveNewsDialogProps) {
  return (
    <AlertDialog open={!!news} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette actu ?</AlertDialogTitle>
          <AlertDialogDescription>
            {news && `« ${news.title} » ne sera plus visible sur le fil mobile ni dans la liste active. Elle reste conservée (statut archivé), elle n’est pas définitivement effacée.`}
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
              // default — prevented here so the dialog stays open (with its
              // spinner label) while the mutation is in flight, and only
              // closes from useBackofficeNewsViewModel's onSuccess.
              event.preventDefault()
              onConfirm()
            }}
            className="h-11 rounded-full bg-coach-red font-bold text-white hover:bg-coach-red disabled:opacity-60"
          >
            {isArchiving ? 'Suppression…' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
