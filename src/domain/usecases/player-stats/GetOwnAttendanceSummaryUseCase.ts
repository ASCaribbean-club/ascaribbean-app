import type { AttendanceSummary } from '@domain/entities/attendance-summary'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'

// specs/player-stats.md §2/§6.3 — mirrors rbac-matrix.ts
// 'attendance:read-own-summary' -> ['player']. Thin pass-through, same
// shape as GetVoteTallyUseCase: the real boundary is the database
// (get_my_attendance_summary's own auth.uid() filter, attendance_records'
// RLS staying closed to players, PO-PS-02) and the repository's own
// interface shape (no userId parameter anywhere on this path, AC-02) — this
// class doesn't add filtering logic of its own, resist the urge to.
export class GetOwnAttendanceSummaryUseCase {
  constructor(private readonly attendanceRecordRepository: AttendanceRecordRepository) {}

  async execute(): Promise<AttendanceSummary> {
    return this.attendanceRecordRepository.getOwnAttendanceSummary()
  }
}
