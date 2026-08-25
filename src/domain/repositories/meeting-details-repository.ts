import type { MeetingDetails } from '../entities/meeting-details'

// specs/create-convocation.md §2. Upsert-on-conflict, not insert-and-grow —
// this is "current state" for a convocation, not an append-only log
// (CLAUDE.md §6), same convention as ConvocationResponse/AttendanceRecord.
export interface MeetingDetailsRepository {
  upsert(details: MeetingDetails): Promise<MeetingDetails>
  findByConvocationId(convocationId: string): Promise<MeetingDetails | null>
}