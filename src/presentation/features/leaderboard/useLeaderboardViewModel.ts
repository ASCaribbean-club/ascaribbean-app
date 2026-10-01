import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { LeaderboardEntry, LeaderboardMetric } from '@domain/entities/leaderboard'
import { useLeaderboardDependencies } from '@presentation/di/hooks/use-leaderboard-dependencies'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useActiveTeam } from '@presentation/shared/hooks/use-active-team'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export interface LeaderboardCounter {
  metric: LeaderboardMetric
  count: number
  // sr-only text, e.g. "2 jaunes" — the colored dot alone means nothing to a
  // screen reader (AC-LB-17).
  label: string
}

export interface LeaderboardRowModel {
  userId: string
  rank: number
  displayName: string
  value: number
  isMuted: boolean
  isOwn: boolean
  counters: LeaderboardCounter[]
}

const METRIC_ORDER: LeaderboardMetric[] = ['goals', 'yellow', 'red']

function counterLabel(metric: LeaderboardMetric, count: number): string {
  const plural = count > 1
  if (metric === 'goals') return `${count} but${plural ? 's' : ''}`
  if (metric === 'yellow') return `${count} jaune${plural ? 's' : ''}`
  return `${count} rouge${plural ? 's' : ''}`
}

function countOf(entry: LeaderboardEntry, metric: LeaderboardMetric): number {
  if (metric === 'goals') return entry.goalsCount
  if (metric === 'yellow') return entry.yellowCount
  return entry.redCount
}

export function ownRowElementId(userId: string): string {
  return `leaderboard-row-${userId}`
}

// specs/mobile-leaderboard.md — the ViewModel resolves the team (never the
// component), reads ONE query for the three tabs, and derives everything the
// Page renders. Team resolution mirrors the other stats screens: coach =
// ActiveTeamProvider selection else first of their teams (shared
// getCoachTeamsUseCase/coachTeams cache), player = their single team.
export function useLeaderboardViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { activeRole } = useActiveRole()
  const { selectedCoachTeamId } = useActiveTeam()
  const { seasonRepository, getCoachTeamsUseCase, getTeamLeaderboardUseCase } = useLeaderboardDependencies()

  const [metric, setMetric] = useState<LeaderboardMetric>('goals')

  // PO-LB-06 / UI design §5 — a presentation variant keyed on the ACTIVE role
  // (a coach+player account in coach mode gets no emphasis). Not an
  // authorization: no can() entry, the database function is the boundary.
  const isPlayerView = activeRole === 'player'

  const playerAssignment = user?.roles.find((assignment) => assignment.role === 'player')
  const playerTeamId = playerAssignment?.role === 'player' ? playerAssignment.teamId : undefined

  const coachAssignment = user?.roles.find((assignment) => assignment.role === 'coach')
  const coachTeamIds = coachAssignment?.role === 'coach' ? coachAssignment.teamIds : []

  const coachTeamsQuery = useQuery({
    queryKey: queryKeys.coachTeams(user?.id ?? ''),
    queryFn: () => getCoachTeamsUseCase.execute({ coachTeamIds }),
    enabled: !!user && !isPlayerView && coachTeamIds.length > 0,
  })
  const currentCoachTeam = coachTeamsQuery.data?.find((summary) => summary.team.id === selectedCoachTeamId) ?? coachTeamsQuery.data?.[0]

  const teamId = isPlayerView ? playerTeamId : currentCoachTeam?.team.id

  const seasonQuery = useQuery({
    queryKey: queryKeys.seasonCurrent(),
    queryFn: () => seasonRepository.findCurrent(),
  })
  const noCurrentSeason = seasonQuery.isSuccess && seasonQuery.data === null

  const leaderboardQuery = useQuery({
    queryKey: queryKeys.teamLeaderboard(teamId ?? ''),
    queryFn: () => getTeamLeaderboardUseCase.execute({ teamId: teamId! }),
    enabled: !!teamId && seasonQuery.isSuccess && !noCurrentSeason,
  })

  // "No team" is only meaningful once the coach-teams query settled (or was
  // never needed): never flashed while it is still loading.
  const noTeam = !teamId && !coachTeamsQuery.isLoading && !seasonQuery.isLoading

  const entries = leaderboardQuery.data?.[metric] ?? []
  const rows: LeaderboardRowModel[] = entries.map((entry) => ({
    userId: entry.userId,
    rank: entry.rank,
    displayName: entry.displayName,
    value: entry.value,
    isMuted: entry.isMuted,
    isOwn: isPlayerView && entry.userId === user?.id,
    counters: METRIC_ORDER.filter((other) => other !== metric).map((other) => ({
      metric: other,
      count: countOf(entry, other),
      label: counterLabel(other, countOf(entry, other)),
    })),
  }))

  const ownRow = rows.find((row) => row.isOwn)
  // AC-LB-07 — the bar always shows a rank (zero players are ranked), player
  // view only.
  const youBar = ownRow ? { rank: ownRow.rank, displayName: ownRow.displayName, value: ownRow.value, userId: ownRow.userId } : null

  const isLoading = seasonQuery.isLoading || coachTeamsQuery.isLoading || leaderboardQuery.isLoading
  const error = seasonQuery.error ?? coachTeamsQuery.error ?? leaderboardQuery.error

  return {
    isLoading,
    error,
    refetch: () => {
      void seasonQuery.refetch()
      void coachTeamsQuery.refetch()
      void leaderboardQuery.refetch()
    },
    noTeam,
    noCurrentSeason,
    isRosterEmpty: leaderboardQuery.isSuccess && (leaderboardQuery.data?.goals.length ?? 0) === 0,

    metric,
    onMetricChange: setMetric,
    rows,
    // UI design §6 — "Aucun match joué" hint: every value of the active tab is 0.
    isActiveTabAllZero: rows.length > 0 && rows.every((row) => row.value === 0),

    showOwnRowEmphasis: isPlayerView,
    youBar,
    scrollToOwnRow: () => {
      if (!youBar) return
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      document.getElementById(ownRowElementId(youBar.userId))?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'center',
      })
    },

    goBack: () => navigate(-1),
  }
}
