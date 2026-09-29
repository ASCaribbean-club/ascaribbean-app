import type { AttendanceSummary } from '../entities/attendance-summary'
import type { ResponseSummary } from '../entities/response-summary'

// specs/player-stats.md AC-PS-16/AC-PS-17 — the two rates are computed by
// two SEPARATE pure functions, never merged into one "presence %" helper:
// CLAUDE.md §6 requires AttendanceRecord and ConvocationResponse to stay
// distinct entities, and that separation has to survive all the way into
// the rate computation, not just the entity layer (AC-PS-01).
//
// Both return a ratio in [0, 1], never a 0-100 value — rounding/formatting
// as a percentage ("75 %") is a presentation concern (the ViewModel/
// component's job), not this policy's. Both return `null`, never `NaN` and
// never `0`, when their denominator is zero (AC-PS-17): a team with no
// validated session yet, or no past convocation yet, has "no data", not a
// 0% result — presentation renders that as an explicit "pas encore de
// données" state (§4.1/§4.2 of the spec's UI design), never a bare 0%.

// AC-PS-01 — computed EXCLUSIVELY from AttendanceRecord-sourced counts
// (validatedCount/presentCount), never from ConvocationResponse.
export function attendanceRate(summary: AttendanceSummary): number | null {
  if (summary.validatedCount === 0) return null
  return summary.presentCount / summary.validatedCount
}

// AC-PS-01 — computed EXCLUSIVELY from ConvocationResponse-sourced counts
// (convocatedCount/respondedCount), never from AttendanceRecord.
export function responseRate(summary: ResponseSummary): number | null {
  if (summary.convocatedCount === 0) return null
  return summary.respondedCount / summary.convocatedCount
}
