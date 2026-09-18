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
import { formatEuros } from '@presentation/shared/formatters/currency'
import type { MembershipAdminRow } from '../useBackofficeMembershipsViewModel'

interface ArchiveMembershipDialogProps {
  target: MembershipAdminRow | null
  paidCents: number
  isArchiving: boolean
  errorMessage: string | null
  onConfirm: () => void
  onCancel: () => void
}

// specs/web-memberships.md §2.5/PO-WM-05 (not illustrated by any mockup) —
// modeled on ArchiveNewsDialog.tsx, with two deliberate departures from that
// precedent (§7 of the spec, "il doit se lire comme « archiver », jamais
// comme « supprimer définitivement »"): IconArchive rather than IconTrash on
// the row's own trigger (see MembershipTable.tsx), and neutral copy/colors
// here rather than the "Supprimer"/coach-red pattern club_news uses — a
// financial, nominative record that keeps its full payment history
// attached is not the same class of action as removing a news item from
// the mobile feed.
export function ArchiveMembershipDialog({ target, paidCents, isArchiving, errorMessage, onConfirm, onCancel }: ArchiveMembershipDialogProps) {
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archiver cette adhésion ?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <span>
                {target && `Cette adhésion de « ${target.userFullName} » ne sera plus visible dans la liste ni sur le profil mobile du membre.`}
              </span>
              <span>Elle est conservée avec son historique de paiements — elle n'est pas supprimée.</span>
              {/* UI design §"Icône d'archivage", point 3 — a PROPOSAL, not an
                  arbitration of PO-WM-05 ("peut-on archiver une adhésion
                  portant déjà des paiements"): shown only when the target
                  already carries at least one payment. */}
              {paidCents > 0 && (
                <span>
                  Cette adhésion a déjà reçu {formatEuros(paidCents)} de paiements — l'archivage retire cette situation financière de la vue
                  courante, sans effacer les paiements eux-mêmes.
                </span>
              )}
            </div>
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
              // Same reasoning as ArchiveNewsDialog: prevented so the dialog
              // stays open (with its spinner label) while the mutation is in
              // flight, and only closes from the ViewModel's onSuccess.
              event.preventDefault()
              onConfirm()
            }}
            className="h-11 rounded-full font-bold disabled:opacity-60"
          >
            {isArchiving ? 'Archivage…' : 'Archiver'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
