import type { CardsSummary } from '../entities/cards-summary'
import type { MatchEvent } from '../entities/match-event'

// specs/match-stats.md MS-03/MS-11 — match_events is an append-only log
// with a DELETE, never an UPDATE (MS-11 — "supprimé puis recréé", mirrored
// by there being no match_events UPDATE policy at all in
// supabase/migrations/20260924100000_match_statistics_schema.sql). No
// `upsert` here on purpose — unlike ConvocationResponse/AttendanceRecord,
// this is genuinely a log, not "current state".
export interface MatchEventRepository {
  add(event: Omit<MatchEvent, 'id' | 'createdAt'>): Promise<MatchEvent>
  delete(eventId: string): Promise<void>
  findByConvocation(convocationId: string): Promise<MatchEvent[]>

  // specs/player-stats.md §1/AC-PS-03 — "Buts marqués", season-scoped
  // ('current_season()', AC-PS-02), player's own goals only. Not part of
  // §6.3's two named RPCs (get_my_attendance_summary/get_my_response_summary)
  // — a build-time addition, flagged in the migration's own comment: the
  // count needs a 3-hop join (match_events -> match_details -> convocations
  // -> teams) to apply the season filter server-side, which no existing
  // client-side query pattern in this codebase covers safely. Backed by
  // get_my_goals_count(), SECURITY INVOKER (match_events_select_scoped
  // already lets a team member read their own 'goal' rows — no elevated
  // privilege needed, AC-PS-04/AC-PS-05 unaffected). No parameter — filters
  // on auth.uid() internally, same shape as the two RPC-backed methods
  // above on the other two repositories.
  getOwnGoalsCountForCurrentSeason(): Promise<number>

  // specs/player-stats.md addendum "PO-PS-03 tranché" (2026-09-29, décision
  // développeuse seule — Bureau non consulté, PO-PS-03 demandait
  // initialement les deux, voir la spec pour le détail). A player's OWN
  // yellow/red card counts, season-scoped. Required a real RLS change on
  // match_events_select_scoped (own row, any event_type, never a
  // teammate's) — see
  // supabase/migrations/20260929112002_player_stats_own_cards_rls.sql.
  // Never `penalty_missed` — not asked for, stays staff-only. AC-MS-09/
  // AC-MS-10 (no teammate's card ever visible to a player) are UNCHANGED:
  // the new RLS branch only ever matches the row's own user_id.
  getOwnCardsCountForCurrentSeason(): Promise<CardsSummary>
}
