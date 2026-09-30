// specs/coach-alerts.md §1 "Les trois signaux — repris tels quels, jamais
// redérivés" — this file does NOT redefine any of the three conditions: it
// composes rules that already exist elsewhere (`isPastDate`,
// `isMatchResultRecordable`), and states the two boundary rules the spec
// requires to be written EXPLICITLY rather than merely inherited
// (AC-AL-06 — a cancelled convocation is never an alert for B/C;
// AC-AL-08 — `goalsFor === 0` is never an alert for C).
import type { Convocation } from '../entities/convocation'
import type { MatchDetails } from '../entities/match-details'
import { isPastDate } from '../rules/convocation-rules'
import { isMatchResultRecordable } from './match-result-timing-rules'

// Signal A — specs/coach-alerts.md §1 table row A / AC-AL-01. Every type
// (training/match/meeting): a past convocation still `open` means the
// `attendance_records_close_convocation` DB trigger never fired, i.e. at
// least one attendance record is missing. `status === 'open'` already
// excludes `cancelled` by construction (AC-AL-06's first sentence) — no
// separate cancellation check needed here.
export function missingAttendanceConfirmation(convocation: Convocation, now: Date): boolean {
  return convocation.status === 'open' && isPastDate(convocation.date, now)
}

// Signal B — specs/coach-alerts.md §1 table row B / AC-AL-01/AC-AL-06/
// AC-AL-07. `cancelled` is excluded EXPLICITLY here (AC-AL-06 — never just
// inherited, unlike signal A), and `closed` is deliberately NOT excluded
// (AC-AL-07 — "closed" only means attendance is fully constated, a match can
// still have no recorded score). `matchDetails === null` is treated the same
// as `goalsFor === null` (score genuinely missing) — a `match` convocation
// without its satellite row yet is exactly the "no score recorded" case this
// signal exists to catch.
export function missingMatchScore(convocation: Convocation, matchDetails: MatchDetails | null, now: Date): boolean {
  if (convocation.type !== 'match') return false
  if (convocation.status === 'cancelled') return false
  if (!isMatchResultRecordable(new Date(convocation.date), now)) return false
  return matchDetails === null || matchDetails.goalsFor === null
}

// Signal C — specs/coach-alerts.md §1 table row C / AC-AL-01/AC-AL-06/
// AC-AL-07/AC-AL-08. Same explicit `cancelled` exclusion as signal B.
// `goalsFor === 0` is never an alert (AC-AL-08 — `noGoalsToAttribute` in
// MatchResultScorerPicker.tsx, a team that scored nothing has structurally
// no scorer to attribute). The comparison itself is deliberately NOT
// `isScorerCountConsistent` (`domain/policies/match-outcome-rules.ts`) —
// that predicate only guards the invariant "never more goal events than
// goalsFor" (always true on valid data, mirrored by a DB CHECK constraint);
// "incomplete" is the strictly-less-than case this signal needs
// (`attributedCount < goalsFor`), the exact complement of `allGoalsAttributed`
// already distinguished in MatchResultScorerPicker.tsx.
export function missingGoalAttribution(convocation: Convocation, matchDetails: MatchDetails | null, attributedGoalCount: number): boolean {
  if (convocation.type !== 'match') return false
  if (convocation.status === 'cancelled') return false
  if (matchDetails === null || matchDetails.goalsFor === null) return false
  if (matchDetails.goalsFor === 0) return false
  return attributedGoalCount < matchDetails.goalsFor
}

export interface CoachAlertActions {
  attendanceConfirmationMissing: boolean
  matchScoreMissing: boolean
  goalAttributionMissing: boolean
}

// §1 point 4 / AC-AL-08 — a convocation cumulating several signals is meant
// to produce ONE row carrying several missing actions: this function returns
// all three booleans together so the use case can attach them to a single
// item per convocation, never one item per signal. B and C are structurally
// exclusive (B requires `goalsFor === null`, C requires `goalsFor !== null`),
// so at most two of the three booleans are ever true together (A + B, or
// A + C) — never all three.
export function getCoachAlertActions(convocation: Convocation, matchDetails: MatchDetails | null, attributedGoalCount: number, now: Date): CoachAlertActions {
  return {
    attendanceConfirmationMissing: missingAttendanceConfirmation(convocation, now),
    matchScoreMissing: missingMatchScore(convocation, matchDetails, now),
    goalAttributionMissing: missingGoalAttribution(convocation, matchDetails, attributedGoalCount),
  }
}

export function hasAnyMissingCoachAction(actions: CoachAlertActions): boolean {
  return actions.attendanceConfirmationMissing || actions.matchScoreMissing || actions.goalAttributionMissing
}
