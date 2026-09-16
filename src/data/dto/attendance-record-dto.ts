import type { AbsenceValidity, ActualStatus } from '@domain/entities/convocation'

// Raw shape of public.attendance_records — see
// supabase/migrations/20260811171754_initial_schema.sql (table definition)
// and its RLS policies attendance_records_select_coach_admin /
// _insert_validate / _update_validate, which this DTO's fields are read
// against. specs/coach-attendance-confirmation.md §1 — table already
// existed before this pass; only the repository/mapper implementing it are
// net-new.
export interface AttendanceRecordRow {
  id: string
  convocation_id: string
  user_id: string
  actual_status: ActualStatus
  // AC-AT-08 / PO-AT-05 — column exists in the schema, but this pass never
  // writes a non-null value here (excusée/non excusée is undecided).
  absence_validity: AbsenceValidity | null
  // AC-AT-08 / PO-AT-06 — same story as absence_validity above, for the
  // coach's free-text comment.
  note: string | null
  validated_by: string
  validated_at: string
}
