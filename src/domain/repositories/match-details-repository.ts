import type { MatchArrangements, MatchDetails } from '../entities/match-details'

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

  // specs/edit-match-details.md §5 — a NARROW write path, deliberately not a
  // second caller of `upsert` above: `upsert` takes the whole entity
  // (`opponentId` included), so reusing it here would mean re-reading the
  // row, re-copying `opponentId` back in, and writing it again — a path by
  // which `opponentId` (and a future `goalsFor`/`goalsAgainst`, match-stats)
  // COULD be written, protected only by callers happening to round-trip the
  // same value. `MatchArrangements`'s `Pick<>` makes that structurally
  // impossible instead. Never upserts: a `match` convocation with no
  // `MatchDetails` row is a domain error (AC-EM-11), not a silent insert —
  // see UpdateMatchDetailsUseCase, which already guarantees the row exists
  // before calling this.
  updateArrangements(convocationId: string, arrangements: MatchArrangements): Promise<MatchDetails>
}
