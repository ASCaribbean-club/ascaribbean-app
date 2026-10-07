import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getFirstName, getInitials } from '../../shared/formatters/greeting'
import { useActiveTeam } from '../../shared/hooks/use-active-team'
import { useAuth } from '../../shared/hooks/use-auth'
import { usePermission } from '../../shared/hooks/use-permission'
import { queryKeys } from '../../shared/query-keys'
import { useCoachDashboardDependencies } from '../../di/hooks/use-coach-dashboard-dependencies'

export function useCoachDashboardViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { selectedCoachTeamId, selectCoachTeam } = useActiveTeam()
  const {
    getCoachTeamsUseCase,
    listTeamConvocationsUseCase: listUpcomingTeamConvocationsUseCase,
    getTeamRecentFormUseCase,
    listCoachAlertsUseCase,
  } = useCoachDashboardDependencies()

  // Get teams ids where coach is assigned to
  const coachAssignment = user?.roles.find((assignment) => assignment.role === 'coach')
  const coachTeamIds = coachAssignment?.teamIds ?? []

  const teamsQuery = useQuery({ // Allow having { data, isLoading, error, ... }
    queryKey: queryKeys.coachTeams(user?.id ?? ''), // Request identitiy. Always built and allow putting the potential result in cache
    queryFn: () => getCoachTeamsUseCase.execute({ coachTeamIds }), // Function call delegated to use case
    enabled: !!user && coachTeamIds.length > 0, // Condition that should be ok to launch the function. Query stays in loading status
  })

  // PO-6/AC-CD-14 resolved: the pill is a real ActiveTeamProvider-backed
  // selector now (CoachHeader renders a Select once hasMultipleTeams).
  // `selectedCoachTeamId` is `null` until the coach actually picks one —
  // falls back to teamsQuery.data[0], the same deterministic-but-arbitrary
  // "first by array order" default as before, so a coach who never opens
  // the selector sees exactly the old behavior.
  const currentTeamSummary = teamsQuery.data?.find((summary) => summary.team.id === selectedCoachTeamId) ?? teamsQuery.data?.[0]
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

  // specs/coach-dashboard.md §1 point 7 (PO-1), resolved 2026-09-30 — real
  // team data now that specs/match-stats.md exists, replacing the earlier
  // hardcoded FormAndGoalsRow values.
  const teamRecentFormQuery = useQuery({
    queryKey: queryKeys.teamRecentForm(currentTeam?.id ?? ''),
    queryFn: () => getTeamRecentFormUseCase.execute({ teamId: currentTeam!.id }),
    enabled: !!currentTeam,
  })

  // specs/coach-alerts.md PO-AL-03, re-résolu 2026-09-30 — badge de
  // compteur sur l'icône d'alerte, à la demande explicite de la
  // développeuse. Même queryKey que useCoachAlertsViewModel
  // (`queryKeys.coachAlerts`), donc le cache TanStack Query est partagé
  // entre le dashboard et l'écran Alertes — pas une seconde lecture
  // indépendante. Volontairement HORS de `isLoading`/`error` ci-dessous :
  // le badge est une amélioration secondaire, jamais un bloqueur de
  // l'affichage du dashboard (AC-CD-10, < 3 s) — `alertsCount` reste à 0
  // (badge absent) tant que la requête n'a pas résolu ou si elle échoue.
  const coachAlertsQuery = useQuery({
    queryKey: queryKeys.coachAlerts(currentTeam?.id ?? ''),
    queryFn: () => listCoachAlertsUseCase.execute({ teamId: currentTeam!.id, now: new Date() }),
    enabled: !!currentTeam,
  })

  const canCreateConvocation = usePermission('convocation:create', { teamId: currentTeam?.id })

  return {
    isLoading: teamsQuery.isLoading || upcomingConvocationsQuery.isLoading || teamRecentFormQuery.isLoading,
    error: teamsQuery.error ?? upcomingConvocationsQuery.error ?? teamRecentFormQuery.error,

    /// --- Header ---
    firstName: user ? getFirstName(user.fullName) : '',
    initials: user ? getInitials(user.fullName) : '',
    currentTeam,
    activeMemberCount: currentTeamSummary?.activeMemberCount,
    rosterMemberCount: currentTeamSummary?.rosterMemberCount,
    // It's the number of matchday + 1 but not implemented in P0 because not sure it's useful
    dayMarker: undefined as string | undefined,
    hasMultipleTeams: (teamsQuery.data?.length ?? 0) > 1,
    // PO-6/AC-CD-14: real team list + selection, driven by ActiveTeamProvider.
    teams: teamsQuery.data?.map((summary) => summary.team) ?? [],
    onSelectTeam: selectCoachTeam,

    /// --- Next training or match card ---
    nextTrainingOrMatch: nextTrainingOrMatch,

    /// --- "Forme récente" / "Buts" row (PO-1, resolved 2026-09-30) ---
    teamForm: teamRecentFormQuery.data?.form ?? [],
    teamGoalsFor: teamRecentFormQuery.data?.goalsFor ?? 0,
    teamGoalsAgainst: teamRecentFormQuery.data?.goalsAgainst ?? 0,

    /// --- Events/convocations to come ---
    upcomingList,
    goToCalendar: () => {
      navigate('/calendar')
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

    /// --- Alert icon click (specs/coach-alerts.md §1, UI design
    // "Emplacement — écran et entrée") — pushed route, same full-screen/
    // no-BottomNav group as /profile and /stats (AC-AL-14). No teamId is
    // passed through router state: the destination screen resolves the
    // active team itself, the same ActiveTeamProvider-backed way this
    // screen does (PO-AL-01 résolu). ---
    goToAlerts: () => {
      navigate('/alerts')
    },
    alertsCount: coachAlertsQuery.data?.length ?? 0,

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
