import type { AttendanceTypeBreakdown } from '@domain/entities/attendance-summary'
import type { ConvocationType } from '@domain/entities/convocation'
import type { AttendanceSummaryByTypeDto } from '../dto/attendance-summary-by-type-dto'

// CLAUDE.md §4 — mapper always present between DTO and entity.
export function toAttendanceTypeBreakdown(dto: AttendanceSummaryByTypeDto): AttendanceTypeBreakdown {
  return {
    type: dto.convocation_type as ConvocationType,
    validatedCount: dto.validated_count,
    presentCount: dto.present_count,
  }
}
