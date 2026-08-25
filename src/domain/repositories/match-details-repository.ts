import type { MatchDetails } from '../entities/match-details'

// Symmetric with MeetingDetailsRepository — same 1:1-satellite shape, same
// upsert-on-conflict convention (this is "current state" data tied 1:1 to a
// Convocation row, not an append-only log — CLAUDE.md §6 applies here too
// even though MatchDetails isn't ConvocationResponse/AttendanceRecord).
export interface MatchDetailsRepository {
  upsert(details: MatchDetails): Promise<MatchDetails>
  findByConvocationId(convocationId: string): Promise<MatchDetails | null>
}
