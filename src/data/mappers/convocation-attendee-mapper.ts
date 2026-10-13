import type { ConvocationAttendeeRow } from '../dto/convocation-attendee-row'

// Domain -> row for the single write path (ConvocationAttendeeRepository.add).
// Always present between the repository and the table, even for two columns
// (CLAUDE.md §4). Reading the list goes through the responders RPC, not this row.
export function toConvocationAttendeeRow(convocationId: string, userId: string): ConvocationAttendeeRow {
  return { convocation_id: convocationId, user_id: userId }
}
