import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssignableRoleAssignment } from '@domain/entities/user'
import { scopeContextFor } from '@domain/policies/role-assignment-scope'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

interface UseEditRoleAssignmentDialogViewModelParams {
  target: AdminUserDirectoryEntry
  assignment: AssignableRoleAssignment
  onClose: () => void
}

// specs/web-users-role-edit-remove.md §2.2/§2.3/§2.7/UI design "Nouveau
// dialogue — modifier la portée d'une affectation" — a TWIN of
// useAssignRoleDialogViewModel in shape (options loaded, conditional scope
// fields, submit through a use case) but operating on an EXISTING
// affectation: role read-only, scope fields pre-filled, PLUS the removal
// confirmation step this dialog's own footer opens (§7 of the amendment:
// "le dialogue de modification contient l'entrée vers le retrait").
export function useEditRoleAssignmentDialogViewModel({ target, assignment, onClose }: UseEditRoleAssignmentDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { editRoleAssignmentScopeUseCase, removeRoleAssignmentUseCase, teamRepository, sectionRepository, seasonRepository } = useUsersDependencies()

  // AC-WU-53 — two SEPARATE booleans, never merged: canAssignRole gates
  // whether the pastille opens this dialog at all (UserRolesCell/UserTable),
  // canRemoveRole gates only the destructive control INSIDE it.
  const canRemoveRole = usePermission('role:remove', scopeContextFor(assignment))

  const teamsQuery = useQuery({ queryKey: queryKeys.teamsAdminList(), queryFn: () => teamRepository.findAllForAdmin() })
  const sectionsQuery = useQuery({ queryKey: queryKeys.sectionsAdminList(), queryFn: () => sectionRepository.findAll() })
  const seasonsQuery = useQuery({ queryKey: queryKeys.seasonsAdminList(), queryFn: () => seasonRepository.findAll() })

  const isLoadingOptions = teamsQuery.isLoading || sectionsQuery.isLoading || seasonsQuery.isLoading

  const teams = teamsQuery.data ?? []
  const sectionsById = new Map((sectionsQuery.data ?? []).map((section) => [section.id, section]))
  const seasonsById = new Map((seasonsQuery.data ?? []).map((season) => [season.id, season]))

  // §2.6c of web-users.md, reused as-is — same composed label as
  // useAssignRoleDialogViewModel/useAssignCoachDialogViewModel's own
  // teamOptions.
  const teamOptions = teams
    .map((team) => ({
      id: team.id,
      label: `${team.name} · ${sectionsById.get(team.sectionId)?.name ?? ''} (${seasonsById.get(team.seasonId)?.label ?? ''})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const sectionOptions = (sectionsQuery.data ?? [])
    .map((section) => ({ id: section.id, label: section.name }))
    .sort((a, b) => a.label.localeCompare(b.label))

  // §2.2 — scope fields PRE-FILLED from the assignment being edited, unlike
  // AssignRoleDialog's own empty starting state.
  const [teamId, setTeamId] = useState(assignment.role === 'player' ? assignment.teamId : '')
  const [checkedTeamIds, setCheckedTeamIds] = useState<Set<string>>(
    new Set(assignment.role === 'coach' ? assignment.teamIds : []),
  )
  const [sectionId, setSectionId] = useState(assignment.role === 'section-manager' ? assignment.sectionId : '')

  function toggleTeam(id: string) {
    setCheckedTeamIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // §2.2/AC-WU-51 — the friendlier, EARLIER rejection this dialog can offer
  // (disabling the submit button) ahead of EditRoleAssignmentScopeUseCase's
  // own validateRoleAssignmentScope(), which is the real authority.
  function buildNextAssignment(): AssignableRoleAssignment | null {
    switch (assignment.role) {
      case 'player':
        return teamId ? { role: 'player', teamId } : null
      case 'coach':
        return checkedTeamIds.size > 0 ? { role: 'coach', teamIds: Array.from(checkedTeamIds) } : null
      case 'section-manager':
        return sectionId ? { role: 'section-manager', sectionId } : null
      default:
        // authorized-officer / treasurer / medical-referent / volunteer —
        // no scope to edit; Enregistrer isn't even rendered for these roles.
        return null
    }
  }

  // §2.2 rule 3/AC-WU-51 — "une soumission identique à l'état actuel est un
  // no-op silencieux": intercepted HERE, in presentation/, before any
  // mutation is ever triggered — never a network call for an unchanged
  // scope. Compares `next` against `assignment` field-by-field rather than
  // re-switching on assignment.role like buildNextAssignment() above:
  // a role's scope fields can only ever be reached here already matching
  // (buildNextAssignment already built `next` from the same role), so this
  // never needs its own per-role case to stay in sync with that switch.
  function isUnchanged(next: AssignableRoleAssignment): boolean {
    if (next.role !== assignment.role) return false
    const nextFields = next as unknown as Record<string, unknown>
    const currentFields = assignment as unknown as Record<string, unknown>
    return Object.keys(nextFields).every((key) => {
      const a = nextFields[key]
      const b = currentFields[key]
      if (Array.isArray(a) && Array.isArray(b)) return sameTeamIdSet(a as string[], b as string[])
      return a === b
    })
  }

  function invalidateAfterWrite() {
    // §2.8 of the amendment/AC-WU-49 — the admin directory read and the nav
    // badge (removing/moving the account's last role flips AC-WU-37's own
    // criterion 1), plus coachAssignmentsAdminList when the touched
    // assignment is a 'coach' (/admin/teams' CoachListCell must never
    // diverge from what was written here).
    void queryClient.invalidateQueries({ queryKey: queryKeys.usersAdminDirectory() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.usersBadgeCount() })
    if (assignment.role === 'coach') {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachAssignmentsAdminList() })
    }
  }

  const editMutation = useMutation({
    mutationFn: (nextAssignment: AssignableRoleAssignment) => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      return editRoleAssignmentScopeUseCase.execute({
        actorId: user.id,
        userId: target.id,
        currentAssignment: assignment,
        nextAssignment,
      })
    },
    onSuccess: () => {
      invalidateAfterWrite()
      onClose()
    },
  })

  function submit() {
    const next = buildNextAssignment()
    if (!next) return // unreachable in practice — canSubmit already disables the control
    if (isUnchanged(next)) {
      // AC-WU-51 — silent close, no network call, no error.
      onClose()
      return
    }
    editMutation.mutate(next)
  }

  const canSubmit = buildNextAssignment() !== null && !editMutation.isPending
  const errorMessage = editMutation.error ? mapDomainErrorToUiError(editMutation.error).message : null

  // §7 of the amendment — the destructive action is a SECOND step: opening
  // the confirmation never removes on the first click.
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false)

  const removeMutation = useMutation({
    mutationFn: () => {
      if (!user) {
        throw new Error('No authenticated admin session.')
      }
      return removeRoleAssignmentUseCase.execute({ actorId: user.id, userId: target.id, assignment })
    },
    onSuccess: () => {
      invalidateAfterWrite()
      // §"En cas de succès" — BOTH dialogs close: the affectation the edit
      // dialog was showing no longer exists.
      setIsConfirmingRemoval(false)
      onClose()
    },
  })

  const removeErrorMessage = removeMutation.error ? mapDomainErrorToUiError(removeMutation.error).message : null

  return {
    roleLabel: assignment.role,
    targetFullName: target.fullName,

    teamId,
    setTeamId,
    checkedTeamIds,
    toggleTeam,
    sectionId,
    setSectionId,

    teamOptions,
    sectionOptions,
    isLoadingOptions,

    canSubmit,
    isSubmitting: editMutation.isPending,
    errorMessage,
    submit,

    canRemoveRole,
    isConfirmingRemoval,
    openRemoveConfirmation: () => setIsConfirmingRemoval(true),
    cancelRemoveConfirmation: () => setIsConfirmingRemoval(false),
    confirmRemoval: () => removeMutation.mutate(),
    isRemoving: removeMutation.isPending,
    removeErrorMessage,
  }
}

function sameTeamIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((id) => setB.has(id))
}
