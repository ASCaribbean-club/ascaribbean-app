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
 *
 * specs/convocation-player-selection.md AC-CPS-15 — `requiredUserIds` is the
 * list of CONVOKED players (convocation_attendees), no longer every player of
 * the team; a record of a non-convoked user does not count toward completeness.
 * SQL: private.close_convocation_if_complete / private.close_elapsed_convocations
 * in supabase/migrations/20261012181317_convocation_attendees_rewire.sql.
 */
// Completeness alone does not close a convocation: closure also waits 3 days
// after its date (SQL only, 20261013134916), so a complete convocation stays
// `open` meanwhile.
export function isConvocationComplete(
  requiredUserIds: string[],
  attendanceRecords: AttendanceRecord[],
): boolean {
  const validatedUserIds = new Set(attendanceRecords.map((r) => r.userId))
  return requiredUserIds.every((id) => validatedUserIds.has(id))
}
