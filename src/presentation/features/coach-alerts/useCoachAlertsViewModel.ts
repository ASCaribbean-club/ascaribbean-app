import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { ConvocationType } from '@domain/entities/convocation'
import { useCoachAlertsDependencies } from '@presentation/di/hooks/use-coach-alerts-dependencies'
import { useCoachDashboardDependencies } from '@presentation/di/hooks/use-coach-dashboard-dependencies'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useActiveTeam } from '@presentation/shared/hooks/use-active-team'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/coach-alerts.md §2/§6 — gate on `activeRole` FIRST (AC-AL-05: a
// player-active multi-role account reaching /alerts by direct URL must fire
// ZERO data request), then compose the two ALREADY team-scoped actions
// (PO-AL-02 resolved — no new 'alerts:view' entry in rbac-matrix.ts/can.ts,
// AC-AL-04). `useQuery`'s `queryFn` calls the use case; the use case itself
// is a plain async function with no React/Supabase import (CLAUDE.md §6) —
// this hook is the ONLY place `useQuery` appears for this feature.
export function useCoachAlertsViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { activeRole } = useActiveRole()
  const { selectedCoachTeamId } = useActiveTeam()
  const { listCoachAlertsUseCase } = useCoachAlertsDependencies()
  // Reused, not duplicated — same "resolve the coach's active team" read
  // already shared by useCoachDashboardViewModel/useTeamStatsViewModel
  // (queryKeys.coachTeams(user.id), same cache entry), same reuse
  // usePlayerStatsViewModel already makes of this container for the
  // symmetric case.
  const { getCoachTeamsUseCase } = useCoachDashboardDependencies()

  const isCoach = activeRole === 'coach'

  const coachAssignment = user?.roles.find((assignment) => assignment.role === 'coach')
  const coachTeamIds = coachAssignment?.role === 'coach' ? coachAssignment.teamIds : []

  const teamsQuery = useQuery({
    queryKey: queryKeys.coachTeams(user?.id ?? ''),
    queryFn: () => getCoachTeamsUseCase.execute({ coachTeamIds }),
    // AC-AL-05 — disabled entirely for a non-coach active role, not merely
    // hiding the rendered result of a query that ran anyway.
    enabled: isCoach && !!user && coachTeamIds.length > 0,
  })

  // Same deterministic-but-arbitrary "first team by array order" default as
  // useCoachDashboardViewModel/useTeamStatsViewModel — PO-AL-01 (équipe
  // active seule, résolu) follows the SAME ActiveTeamProvider selection as
  // every other coach screen, never a selector of its own (AC-AL-20).
  const currentTeamSummary = teamsQuery.data?.find((summary) => summary.team.id === selectedCoachTeamId) ?? teamsQuery.data?.[0]
  const currentTeam = currentTeamSummary?.team

  // §2 — composition of two already-scoped actions, not a new matrix entry
  // (PO-AL-02 résolu): `activeRole === 'coach' && (can('attendance:validate', ...) || can('match_result:record', ...))`.
  const canValidateAttendance = usePermission('attendance:validate', { teamId: currentTeam?.id })
  const canRecordMatchResult = usePermission('match_result:record', { teamId: currentTeam?.id })
  const canViewAlerts = isCoach && (canValidateAttendance || canRecordMatchResult)

  const alertsQuery = useQuery({
    queryKey: queryKeys.coachAlerts(currentTeam?.id ?? ''),
    queryFn: () => listCoachAlertsUseCase.execute({ teamId: currentTeam!.id, now: new Date() }),
    enabled: !!currentTeam && canViewAlerts,
  })

  const items = alertsQuery.data ?? []

  // Développeuse, 2026-09-30 — type filter chips, local UI state only (same
  // "no data-filtering logic" reasoning as TeamStatsFilterSegment's own
  // comment: every alert is already loaded, this only changes which of the
  // ALREADY-FETCHED items get rendered). Empty selection = no filter = show
  // every type, never an accidentally-empty list at first render.
  const [selectedTypes, setSelectedTypes] = useState<ConvocationType[]>([])
  function onToggleType(type: ConvocationType) {
    setSelectedTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]))
  }
  const filteredItems = selectedTypes.length === 0 ? items : items.filter((item) => selectedTypes.includes(item.convocation.type))

  // Développeuse, 2026-09-30 — per-type count for the filter chips, same
  // "hide at 0" convention as the page title's "(N)" (totalCount below).
  // Deliberately counted off the UNFILTERED `items`, not `filteredItems`:
  // a chip's own count must stay stable while OTHER chips are toggled, not
  // shrink to 0 the moment a different type gets selected.
  const countByType: Record<ConvocationType, number> = { training: 0, match: 0, meeting: 0 }
  for (const item of items) countByType[item.convocation.type]++

  return {
    // AC-AL-05 — checked FIRST in CoachAlertsPage, before isLoading/error:
    // true synchronously from ActiveRoleContext, never depends on any query
    // result having settled.
    isWrongRole: !isCoach,

    isLoading: teamsQuery.isLoading || alertsQuery.isLoading,
    error: teamsQuery.error ?? alertsQuery.error,

    // AC-AL-16 — only meaningful once teamsQuery has genuinely settled
    // (never while still loading/erroring, distinct from the "no alerts"
    // success state below).
    noActiveTeam: isCoach && teamsQuery.isSuccess && !currentTeam,

    // AC-AL-16 — the nominal "up to date" success case, distinct from
    // noActiveTeam/error/loading above. Deliberately reads the UNFILTERED
    // `items`, not `filteredItems`: "tout est à jour" must only ever mean
    // there is truly nothing left to do, never "nothing matches the
    // currently selected type filter" (that's `isFilteredEmpty` below).
    isEmpty: alertsQuery.isSuccess && items.length === 0,
    // A real backlog exists, but the active type filter hides all of it —
    // a distinct message from isEmpty's positive "all caught up" case.
    isFilteredEmpty: alertsQuery.isSuccess && items.length > 0 && filteredItems.length === 0,

    // Total backlog size, unaffected by the type filter — what the page
    // title's "(N)" and CoachHeader's badge both mean; filtering is a
    // local view convenience, not a change to how many alerts exist.
    totalCount: items.length,

    // Type filter chips — local UI state, see above.
    selectedTypes,
    onToggleType,
    countByType,

    // AC-AL-01/AC-AL-09/AC-AL-20 — every field here already comes straight
    // off ListCoachAlertsUseCase's CoachAlertItem; CoachAlertsPage only
    // renders it, never re-derives a signal.
    items: filteredItems.map((item) => ({
      convocation: item.convocation,
      opponent: item.opponent,
      meetingPointTime: item.convocation.type === 'match' ? (item.matchDetails?.meetingPointTime ?? null) : null,
      attendanceConfirmationMissing: item.attendanceConfirmationMissing,
      matchScoreMissing: item.matchScoreMissing,
      goalAttributionMissing: item.goalAttributionMissing,
      attributedGoalCount: item.attributedGoalCount,
      goalsFor: item.matchDetails?.goalsFor ?? null,
    })),

    // AC-AL-03 — the existing route, never duplicated content.
    goToConvocationDetail: (convocationId: string) => navigate(`/convocations/${convocationId}`),

    goBack: () => navigate(-1),
  }
}
