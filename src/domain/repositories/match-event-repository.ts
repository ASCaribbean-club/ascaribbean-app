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
}
