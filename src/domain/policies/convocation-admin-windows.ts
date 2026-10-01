import type { Convocation } from '../entities/convocation'

// specs/web-create-convocation.md §3 — the two time windows the admin
// backoffice works inside. Pure predicates, `now` always passed in (never
// `new Date()` here). Manual mirror (CLAUDE.md §7, never generated) of the SQL
// predicates in supabase/migrations/20261001120000_web_create_convocation.sql:
//   - convocations_update_admin / match_details_update_admin /
//     meeting_details_update_admin  <->  isConvocationEditable
//   - attendance_records_insert_validate_admin /
//     attendance_records_update_validate_admin  <->  canEnterAttendance

type WindowFields = Pick<Convocation, 'date' | 'status'>

// 'convocation:update' window: `date > now() and status = 'open'`.
// A date exactly equal to `now` is NOT editable (strict `>`, like the RLS).
export function isConvocationEditable(convocation: WindowFields, now: Date): boolean {
  return convocation.status === 'open' && new Date(convocation.date).getTime() > now.getTime()
}

// 'attendance:validate' (admin) window: `date <= now() and status <> 'cancelled'`.
// Closed convocations stay correctable (§3). A date exactly equal to `now` IS
// inside the window (non-strict `<=`, like the RLS).
export function canEnterAttendance(convocation: WindowFields, now: Date): boolean {
  return convocation.status !== 'cancelled' && new Date(convocation.date).getTime() <= now.getTime()
}

// PO-WC-04 (proposed definition): "Présences non saisies" = not cancelled,
// date passed, still 'open'. The server-side filter and the pastille count use
// the same definition (AC-WC-09) — this predicate is its in-memory twin, used
// for the per-row cell.
export function isAttendancePending(convocation: WindowFields, now: Date): boolean {
  return convocation.status === 'open' && new Date(convocation.date).getTime() <= now.getTime()
}

export type AdminConvocationDisplayStatus = 'open' | 'cancelled' | 'past' | 'closed'

// AC-WC-07/PO-WC-03 — a past 'open' convocation is NEVER shown as "Clôturée":
// only a real `closed` status (set by the DB trigger) is.
export function adminConvocationDisplayStatus(convocation: WindowFields, now: Date): AdminConvocationDisplayStatus {
  if (convocation.status === 'cancelled') return 'cancelled'
  if (convocation.status === 'closed') return 'closed'
  return new Date(convocation.date).getTime() > now.getTime() ? 'open' : 'past'
}
