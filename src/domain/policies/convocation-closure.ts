import type { AttendanceRecord } from '../entities/convocation'

/**
 * Reference rule for automatic convocation closure.
 * ⚠️ DUPLICATED in SQL — see supabase/migrations/xxxx_attendance_trigger.sql
 * (trigger AFTER INSERT/UPDATE ON attendance_records).
 * The SQL trigger is authoritative in production — it fires on every write path,
 * including direct SQL edits, which this TypeScript function cannot observe.
 * This function exists so the rule is readable and testable in `domain/` without
 * opening a migration file. It does NOT trigger any write itself.
 * Any change to this rule must be mirrored in the SQL trigger, and vice versa.
 */
export function isConvocationComplete(
  requiredUserIds: string[],
  attendanceRecords: AttendanceRecord[],
): boolean {
  const validatedUserIds = new Set(attendanceRecords.map((r) => r.userId))
  return requiredUserIds.every((id) => validatedUserIds.has(id))
}
