import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { attendanceRate, responseRate } from '@domain/policies/player-stats-rates'
import { usePlayerStatsDependencies } from '@presentation/di/hooks/use-player-stats-dependencies'
import { formatConvocationType } from '@presentation/shared/formatters/convocation-labels'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import type { PlayerStatsCardsCardStatus } from './components/PlayerStatsCardsCard'
import type { PlayerStatsGoalsCardStatus } from './components/PlayerStatsGoalsCard'
import type { PlayerStatsRateCardStatus } from './components/PlayerStatsRateCard'

// specs/player-stats.md §6.3, UI design §4.2 — INDEPENDENT useQuery calls
// (attendance, attendance-by-type, response, goals, cards), never combined
// into one. This is what lets the response card render "available" while
// the attendance card is still "unavailable" (zero-denominator) or still
// loading — a single combined query couldn't express that (CLAUDE.md §6,
// ViewModel does the work, queryFn calls a use case, never useQuery inside a
// use case itself).
export function usePlayerStatsViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    getOwnAttendanceSummaryUseCase,
    getOwnAttendanceSummaryByTypeUseCase,
    getOwnResponseSummaryUseCase,
    getOwnGoalsCountUseCase,
    getOwnCardsCountUseCase,
  } = usePlayerStatsDependencies()

  const attendanceQuery = useQuery({
    queryKey: queryKeys.playerStatsAttendanceSummary(user?.id ?? ''),
    queryFn: () => getOwnAttendanceSummaryUseCase.execute(),
    enabled: !!user,
  })

  // Addendum "troisième passage" (PO-PS-12 partiellement tranché) —
  // attendance-only breakdown by type, its own independent query: the
  // sub-block can still be "loading" a beat after the global attendance
  // card itself has settled, and that's fine — it renders inside the same
  // card once ready, never blocking the card's own headline percent.
  const attendanceByTypeQuery = useQuery({
    queryKey: queryKeys.playerStatsAttendanceSummaryByType(user?.id ?? ''),
    queryFn: () => getOwnAttendanceSummaryByTypeUseCase.execute(),
    enabled: !!user,
  })

  const responseQuery = useQuery({
    queryKey: queryKeys.playerStatsResponseSummary(user?.id ?? ''),
    queryFn: () => getOwnResponseSummaryUseCase.execute(),
    enabled: !!user,
  })

  const goalsQuery = useQuery({
    queryKey: queryKeys.playerStatsGoalsCount(user?.id ?? ''),
    queryFn: () => getOwnGoalsCountUseCase.execute(),
    enabled: !!user,
  })

  // Addendum "PO-PS-03 tranché" — own yellow/red cards, its own independent
  // query, same "never block a sibling card" reasoning as the others.
  const cardsQuery = useQuery({
    queryKey: queryKeys.playerStatsCardsCount(user?.id ?? ''),
    queryFn: () => getOwnCardsCountUseCase.execute(),
    enabled: !!user,
  })

  // AC-PS-17 — attendanceRate/responseRate return `null` on a zero
  // denominator, never NaN/0/100%. Percent is rounded here, in
  // presentation — the domain policy stays a plain [0,1] ratio, formatting
  // as "75 %" is a rendering concern, not a business rule.
  const attendanceRatio = attendanceQuery.data ? attendanceRate(attendanceQuery.data) : null
  const responseRatio = responseQuery.data ? responseRate(responseQuery.data) : null

  const attendanceStatus: PlayerStatsRateCardStatus = attendanceQuery.isError
    ? 'error'
    : attendanceQuery.data === undefined
      ? 'loading'
      : attendanceRatio === null
        ? 'unavailable'
        : 'available'

  const responseStatus: PlayerStatsRateCardStatus = responseQuery.isError
    ? 'error'
    : responseQuery.data === undefined
      ? 'loading'
      : responseRatio === null
        ? 'unavailable'
        : 'available'

  const goalsStatus: PlayerStatsGoalsCardStatus = goalsQuery.isError ? 'error' : goalsQuery.data === undefined ? 'loading' : 'available'

  const cardsStatus: PlayerStatsCardsCardStatus = cardsQuery.isError ? 'error' : cardsQuery.data === undefined ? 'loading' : 'available'

  // UI design §4.1 (AC-PS-11) — the full-screen empty state replaces cards
  // 3-5 ENTIRELY, only once every one of the FOUR reads has genuinely
  // settled successfully (never while still loading, and never on a real
  // fetch failure — an error renders on its own card instead, see
  // PlayerStatsPage.tsx, so this never produces a false "nothing to show"
  // over what's actually a network/RLS failure). Extended to include the
  // cards query (addendum "PO-PS-03 tranché") the same way it was already
  // extended to include goals: a player with a recorded card, even with
  // both rates still at their zero-denominator sub-state, clearly has
  // season activity and must not see the "nothing to show yet" copy.
  const allSettled = attendanceQuery.isSuccess && responseQuery.isSuccess && goalsQuery.isSuccess && cardsQuery.isSuccess
  const isFullyEmpty =
    allSettled &&
    attendanceRatio === null &&
    responseRatio === null &&
    goalsQuery.data === 0 &&
    cardsQuery.data?.yellowCount === 0 &&
    cardsQuery.data?.redCount === 0

  return {
    isFullyEmpty,

    responseCard: {
      status: responseStatus,
      percent: responseRatio !== null ? Math.round(responseRatio * 100) : null,
      numerator: responseQuery.data?.respondedCount ?? 0,
      denominator: responseQuery.data?.convocatedCount ?? 0,
    },
    attendanceCard: {
      status: attendanceStatus,
      percent: attendanceRatio !== null ? Math.round(attendanceRatio * 100) : null,
      numerator: attendanceQuery.data?.presentCount ?? 0,
      denominator: attendanceQuery.data?.validatedCount ?? 0,
      // Addendum "troisième passage" — one row per type WITH at least one
      // validated session (AC-PS-26/27); an empty array (still loading, or
      // genuinely no breakdown yet) renders no sub-block at all, never a
      // placeholder row per type.
      breakdown: (attendanceByTypeQuery.data ?? []).map((row) => ({
        label: formatConvocationType(row.type),
        numerator: row.presentCount,
        denominator: row.validatedCount,
      })),
    },
    goalsCard: {
      status: goalsStatus,
      count: goalsQuery.data ?? null,
    },
    cardsCard: {
      status: cardsStatus,
      yellowCount: cardsQuery.data?.yellowCount ?? null,
      redCount: cardsQuery.data?.redCount ?? null,
    },

    // specs/player-stats.md UI design §1 — pushed route from Menu, back
    // arrow only (no `navigate('/menu')` hardcoded — same
    // "BackHeader + navigate(-1)" pattern as useProfileViewModel.goBack).
    goBack: () => navigate(-1),
  }
}
