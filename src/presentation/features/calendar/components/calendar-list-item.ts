import type { Convocation } from '@domain/entities/convocation'
import type { MatchDetails } from '@domain/entities/match-details'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { Opponent } from '@domain/entities/opponent'
import type { MatchOutcome } from '@domain/policies/match-outcome-rules'
import type { CalendarResponseBlock } from './calendar-response-block'

// Développeuse, 2026-09-30 — the recorded score of a PAST match, resolved
// once here rather than re-derived by the row component (ARCHITECTURE.md
// §6: ViewModel does the work). `null` covers every case where no result
// should render: not a match, not past yet, or the score just isn't
// recorded yet (AC-MS-15) — the row component only ever asks "is there a
// result to show", never why not.
export interface CalendarMatchResult {
  outcome: MatchOutcome
  goalsFor: number
  goalsAgainst: number
}

// The normalized shape CalendarConvocationList/CalendarConvocationRow
// render, regardless of whether it originated from
// ListTeamConvocationsUseCase's ConvocationForCoach (coach — carries
// `responseCounts`) or ListUConvocationsForPlayerUseCase's
// ConvocationForPlayer (player — carries `myResponse`). Folding the
// role difference into `responseBlock` here, once, in
// useCalendarViewModel, is what keeps the row component itself role-
// agnostic (§2 "Variantes de rendu par rôle" is a ViewModel concern).
export interface CalendarListItem {
  convocation: Convocation
  matchDetails: MatchDetails | null
  opponent: Opponent | null
  meetingDetails: MeetingDetails | null
  responseBlock: CalendarResponseBlock
  matchResult: CalendarMatchResult | null
  // Développeuse, 2026-09-30 — AC-CA-16 override (see specs/calendar.md's
  // own dated note): coach-only, always `false` for a player item — same
  // "opposite of Clôturée" signal as ConvocationHero's own
  // attendanceConfirmationMissing, computed the same way (past + still
  // `open`).
  attendanceConfirmationMissing: boolean
}
