import type { Section } from '@domain/entities/section'
import type { Team } from '@domain/entities/team'
import type { AssignableRoleAssignment } from '@domain/entities/user'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
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
import { formatRoleAssignment } from '@presentation/shared/formatters/role-labels'

interface RemoveRoleAssignmentDialogProps {
  isOpen: boolean
  target: AdminUserDirectoryEntry
  assignment: AssignableRoleAssignment
  teamsById: Map<string, Team>
  sectionsById: Map<string, Section>
  isRemoving: boolean
  errorMessage: string | null
  onConfirm: () => void
  onCancel: () => void
}

// specs/web-users-role-edit-remove.md §2.3/§7/UI design "Action
// destructrice — retirer une affectation" — interaction PATTERN reused from
// ArchiveMembershipDialog (AlertDialog, stays open during the mutation,
// closes only from the ViewModel's onSuccess), visual/copy REGISTER reused
// from ArchiveNewsDialog (bg-coach-red, "définitivement") — deliberately
// NOT ArchiveMembershipDialog's neutral tone: nothing survives this action
// (public.user_roles carries no archived_at/timestamp/author, §4 of the
// amendment), unlike an archived membership, which keeps its payment
// history.
export function RemoveRoleAssignmentDialog({
  isOpen,
  target,
  assignment,
  teamsById,
  sectionsById,
  isRemoving,
  errorMessage,
  onConfirm,
  onCancel,
}: RemoveRoleAssignmentDialogProps) {
  const label = formatRoleAssignment(assignment, teamsById, sectionsById)
  const isMultiTeamCoach = assignment.role === 'coach' && assignment.teamIds.length > 1
  const teamNames = assignment.role === 'coach' ? assignment.teamIds.map((teamId) => teamsById.get(teamId)?.name ?? '').join(', ') : ''
  // §2.3 — "retirer la dernière affectation d'un compte est autorisé":
  // informational only, read from the row's own already-loaded roles, never
  // a second network call.
  const isLastRole = target.roles.length === 1

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer cette affectation ?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <span>
                « {target.fullName} » perdra l&rsquo;affectation <strong className="font-semibold text-foreground">{label}</strong>.
              </span>
              {isMultiTeamCoach && <span>Toutes les équipes de cette affectation seront retirées : {teamNames}.</span>}
              <span>Cette affectation sera retirée définitivement : aucune ligne, aucun historique n&rsquo;en sera conservé.</span>
              {isLastRole && <span>Ce compte se retrouvera sans aucun rôle.</span>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving} onClick={onCancel} className="h-11 rounded-full">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isRemoving}
            onClick={(event) => {
              // Same reasoning as ArchiveMembershipDialog/ArchiveNewsDialog:
              // prevented so the dialog stays open (with its spinner label)
              // while the mutation is in flight, closing only from the
              // ViewModel's onSuccess.
              event.preventDefault()
              onConfirm()
            }}
            className="h-11 rounded-full bg-coach-red font-bold text-white hover:bg-coach-red disabled:opacity-60"
          >
            {isRemoving ? 'Retrait…' : 'Retirer définitivement'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
