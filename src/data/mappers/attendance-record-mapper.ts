import type { AttendanceRecord } from '@domain/entities/convocation'
import type { AttendanceRecordRow } from '../dto/attendance-record-dto'

// CLAUDE.md §4 — a mapper is always present between DTO and entity, never
// skipped even for a "simple" table. Field-for-field snake_case ->
// camelCase translation, same shape as data/mappers/match-details-mapper.ts
// (toMatchDetails/toMatchDetailsRow) — no business logic belongs here, only
// the renaming/reshaping itself.
export function toAttendanceRecord(row: AttendanceRecordRow): AttendanceRecord {
  return {
    id: row.id,
    convocationId: row.convocation_id,
    userId: row.user_id,
    actualStatus: row.actual_status,
    absenceValidity: row.absence_validity,
    note: row.note,
    validatedBy: row.validated_by,
    validatedAt: row.validated_at,
  }
}

// Reverse direction, needed by AttendanceRecordRepositoryImpl.upsert — same
// convention as toConvocationResponseRow in data/mappers/convocation-mapper.ts:
// input omits `id` (DB-generated on insert, see the table's
// `default gen_random_uuid()`), so the row it returns omits it too.
export function toAttendanceRecordRow(record: Omit<AttendanceRecord, 'id'>): Omit<AttendanceRecordRow, 'id'> {
  return {
    convocation_id: record.convocationId,
    user_id: record.userId,
    actual_status: record.actualStatus,
    absence_validity: record.absenceValidity,
    note: record.note,
    validated_by: record.validatedBy,
    validated_at: record.validatedAt,
  }
}
