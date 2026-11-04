import type { ConvocationAttendee } from '@domain/entities/convocation-attendee'
import type { ConvocationAttendeeRow } from '../dto/convocation-attendee-row'

// Domain -> row for the write path (ConvocationAttendeeRepository.add).
// Always present between the repository and the table, even for two columns
// (CLAUDE.md §4).
export function toConvocationAttendeeRow(convocationId: string, userId: string): ConvocationAttendeeRow {
  return { convocation_id: convocationId, user_id: userId }
}

// Row -> domain for the bulk read (ConvocationAttendeeRepository.findByConvocations).
export function toConvocationAttendee(row: ConvocationAttendeeRow): ConvocationAttendee {
  return { convocationId: row.convocation_id, userId: row.user_id }
}
