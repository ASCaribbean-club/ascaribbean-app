import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { LeaderboardEntry, LeaderboardMetric } from '@domain/entities/leaderboard'
import { useLeaderboardDependencies } from '@presentation/di/hooks/use-leaderboard-dependencies'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useActiveTeam } from '@presentation/shared/hooks/use-active-team'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { useOfficerTeamSelection } from '@presentation/shared/hooks/use-officer-team-selection'
import { queryKeys } from '@presentation/shared/query-keys'

export interface LeaderboardCounter {
  metric: LeaderboardMetric
  count: number
  // sr-only text, e.g. "2 jaunes" — the colored dot alone means nothing to a
  // screen reader (AC-LB-17).
  label: string
}

// The three counter tabs plus the presence tab (its own read, own row shape).
export type LeaderboardTab = LeaderboardMetric | 'presence'

export interface PresenceRowModel {
  userId: string
  rank: number
  displayName: string
  presentCount: number
  isMuted: boolean
  isOwn: boolean
  // "80 % de présence" / "—" — text, never color alone.
  attendanceLabel: string
  // Whole percent, null when no convocation has started yet.
  responseRate: number | null
  responseLabel: string
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
  const { activeRole, isOfficerView } = useActiveRole()
  const { selectedCoachTeamId } = useActiveTeam()
  const { seasonRepository, getCoachTeamsUseCase, getTeamLeaderboardUseCase, getTeamPresenceLeaderboardUseCase } = useLeaderboardDependencies()

  const [tab, setTab] = useState<LeaderboardTab>('goals')
  // Dirigeant habilité: section then team, in a collapsible panel that is open
  // by default for them (it is how they pick a team). Not persisted.
  const officer = useOfficerTeamSelection(isOfficerView)
  const [areFiltersVisible, setAreFiltersVisible] = useState(isOfficerView)
  const isPresenceTab = tab === 'presence'
  // Counter tabs keep their metric; on the presence tab the (unused) counter
  // list falls back to goals so one query result serves every counter tab.
  const metric: LeaderboardMetric = isPresenceTab ? 'goals' : tab

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
    enabled: !!user && !isPlayerView && !isOfficerView && coachTeamIds.length > 0,
  })
  const currentCoachTeam = coachTeamsQuery.data?.find((summary) => summary.team.id === selectedCoachTeamId) ?? coachTeamsQuery.data?.[0]

  const teamId = isOfficerView ? officer.teamId : isPlayerView ? playerTeamId : currentCoachTeam?.team.id

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

  // Fetched only when the presence tab is opened (UI: one extra request, once).
  const presenceQuery = useQuery({
    queryKey: queryKeys.teamPresenceLeaderboard(teamId ?? ''),
    queryFn: () => getTeamPresenceLeaderboardUseCase.execute({ teamId: teamId! }),
    enabled: isPresenceTab && !!teamId && seasonQuery.isSuccess && !noCurrentSeason,
  })

  // "No team" is only meaningful once the coach-teams query settled (or was
  // never needed): never flashed while it is still loading.
  const noTeam = !isOfficerView && !teamId && !coachTeamsQuery.isLoading && !seasonQuery.isLoading
  // Officer with no team chosen yet: prompt instead of an empty state.
  const needsTeamSelection = isOfficerView && !officer.teamId

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

  const presenceRows: PresenceRowModel[] = (presenceQuery.data ?? []).map((entry) => ({
    userId: entry.userId,
    rank: entry.rank,
    displayName: entry.displayName,
    presentCount: entry.value,
    isMuted: entry.isMuted,
    isOwn: isPlayerView && entry.userId === user?.id,
    attendanceLabel: entry.attendanceRate === null ? '—' : `${entry.attendanceRate} % de présence`,
    responseRate: entry.responseRate,
    responseLabel: entry.responseRate === null ? 'Réponses : —' : `Réponses : ${entry.responseRate} %`,
  }))

  const ownRow = rows.find((row) => row.isOwn)
  // AC-LB-07 — the bar always shows a rank (zero players are ranked), player
  // view only.
  const youBar = ownRow ? { rank: ownRow.rank, displayName: ownRow.displayName, value: ownRow.value, userId: ownRow.userId } : null

  const isLoading =
    seasonQuery.isLoading || coachTeamsQuery.isLoading || leaderboardQuery.isLoading || (isPresenceTab && presenceQuery.isLoading)
  const error = seasonQuery.error ?? coachTeamsQuery.error ?? leaderboardQuery.error ?? (isPresenceTab ? presenceQuery.error : null)

  return {
    isLoading,
    error,
    refetch: () => {
      void seasonQuery.refetch()
      void coachTeamsQuery.refetch()
      void leaderboardQuery.refetch()
      if (isPresenceTab) void presenceQuery.refetch()
    },
    noTeam,
    needsTeamSelection,
    noCurrentSeason,

    // Dirigeant section -> team filters (booleans/lists only).
    isOfficerView,
    areFiltersVisible,
    toggleFilters: () => setAreFiltersVisible((current) => !current),
    filtersSummary: [officer.selectedSectionName, officer.selectedTeamName].filter((part): part is string => part !== null).join(' · '),
    sections: officer.sections,
    areSectionsLoading: officer.areSectionsLoading,
    selectedSectionId: officer.selectedSectionId,
    onSelectSection: officer.onSelectSection,
    teamOptions: officer.teamOptions,
    selectedTeamId: officer.teamId ?? null,
    onSelectTeam: officer.onSelectTeam,

    isRosterEmpty: leaderboardQuery.isSuccess && (leaderboardQuery.data?.goals.length ?? 0) === 0,

    tab,
    onTabChange: setTab,
    isPresenceTab,
    metric,
    rows,
    presenceRows,
    isPresenceTabAllZero: presenceRows.length > 0 && presenceRows.every((row) => row.presentCount === 0),
    // UI design §6 — "Aucun match joué" hint: every value of the active tab is 0.
    isActiveTabAllZero: rows.length > 0 && rows.every((row) => row.value === 0),

    showOwnRowEmphasis: isPlayerView,
    // The presence tab has no YouBar: its own row is emphasized in place.
    youBar: isPresenceTab ? null : youBar,
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
