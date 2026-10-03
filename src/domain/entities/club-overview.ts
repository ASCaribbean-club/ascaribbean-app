// specs/mobile-dirigeant-habilite.md §1.1/§2 — the two club-wide counters of
// the Dirigeant dashboard tiles, as returned by get_club_overview(). Integers
// only: no membership row, status, amount or identifier (AC-DH-19).
// "Événements cette semaine" is NOT here: it is derived from the schedule
// (see rules/club-schedule-rules.ts countEventsInWeek).
export interface ClubOverview {
  sectionsCount: number
  membersCount: number // PO-DH-06 open: current-season active memberships (default)
}
