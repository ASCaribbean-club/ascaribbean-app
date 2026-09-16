export type Action =
  | 'convocation:create'
  | 'convocation:respond'
  | 'section:manage'
  // specs/coach-attendance-confirmation.md §2/§7 — closes the mirroring
  // loop the initial migration's RLS comments already flagged as missing
  // ("no rbac-matrix.ts action exists for this yet [...] Follow-up:
  // rbac-matrix.ts / actions.ts should eventually gain an explicit
  // 'attendance:validate' action"). See attendance_records_insert_validate /
  // _update_validate in supabase/migrations/20260811171754_initial_schema.sql
  // for the RLS side this mirrors.
  | 'attendance:validate'
