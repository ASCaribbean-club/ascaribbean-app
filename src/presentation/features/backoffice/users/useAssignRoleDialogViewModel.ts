import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AssignableRoleAssignment } from '@domain/entities/user'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export type AssignableRole = AssignableRoleAssignment['role']

export interface AssignRoleTeamOption {
  id: string
  label: string
}

export interface AssignRoleSectionOption {
  id: string
  label: string
}

interface UseAssignRoleDialogViewModelParams {
  targetUserId: string
  onSuccess: () => void
}

// specs/web-users.md §2.6/AC-WU-06/AC-WU-35/AC-WU-36 — the generalized "+
// Rôle" dialog's own ViewModel, a TWIN of useAssignCoachDialogViewModel in
// SHAPE (target pre-linked, reference options loaded, submit through a use
// case) but NOT in the queue it writes to: this one calls AssignRoleUseCase/
// user_roles_insert_assign_role, `AssignCoachDialog`'s own
// useAssignCoachDialogViewModel stays locked on 'coach'/
// user_roles_insert_assign_coach, unchanged (AC-WU-31).
export function useAssignRoleDialogViewModel({ targetUserId, onSuccess }: UseAssignRoleDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { assignRoleUseCase, teamRepository, sectionRepository, seasonRepository } = useUsersDependencies()

  const teamsQuery = useQuery({ queryKey: queryKeys.teamsAdminList(), queryFn: () => teamRepository.findAllForAdmin() })
  const sectionsQuery = useQuery({ queryKey: queryKeys.sectionsAdminList(), queryFn: () => sectionRepository.findAll() })
  const seasonsQuery = useQuery({ queryKey: queryKeys.seasonsAdminList(), queryFn: () => seasonRepository.findAll() })

  const isLoadingOptions = teamsQuery.isLoading || sectionsQuery.isLoading || seasonsQuery.isLoading

  const teams = teamsQuery.data ?? []
  const sectionsById = new Map((sectionsQuery.data ?? []).map((section) => [section.id, section]))
  const seasonsById = new Map((seasonsQuery.data ?? []).map((season) => [season.id, season]))

  // §2.6c — same composed label as useAssignCoachDialogViewModel's own
  // teamOptions (name · section (season)), the SAME source of truth reused
  // rather than a second, narrower one.
  const teamOptions: AssignRoleTeamOption[] = teams
    .map((team) => ({
      id: team.id,
      label: `${team.name} · ${sectionsById.get(team.sectionId)?.name ?? ''} (${seasonsById.get(team.seasonId)?.label ?? ''})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const sectionOptions: AssignRoleSectionOption[] = (sectionsQuery.data ?? [])
    .map((section) => ({ id: section.id, label: section.name }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const [role, setRoleState] = useState<AssignableRole | ''>('')
  const [teamId, setTeamId] = useState('')
  const [checkedTeamIds, setCheckedTeamIds] = useState<Set<string>>(new Set())
  const [sectionId, setSectionId] = useState('')

  // §2.6c — changing the chosen role clears every scope field: a value left
  // over from a previously-selected role (e.g. a checked team under
  // 'player', switched to 'coach') must never silently ride along into a
  // DIFFERENT role's own scope shape.
  function setRole(nextRole: AssignableRole | '') {
    setRoleState(nextRole)
    setTeamId('')
    setCheckedTeamIds(new Set())
    setSectionId('')
  }

  function toggleTeam(id: string) {
    setCheckedTeamIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // §2.6c/AC-WU-35 — the friendlier, EARLIER rejection this dialog can offer
  // (disabling the submit button) ahead of AssignRoleUseCase's own
  // validateScope(), which is the real authority (and user_roles_scope_check
  // behind it, §2.6c).
  function buildAssignment(): AssignableRoleAssignment | null {
    switch (role) {
      case 'player':
        return teamId ? { role: 'player', teamId } : null
      case 'coach':
        return checkedTeamIds.size > 0 ? { role: 'coach', teamIds: Array.from(checkedTeamIds) } : null
      case 'section-manager':
        return sectionId ? { role: 'section-manager', sectionId } : null
      case 'authorized-officer':
      case 'treasurer':
      case 'medical-referent':
      case 'volunteer':
        return { role }
      default:
        return null
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      const assignment = buildAssignment()
      if (!assignment) {
        // Unreachable in practice — canSubmit below already disables the
        // submit control until buildAssignment() returns non-null.
        throw new Error('No role/scope selected yet.')
      }
      return assignRoleUseCase.execute({ actorId: user.id, userId: targetUserId, assignment })
    },
    onSuccess: () => {
      // AC-WU-21 — the assigned role appears on the row and the nav badge
      // updates without a manual reload.
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersAdminDirectory() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersBadgeCount() })
      // AC-WU-21 — assigning a coach from THIS screen also invalidates the
      // read /admin/teams consumes, so the two screens never drift apart.
      if (role === 'coach') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.coachAssignmentsAdminList() })
      }
      onSuccess()
    },
  })

  const canSubmit = buildAssignment() !== null && !mutation.isPending

  // AC-WU-22 — on failure the dialog stays open, selections kept, French
  // message translated from the DomainError.
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    role,
    setRole,
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
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
