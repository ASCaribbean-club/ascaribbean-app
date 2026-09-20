import type { Section } from '@domain/entities/section'
import type { Team } from '@domain/entities/team'
import type { AssignableRoleAssignment } from '@domain/entities/user'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Checkbox } from '@presentation/shared/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { formatRole, scopeKeyOf } from '@presentation/shared/formatters/role-labels'
import { useEditRoleAssignmentDialogViewModel } from '../useEditRoleAssignmentDialogViewModel'
import { RemoveRoleAssignmentDialog } from './RemoveRoleAssignmentDialog'

export interface EditRoleAssignmentTarget {
  user: AdminUserDirectoryEntry
  assignment: AssignableRoleAssignment
}

interface EditRoleAssignmentDialogProps {
  target: EditRoleAssignmentTarget | null
  teamsById: Map<string, Team>
  sectionsById: Map<string, Section>
  onClose: () => void
}

// specs/web-users-role-edit-remove.md §2.2/§2.3/UI design "Nouveau dialogue
// — modifier la portée d'une affectation" — a NEW component, distinct from
// AssignRoleDialog (still the "+ Rôle" CREATE path, unchanged) and from
// AssignCoachDialog (still /admin/teams' own locked path, AC-WU-31/AC-WU-46).
// Opened by a click on a non-admin pastille in UserRolesCell.
export function EditRoleAssignmentDialog({ target, teamsById, sectionsById, onClose }: EditRoleAssignmentDialogProps) {
  if (!target) return null

  return (
    <EditRoleAssignmentDialogContent
      key={`${target.user.id}:${target.assignment.role}:${scopeKeyOf(target.assignment)}`}
      target={target}
      teamsById={teamsById}
      sectionsById={sectionsById}
      onClose={onClose}
    />
  )
}

function EditRoleAssignmentDialogContent({
  target,
  teamsById,
  sectionsById,
  onClose,
}: {
  target: EditRoleAssignmentTarget
  teamsById: Map<string, Team>
  sectionsById: Map<string, Section>
  onClose: () => void
}) {
  const { user, assignment } = target
  const vm = useEditRoleAssignmentDialogViewModel({ target: user, assignment, onClose })

  const noTeams = !vm.isLoadingOptions && vm.teamOptions.length === 0
  const noSections = !vm.isLoadingOptions && vm.sectionOptions.length === 0

  // §2.2 — the four club-wide roles have no scope to edit: "Enregistrer" is
  // ABSENT for them (never disabled) — only removal has a meaning here.
  const hasEditableScope = assignment.role === 'player' || assignment.role === 'coach' || assignment.role === 'section-manager'

  return (
    <>
      <Dialog open={!vm.isConfirmingRemoval} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Modifier l&rsquo;affectation de {user.fullName}</DialogTitle>
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
              <Label htmlFor="edit-role-assignment-role" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Rôle
              </Label>
              {/* §2.2 rule 1/UI design — same visual treatment as the
                  disabled EMAIL field of UserEditDialog: visibly non-editable
                  AND said, never a silently dead field. Never a Select
                  pre-positioned: that would suggest a role CHANGE, which
                  §1 of the amendment structurally excludes. */}
              <Input id="edit-role-assignment-role" disabled value={formatRole(assignment.role)} className="h-11 rounded-xl" />
              <p className="text-xs text-muted-foreground">
                Non modifiable — seule la portée peut être corrigée ici. Pour changer de rôle, retirez cette affectation puis assignez-en une
                nouvelle.
              </p>
            </div>

            {assignment.role === 'player' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-role-assignment-team" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Équipe
                </Label>
                <Select value={vm.teamId} onValueChange={vm.setTeamId} disabled={vm.isSubmitting || noTeams}>
                  <SelectTrigger id="edit-role-assignment-team" className="h-11 rounded-xl">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.teamOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {noTeams && <p className="text-xs text-muted-foreground">Aucune équipe disponible pour le moment.</p>}
              </div>
            )}

            {assignment.role === 'coach' && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Équipes</Label>
                {/* §2.2 — the SAME checkbox list AssignRoleDialog/AssignCoachDialog
                    already render, reused rather than redrawn — pre-CHECKED
                    on the assignment's current teams (vm's own initial
                    state). */}
                <div className="flex max-h-64 flex-col overflow-y-auto rounded-xl border border-border">
                  {vm.teamOptions.map((option) => (
                    <label
                      key={option.id}
                      htmlFor={`edit-role-assignment-team-${option.id}`}
                      className="flex min-h-11 items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                    >
                      <Checkbox
                        id={`edit-role-assignment-team-${option.id}`}
                        checked={vm.checkedTeamIds.has(option.id)}
                        onCheckedChange={() => vm.toggleTeam(option.id)}
                        disabled={vm.isSubmitting}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
                {noTeams && <p className="text-xs text-muted-foreground">Aucune équipe disponible pour le moment.</p>}
              </div>
            )}

            {assignment.role === 'section-manager' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-role-assignment-section" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Section
                </Label>
                <Select value={vm.sectionId} onValueChange={vm.setSectionId} disabled={vm.isSubmitting || noSections}>
                  <SelectTrigger id="edit-role-assignment-section" className="h-11 rounded-xl">
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {vm.sectionOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {noSections && <p className="text-xs text-muted-foreground">Aucune section disponible pour le moment.</p>}
              </div>
            )}

            {/* §7 of the amendment/UI design point 6 — footer restructured:
                sm:justify-between, a destructive entry on the LEFT (only if
                canRemoveRole), Annuler/Enregistrer on the right. Enregistrer
                is ABSENT (never disabled) for the four club-wide roles. */}
            <DialogFooter className="sm:justify-between">
              {vm.canRemoveRole ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={vm.isSubmitting}
                  onClick={vm.openRemoveConfirmation}
                  className="h-11 rounded-full text-coach-red hover:bg-coach-red/10 hover:text-coach-red"
                >
                  Retirer cette affectation
                </Button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" disabled={vm.isSubmitting} onClick={onClose} className="h-11 rounded-full">
                  Annuler
                </Button>
                {hasEditableScope && (
                  <Button
                    type="submit"
                    disabled={!vm.canSubmit}
                    className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
                  >
                    {vm.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RemoveRoleAssignmentDialog
        isOpen={vm.isConfirmingRemoval}
        target={user}
        assignment={assignment}
        teamsById={teamsById}
        sectionsById={sectionsById}
        isRemoving={vm.isRemoving}
        errorMessage={vm.removeErrorMessage}
        onConfirm={vm.confirmRemoval}
        onCancel={vm.cancelRemoveConfirmation}
      />
    </>
  )
}
