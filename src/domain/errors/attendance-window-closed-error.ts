import { DomainError } from './domain-error'

// specs/web-create-convocation.md §3/AC-WC-26 — an admin tried to enter
// attendance on a convocation that is upcoming or cancelled (window
// `date <= now() and status <> 'cancelled'`). Also mapped from the database's
// own refusal (RLS 42501 on attendance_records) by the repository layer.
export class AttendanceWindowClosedError extends DomainError {}
