import type { AttendanceSummary } from '@domain/entities/attendance-summary'
import type { AttendanceSummaryDto } from '../dto/attendance-summary-dto'

// CLAUDE.md §4 — mapper always present between DTO and entity, even for a
// two-integer shape this small: never read `dto.validated_count` directly
// from a repository/use case.
export function toAttendanceSummary(dto: AttendanceSummaryDto): AttendanceSummary {
  return {
    validatedCount: dto.validated_count,
    presentCount: dto.present_count,
  }
}
