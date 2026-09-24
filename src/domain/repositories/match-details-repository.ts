import type { MatchDetails } from '../entities/match-details'

// Symmetric with MeetingDetailsRepository — same 1:1-satellite shape, same
// upsert-on-conflict convention (this is "current state" data tied 1:1 to a
// Convocation row, not an append-only log — CLAUDE.md §6 applies here too
// even though MatchDetails isn't ConvocationResponse/AttendanceRecord).
export interface MatchDetailsRepository {
  upsert(details: MatchDetails): Promise<MatchDetails>
  findByConvocationId(convocationId: string): Promise<MatchDetails | null>
  // specs/match-stats.md MS-01/MS-10 — RecordMatchScoreUseCase's own write
  // path (`match_result:record`, mirrors match_details_update_record_score
  // in supabase/migrations/20260924100000_match_statistics_schema.sql).
  // Deliberately narrower than `upsert` above (score only, never
  // opponentId/isHome/meetingPoint*): a coach recording a result must not
  // be able to silently rewrite the match's own identity/RDV fields through
  // this call site.
  recordScore(convocationId: string, goalsFor: number, goalsAgainst: number): Promise<MatchDetails>
}
