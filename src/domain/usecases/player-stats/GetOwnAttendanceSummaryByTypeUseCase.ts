import type { AttendanceTypeBreakdown } from '@domain/entities/attendance-summary'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'

// specs/player-stats.md addendum "troisième passage" (PO-PS-12 partiellement
// tranché) — mirrors rbac-matrix.ts 'attendance:read-own-summary' -> ['player'],
// the same action as GetOwnAttendanceSummaryUseCase (a second read shape over
// the same boundary, not a new right). Thin pass-through, same shape as its
// sibling: the real boundary is the database.
export class GetOwnAttendanceSummaryByTypeUseCase {
  constructor(private readonly attendanceRecordRepository: AttendanceRecordRepository) {}

  async execute(): Promise<AttendanceTypeBreakdown[]> {
    return this.attendanceRecordRepository.getOwnAttendanceSummaryByType()
  }
}
