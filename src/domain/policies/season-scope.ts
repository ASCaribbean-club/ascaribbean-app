import type { Season } from '../entities/season'

// Reference rule for "is this season the current one".
// MIRRORED in SQL — see supabase/migrations/20260819153918_season_scoping_correction.sql
// and the current_season() function used by RLS policies.
// The SQL side is authoritative for anything security-relevant (RLS), because
// now() must be evaluated by Postgres, never trusted from a client-supplied
// date. This function exists for readability, unit testing, and any UI-only
// use (e.g. showing an "upcoming season" state) — it must never gate a
// security decision.
export function isCurrentSeason(season: Season, now: Date): boolean {
  const start = new Date(season.startDate)
  const end = new Date(season.endDate)
  return now >= start && now <= end // OPEN — end_date inclusivity at the season boundary, see the migration
}

// specs/web-seasons.md §2.2/AC-WS-12 — isCurrentSeason above is a boolean,
// and "not the current season" hides two cases web-seasons must treat
// differently: a season that already ended (not modifiable) and one that
// hasn't started yet (still modifiable). This predicate is added ALONGSIDE
// isCurrentSeason, without modifying it or duplicating its rule (§2.6) — it
// is consumed by nothing isCurrentSeason already backs (RLS `teams`, the
// coach dashboard's team scoping).
//
// Bounds (§2.3): "ended" is decided by end_date, not start_date — a season
// already underway has a past start_date without being "an ended season"
// (that's precisely the mockup's "En cours" row). end_date is an INCLUSIVE
// bound, mirroring season_range's '[]' and isCurrentSeason's own `now <=
// end`: a season whose end_date is today is still "current", not "ended"
// (§2.3c, AC-WS-12's own boundary case).
//
// UI-ONLY, same caveat as isCurrentSeason (CLAUDE.md §6): this function only
// decides what the /admin/seasons list and edit-pencil render. The actual
// security boundary for "an ended season can't be modified" is the
// seasons_update_admin RLS policy's `using`/`with check` clauses (`end_date
// >= current_date`, evaluated by Postgres) — see
// supabase/migrations/20260917122358_web_seasons_write_policies.sql. A
// forward-set client clock must never be able to open up a write that
// policy would refuse.
export type SeasonStatus = 'ended' | 'current' | 'upcoming'

export function seasonStatus(season: Season, now: Date): SeasonStatus {
  const start = new Date(season.startDate)
  const end = new Date(season.endDate)
  if (now > end) return 'ended'
  if (now < start) return 'upcoming'
  return 'current'
}
