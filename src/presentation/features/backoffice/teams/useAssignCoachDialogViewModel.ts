import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Team } from '@domain/entities/team'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export interface AssignCoachTeamOption {
  id: string
  label: string
}

interface UseAssignCoachDialogViewModelParams {
  targetTeam: Team
  onSuccess: () => void
}

// specs/section-and-teams.md UI design, "Nouveau composant —
// AssignCoachDialog" — writes public.user_roles via
// AssignCoachToTeamsUseCase, never presentation/ talking to Supabase or a
// repository directly (AC-ST-31). Reads its own reference data (users,
// teams, sections, seasons) through the SAME centralized queryKeys already
// warmed by useBackofficeTeamsViewModel — TanStack Query dedupes the
// request, so opening this dialog after the teams table has loaded costs no
// extra network round trip.
export function useAssignCoachDialogViewModel({ targetTeam, onSuccess }: UseAssignCoachDialogViewModelParams) {
  const { user, refreshUser } = useAuth()
  const queryClient = useQueryClient()
  const { assignCoachToTeamsUseCase, userRepository, teamRepository, sectionRepository, seasonRepository } =
    useSectionAndTeamsDependencies()

  const usersQuery = useQuery({ queryKey: queryKeys.usersAdminList(), queryFn: () => userRepository.findAll() })
  const teamsQuery = useQuery({ queryKey: queryKeys.teamsAdminList(), queryFn: () => teamRepository.findAllForAdmin() })
  const sectionsQuery = useQuery({ queryKey: queryKeys.sectionsAdminList(), queryFn: () => sectionRepository.findAll() })
  const seasonsQuery = useQuery({ queryKey: queryKeys.seasonsAdminList(), queryFn: () => seasonRepository.findAll() })

  const isLoadingOptions = usersQuery.isLoading || teamsQuery.isLoading || sectionsQuery.isLoading || seasonsQuery.isLoading

  const users = usersQuery.data ?? []
  const teams = teamsQuery.data ?? []
  const sectionsById = new Map((sectionsQuery.data ?? []).map((section) => [section.id, section]))
  const seasonsById = new Map((seasonsQuery.data ?? []).map((season) => [season.id, season]))

  // §2.8/AC-ST-45 — one row per EXISTING team, every season included (a
  // past-season team is not excluded, §2.9/PO-ST-16 non-blocking here).
  const teamOptions: AssignCoachTeamOption[] = teams
    .map((team) => ({
      id: team.id,
      label: `${team.name} · ${sectionsById.get(team.sectionId)?.name ?? ''} (${seasonsById.get(team.seasonId)?.label ?? ''})`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const [userId, setUserId] = useState('')
  // AC-ST-45 — pre-checked with the row the dialog was opened from, nothing
  // else.
  const [checkedTeamIds, setCheckedTeamIds] = useState<Set<string>>(() => new Set([targetTeam.id]))

  function toggleTeam(teamId: string) {
    setCheckedTeamIds((current) => {
      const next = new Set(current)
      if (next.has(teamId)) {
        // §2.9/AC-ST-21/PO-ST-13 (open, not decided here) — unchecking is a
        // pure UI no-op: no DELETE path exists, submitting still only ever
        // INSERTs the teams that remain checked at click time.
        next.delete(teamId)
      } else {
        next.add(teamId)
      }
      return next
    })
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      return assignCoachToTeamsUseCase.execute({
        actorId: user.id,
        userId,
        teamIds: Array.from(checkedTeamIds),
      })
    },
    onSuccess: () => {
      // AC-ST-46 — both tables' COACH(S) column read the SAME
      // coachAssignmentsAdminList key; teamsAdminList/sectionsAdminList are
      // invalidated too since ÉQUIPES/SECTION/SAISON columns compose them.
      void queryClient.invalidateQueries({ queryKey: queryKeys.coachAssignmentsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.teamsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.sectionsAdminList() })
      // AC-ST-46 — admin+coach cumul: if the operator assigned THEMSELVES,
      // their own cached User.roles is stale the instant this succeeds and
      // must be re-read, not left until the next reload.
      if (user && userId === user.id) {
        void refreshUser()
      }
      onSuccess()
    },
  })

  const canSubmit = !!userId && checkedTeamIds.size > 0 && !mutation.isPending

  // AC-ST-47 — on failure the dialog stays open, selections kept, French
  // message translated from the DomainError.
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    users,
    teamOptions,
    isLoadingOptions,

    userId,
    setUserId,
    checkedTeamIds,
    toggleTeam,

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
