import type { AttendanceSummary, AttendanceTypeBreakdown } from '../entities/attendance-summary'
import type { AttendanceRecord } from '../entities/convocation'

export interface AttendanceRecordRepository {
  upsert(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord>
  findByConvocation(convocationId: string): Promise<AttendanceRecord[]>

  // specs/player-stats.md §6.3/PO-PS-02 — the ONLY read path a player has
  // onto their own attendance: backed by get_my_attendance_summary(), a
  // SECURITY DEFINER RPC that filters on auth.uid() internally (no
  // parameter here — never a userId, AC-02). attendance_records' RLS stays
  // closed to players; there is deliberately NO `findOwn`/raw-row method on
  // this interface for a player caller (AC-PS-18/AC-PS-21).
  getOwnAttendanceSummary(): Promise<AttendanceSummary>

  // specs/player-stats.md addendum "troisième passage" (PO-PS-12
  // partiellement tranché) — backed by get_my_attendance_summary_by_type(),
  // same SECURITY DEFINER/auth.uid() shape as getOwnAttendanceSummary above.
  // Attendance ONLY — there is deliberately no equivalent method on
  // ConvocationResponseRepository (the response rate stays a single global
  // aggregate in this pass).
  getOwnAttendanceSummaryByType(): Promise<AttendanceTypeBreakdown[]>
}
