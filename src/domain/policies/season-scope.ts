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
