import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useCoachTeamStatsDependencies } from '@presentation/di/hooks/use-coach-team-stats-dependencies'
import { useActiveTeam } from '@presentation/shared/hooks/use-active-team'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

// UI design §4.1 — exactly the three states the segmented control offers,
// 'presence' first (default at open, the state the mockup illustrates).
export type TeamStatsFilter = 'presence' | 'goals' | 'cards'

export function useTeamStatsViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { selectedCoachTeamId } = useActiveTeam()
  const { seasonRepository, sectionRepository, getCoachTeamsUseCase, getTeamStatsUseCase } = useCoachTeamStatsDependencies()

  const [filter, setFilter] = useState<TeamStatsFilter>('presence')

  const coachAssignment = user?.roles.find((assignment) => assignment.role === 'coach')
  const coachTeamIds = coachAssignment?.teamIds ?? []

  // AC-CTS-16 — "current_season() peut ne retourner aucune ligne" is its own
  // valid empty state, checked independently of `teamsQuery` below so it
  // stays distinguishable from "ce coach n'a simplement aucune équipe".
  const seasonQuery = useQuery({
    queryKey: queryKeys.seasonCurrent(),
    queryFn: () => seasonRepository.findCurrent(),
  })

  const teamsQuery = useQuery({
    queryKey: queryKeys.coachTeams(user?.id ?? ''),
    queryFn: () => getCoachTeamsUseCase.execute({ coachTeamIds }),
    enabled: !!user && coachTeamIds.length > 0,
  })

  // Same deterministic-but-arbitrary "first by array order" default as
  // useCoachDashboardViewModel, reusing the SAME ActiveTeamProvider selection
  // — PO-CTS-05 (coach affecté à deux équipes) is not re-decided here, this
  // screen just follows whichever team the coach already selected elsewhere.
  const currentTeamSummary = teamsQuery.data?.find((summary) => summary.team.id === selectedCoachTeamId) ?? teamsQuery.data?.[0]
  const currentTeam = currentTeamSummary?.team

  // AC-CTS-03/§2 — routing decision, made BEFORE the team-stats query below
  // even fires (`enabled` gates on it), never merely hiding the rendered
  // result of a query that ran anyway.
  const canViewTeamStats = usePermission('team_stats:view', { teamId: currentTeam?.id })

  const sectionQuery = useQuery({
    queryKey: queryKeys.section(currentTeam?.sectionId ?? ''),
    queryFn: () => sectionRepository.findById(currentTeam!.sectionId),
    enabled: !!currentTeam,
  })

  const teamStatsQuery = useQuery({
    queryKey: queryKeys.teamStats(currentTeam?.id ?? ''),
    queryFn: () => getTeamStatsUseCase.execute({ teamId: currentTeam!.id }),
    enabled: !!currentTeam && canViewTeamStats,
  })

  const roster = teamStatsQuery.data?.roster ?? []
  // Alphabetical by default; the 'goals' filter ranks by goals scored,
  // descending (alphabetical tie-break keeps the order stable). Sorted after
  // the map below because goalsCount is only known there.
  const rosterRows = [...roster]
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'))
    .map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      // AC-CTS-07 — no key in `byPlayer` means no AttendanceRecord at all
      // for this player over the period: `null` here, rendered as an
      // explicit "no data" state, never a 0%/absent-by-default.
      attendance: teamStatsQuery.data?.attendance.byPlayer[player.userId] ?? null,
      response: teamStatsQuery.data?.responses.byPlayer[player.userId] ?? null,
      // Missing from either map means zero — a real, legitimate value for a
      // COUNT (unlike the attendance rate above, "no goal recorded" and "no
      // AttendanceRecord recorded" are not the same kind of absence).
      goalsCount: teamStatsQuery.data?.goals.byPlayer[player.userId] ?? 0,
      cards: teamStatsQuery.data?.cards.byPlayer[player.userId] ?? { yellowCount: 0, redCount: 0 },
    }))
  if (filter === 'goals') rosterRows.sort((a, b) => b.goalsCount - a.goalsCount)

  return {
    isLoading: seasonQuery.isLoading || teamsQuery.isLoading || sectionQuery.isLoading || teamStatsQuery.isLoading,
    error: seasonQuery.error ?? teamsQuery.error ?? sectionQuery.error ?? teamStatsQuery.error,
    canViewTeamStats,

    // AC-CTS-16 — only meaningful once seasonQuery has actually resolved
    // (never while still loading/erroring).
    noCurrentSeason: seasonQuery.isSuccess && seasonQuery.data === null,
    seasonLabel: seasonQuery.data?.label,

    /// --- Team identification row (UI design §3) ---
    teamName: currentTeam?.name,
    sectionName: sectionQuery.data?.name,
    // AC-CTS-11 — the SAME team_active_headcount-backed count the
    // coach-dashboard header already shows, never a membership/payment read.
    activeMemberCount: currentTeamSummary?.activeMemberCount,

    /// --- Présence de l'équipe (agrégat, §4.3) ---
    teamAttendance: teamStatsQuery.data?.attendance.team,
    teamResponses: teamStatsQuery.data?.responses.team,

    /// --- Buts (agrégat d'équipe, §3, statique) ---
    teamGoals: teamStatsQuery.data?.goals.team,

    /// --- Cartons (agrégat d'équipe, §3, statique) ---
    teamCards: teamStatsQuery.data?.cards.team,

    /// --- Effectif (§4.1) ---
    filter,
    onFilterChange: setFilter,
    roster: rosterRows,

    goBack: () => navigate(-1),
  }
}
