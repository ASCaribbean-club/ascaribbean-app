import type { AttendanceRecord } from '../entities/convocation'
import type { MatchEvent } from '../entities/match-event'

// specs/coach-team-stats.md — pure aggregation rules for the team-stats
// screen (Présence/Buts/Cartons), same "domain/policies/match-*-rules.ts"
// precedent as match-stats.md: plain arithmetic on rows already scoped by
// RLS one layer up (GetTeamStatsUseCase), no React, no Supabase, no I/O.

export interface AttendanceTally {
  presentCount: number
  totalCount: number
}

// AC-CTS-06 — built EXCLUSIVELY from AttendanceRecord (fait constaté par le
// coach), never from ConvocationResponse (intention déclarée) — the two
// entities are never merged (CLAUDE.md §6). AC-CTS-10 — `absenceValidity`
// and `note` are never read off `record`: this function's own return shape
// has no field for either, so there is nothing to accidentally surface.
//
// ⚠️ PO-CTS-04 ("quel est le dénominateur de l'assiduité ?") is deliberately
// NOT resolved here — none of its four sub-questions (which convocations
// count, which reference headcount, how an unrecorded player counts,
// whether a cancelled/unclosed convocation counts) is answered by this
// function. `totalCount` is simply the number of AttendanceRecord rows that
// actually exist (present + absent) for whatever set of records the caller
// passes in — never a roster-derived "expected attendees" figure. See
// GetTeamStatsUseCase's own comment for why the mockup's "15,2 / 18 en
// moyenne par séance" figure is deliberately NOT built on top of this: that
// figure needs a reference headcount PO-CTS-04(b) leaves open, this tally
// doesn't need one.
export function tallyAttendance(records: AttendanceRecord[]): AttendanceTally {
  const presentCount = records.filter((record) => record.actualStatus === 'present').length
  return { presentCount, totalCount: records.length }
}

// AC-CTS-16/AC-CTS-17 — `null` (never `0`) when nothing was ever recorded:
// "aucune séance constatée" is a distinct, valid empty state, not a
// fabricated 0%. A real 0% (every recorded session was an absence) is a
// different, legitimate value and must stay distinguishable from "no data".
export function attendanceRate(tally: AttendanceTally): number | null {
  if (tally.totalCount === 0) return null
  return Math.round((tally.presentCount / tally.totalCount) * 100)
}

// AC-CTS-07 — a player with no AttendanceRecord row at all simply has no key
// in this map. The roster list itself comes from TeamRosterRepository, never
// from this map's keys, so that player still appears on screen — the
// ViewModel/component is responsible for rendering an explicit "no data"
// state for a missing key, never a 0%/absent-by-default (same rule as
// AC-AT-12).
export function tallyAttendanceByPlayer(records: AttendanceRecord[]): Record<string, AttendanceTally> {
  const byPlayer: Record<string, AttendanceTally> = {}
  for (const record of records) {
    const tally = byPlayer[record.userId] ?? { presentCount: 0, totalCount: 0 }
    tally.totalCount += 1
    if (record.actualStatus === 'present') tally.presentCount += 1
    byPlayer[record.userId] = tally
  }
  return byPlayer
}

export interface CardTally {
  yellowCount: number
  redCount: number
}

// AC-CTS-04/§1 — reads match_events rows already scoped by RLS
// (match_events_select_scoped's whitelist-on-'goal' branch), never a new
// aggregate view/RPC. `penalty_missed` is deliberately excluded (§1, "ni
// compté, ni affiché dans cette passe").
export function tallyGoalsByPlayer(events: MatchEvent[]): Record<string, number> {
  const byPlayer: Record<string, number> = {}
  for (const event of events) {
    if (event.eventType !== 'goal') continue
    byPlayer[event.userId] = (byPlayer[event.userId] ?? 0) + 1
  }
  return byPlayer
}

// Staff-only by construction (§1/§3 — the events themselves are only ever
// readable by a coach/staff token, per match_events_select_scoped's second
// branch; this function doesn't re-derive that boundary, it just tallies
// whatever rows the repository actually returned).
export function tallyCardsByPlayer(events: MatchEvent[]): Record<string, CardTally> {
  const byPlayer: Record<string, CardTally> = {}
  for (const event of events) {
    if (event.eventType !== 'yellow_card' && event.eventType !== 'red_card') continue
    const tally = byPlayer[event.userId] ?? { yellowCount: 0, redCount: 0 }
    if (event.eventType === 'yellow_card') tally.yellowCount += 1
    else tally.redCount += 1
    byPlayer[event.userId] = tally
  }
  return byPlayer
}

// UI design §3, "Bloc Cartons" — team-wide total, two counters side by side.
// Summed directly from `events` rather than by adding up
// tallyCardsByPlayer's own output, so a card event whose userId doesn't
// resolve to a current roster entry (e.g. a player who has since left the
// team) still counts toward the team total.
export function tallyTeamCards(events: MatchEvent[]): CardTally {
  let yellowCount = 0
  let redCount = 0
  for (const event of events) {
    if (event.eventType === 'yellow_card') yellowCount += 1
    else if (event.eventType === 'red_card') redCount += 1
  }
  return { yellowCount, redCount }
}
