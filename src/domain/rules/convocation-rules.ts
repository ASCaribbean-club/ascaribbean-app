// Règles dérivées de l'état d'une Convocation / d'un jeu de ConvocationResponse :
// "qu'est-ce qui est vrai", jamais "qui a le droit" (ça reste dans domain/policies/).

import type { Convocation, ConvocationResponse, ConvocationType, DeclaredStatus } from '../entities/convocation'

export interface ResponseCounts {
  present: number
  absent: number
  pending: number
}

export function isUpcoming(convocation: Convocation, now: Date): boolean {
  return convocation.status === 'open' && new Date(convocation.date) > now
}

export function isPastDate(date: string, now: Date): boolean {
  return new Date(date) < now
}

// Soonest-first comparator for `Array.prototype.sort` — "next" (the nearest
// upcoming convocation) and "à venir" (chronological list) both depend on
// this order, so it's a rule, not an incidental repository/query detail
// (ListUpcomingTeamConvocationsUseCase can't assume listForTeam's own
// ordering).
export function byDateAscending(a: Convocation, b: Convocation): number {
  return new Date(a.date).getTime() - new Date(b.date).getTime()
}

// Counts from ConvocationResponse only (AC-CD-04 — never AttendanceRecord,
// CLAUDE.md §6). Known gap against AC-CD-05 (présents + absents + en
// attente = nombre de convoqués): a convoked player who hasn't responded
// has no ConvocationResponse row at all, so they're absent from this count
// entirely rather than counted as pending. Still open for
// ListUpcomingTeamConvocationsUseCase (specs/coach-dashboard.md PO-6b) —
// that use case only has ConvocationResponseRepository, no roster. Resolved
// for the roster-aware call site (GetConvocationRosterForCoachUseCase) by
// summarizeRosterStatuses below, once ConvocationRespondersRepository gave
// it the full convoked roster to default non-responders to 'pending' with.
export function summarizeResponses(responses: ConvocationResponse[]): ResponseCounts {
  return summarizeRosterStatuses(responses)
}

// Same tally, but over anything carrying a DeclaredStatus — in particular
// a roster already completed with 'pending' for non-responders, so counts
// stay consistent with AC-CD-05 instead of only reflecting response rows.
export function summarizeRosterStatuses(items: { status: DeclaredStatus }[]): ResponseCounts {
  return items.reduce<ResponseCounts>(
    (counts, item) => {
      counts[item.status]++
      return counts
    },
    { present: 0, absent: 0, pending: 0 }
  )
}

// Local calendar day (Y-M-D), not ISO/UTC — two convocations at 23h and 1h
// the next day must land in different cells, which a UTC-normalized key
// would get wrong for any user west of UTC. Exported so callers (the
// Calendar screen's ViewModel) can build the same key for a plain Date and
// look up groupConvocationTypesByDay's result.
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// Distinct ConvocationTypes occurring on each calendar day, for the
// Calendar screen's day-cell dot markers (specs/calendar.md, UI design
// §"Composant nouveau" #1 — EventTypeDots). Insertion-ordered, not a fixed
// priority: EventTypeDots itself caps the display at 3 dots + overflow,
// this rule only groups and deduplicates (two trainings the same day still
// produce one 'training' entry).
export function groupConvocationTypesByDay(convocations: Convocation[]): Map<string, ConvocationType[]> {
  const byDay = new Map<string, ConvocationType[]>()
  for (const convocation of convocations) {
    const key = dayKey(new Date(convocation.date))
    const types = byDay.get(key) ?? []
    if (!types.includes(convocation.type)) {
      types.push(convocation.type)
    }
    byDay.set(key, types)
  }
  return byDay
}
