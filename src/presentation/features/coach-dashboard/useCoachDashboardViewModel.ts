import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getFirstName, getInitials } from '../../shared/formatters/greeting'
import { useActiveRole } from '../../shared/hooks/use-active-role'
import { useAuth } from '../../shared/hooks/use-auth'
import { usePermission } from '../../shared/hooks/use-permission'
import { queryKeys } from '../../shared/query-keys'
import { useCoachDashboardDependencies } from '../../di/hooks/use-coach-dashboard-dependencies'

export function useCoachDashboardViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toggleActiveRole } = useActiveRole()
  const { getCoachTeamsUseCase, listUpcomingTeamConvocationsUseCase } = useCoachDashboardDependencies()

  // Get teams ids where coach is assigned to
  const coachAssignment = user?.roles.find((assignment) => assignment.role === 'coach')
  const coachTeamIds = coachAssignment?.teamIds ?? []

  const teamsQuery = useQuery({ // Allow having { data, isLoading, error, ... }
    queryKey: queryKeys.coachTeams(user?.id ?? ''), // Request identitiy. Always built and allow putting the potential result in cache
    queryFn: () => getCoachTeamsUseCase.execute({ coachTeamIds }), // Function call delegated to use case
    enabled: !!user && coachTeamIds.length > 0, // Condition that should be ok to launch the function. Query stays in loading status
  })

  // TODO(PO-6): the selector pill is a no-op in v1 (AC-CD-14) — there is no
  // bascule to read a "selected team" from. Which of teamsQuery.data is
  // rendered as the current/default team when the coach has several? Spec
  // doesn't say; pick a deterministic rule (e.g. first by name) and
  // document it here — don't leave it as "whatever the array order happens
  // to be" from the repository.
  const currentTeamSummary = teamsQuery.data?.[0]
  const currentTeam = currentTeamSummary?.team

  const upcomingConvocationsQuery = useQuery({
    queryKey: queryKeys.teamUpcomingConvocations(currentTeam?.id ?? ''),
    queryFn: () => listUpcomingTeamConvocationsUseCase.execute({ teamId: currentTeam!.id, now: new Date() }),
    enabled: !!currentTeam,
  })

  // Get nextTrainingOrMatch & the others incoming convocations
  const upcomingConvocations = upcomingConvocationsQuery.data ?? []
  const nextTrainingOrMatch = upcomingConvocations.find((c) => c.convocation.type === 'training' || c.convocation.type === 'match')
  const upcomingList = upcomingConvocations.filter((c) => c !== nextTrainingOrMatch);

  const canCreateConvocation = usePermission('convocation:create', { teamId: currentTeam?.id })

  return {
    isLoading: teamsQuery.isLoading || upcomingConvocationsQuery.isLoading,
    error: teamsQuery.error ?? upcomingConvocationsQuery.error,

    /// --- Header ---
    firstName: user ? getFirstName(user.fullName) : '',
    initials: user ? getInitials(user.fullName) : '',
    currentTeam,
    activeMemberCount: currentTeamSummary?.activeMemberCount,
    // It's the number of matchday + 1 but not implemented in P0 because not sure it's useful
    dayMarker: undefined as string | undefined,
    hasMultipleTeams: (teamsQuery.data?.length ?? 0) > 1,
    onRoleClick: toggleActiveRole,
    // TODO(PO-6, AC-CD-14): team selector pill click — no-op in v1 by design.
    onTeamSelectorClick: () => { },

    /// --- Next training or match card ---
    nextTrainingOrMatch: nextTrainingOrMatch,

    /// --- Events/convocations to come ---
    upcomingList,
    goToCalendar: () => {
      // TODO: Calendrier route doesn't exist yet — replace once that
      // feature lands (AC-CD-08 "Voir tout" → Calendrier).
      // navigate('/calendar/{convocation.date}')
    },
    goToConvocationDetail: (convocationId: string) => {
      if (!convocationId) return
      navigate(`/convocations/${convocationId}`)
    },

    /// --- Avatar click (specs/profile-page.md, router course-correction
    // 2026-09-04: the avatar now opens the profile screen instead of a
    // sign-out confirmation directly here — sign-out moved to ProfilePage's
    // own avatar, same change as usePlayerDashboardViewModel's) ---
    goToProfilePage: () => {
      if (!user) return
      navigate('/profile')
    },

    /// --- Floatting "+" button ---
    canCreateConvocation,
    // specs/create-convocation.md §1 — CreateConvocationForm lives in its
    // own feature (presentation/features/convocation/), not inside
    // coach-dashboard; this FAB triggers it without owning it. The target
    // team has no selector on that screen (§1, "l'équipe cible n'est pas
    // choisie sur cet écran") — it's inherited from `currentTeam` computed
    // above, passed through router state rather than re-derived by
    // useCreateConvocationViewModel (see that hook's TODO on why a hard
    // refresh loses this).
    openConvocationCreate: () => {
      if (!currentTeam) return
      navigate('/convocations/new', {
        state: { teamId: currentTeam.id, activeMemberCount: currentTeamSummary?.activeMemberCount },
      })
    },
  }
}
