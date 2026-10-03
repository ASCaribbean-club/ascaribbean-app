// Pure rules for the Dirigeant dashboard / calendar — "what's true", never
// "who's allowed" (specs/mobile-dirigeant-habilite.md §1). The section filter
// is NOT a security boundary: it sorts data RLS already authorized, so it has
// no entry in the RBAC matrix.

import type { Convocation } from '../entities/convocation'
import type { Team } from '../entities/team'
import { byDateAscending, isUpcoming } from './convocation-rules'

// null = "Toutes" (no filter). A concrete value is a public.sections id.
export type SectionFilter = string | null

export function filterBySection<T extends { team: Team }>(items: T[], sectionFilter: SectionFilter): T[] {
  if (sectionFilter === null) return items
  return items.filter((item) => item.team.sectionId === sectionFilter)
}

export function filterTeamsBySection(teams: Team[], sectionId: string | null): Team[] {
  if (!sectionId) return []
  return teams.filter((team) => team.sectionId === sectionId)
}

// Upcoming = open and started less than 6h ago or later (same rule as isUpcoming),
// soonest first. The first element is the "Prochain événement" card (all
// three types count, PO-DH-07: the label is "événement").
export function selectUpcoming<T extends { convocation: Convocation }>(items: T[], now: Date): T[] {
  return items
    .filter((item) => isUpcoming(item.convocation, now))
    .sort((a, b) => byDateAscending(a.convocation, b.convocation))
}

// PO-DH-11 default: calendar week Monday 00:00 (inclusive) to next Monday
// 00:00 (exclusive), in the runtime's local time zone — consistent with the
// Monday-first getWeekDates of the calendar screen.
export function getWeekBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysSinceMonday = (start.getDay() + 6) % 7
  start.setDate(start.getDate() - daysSinceMonday)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

// AC-DH-06: only convocations of the (already current-season) items given,
// 'cancelled' excluded, past events of the week included.
export function countEventsInWeek(items: { convocation: Convocation }[], now: Date): number {
  const { start, end } = getWeekBounds(now)
  return items.filter(({ convocation }) => {
    if (convocation.status === 'cancelled') return false
    const date = new Date(convocation.date)
    return date >= start && date < end
  }).length
}
