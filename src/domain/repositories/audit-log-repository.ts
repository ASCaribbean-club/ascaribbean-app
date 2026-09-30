import type { AuditAction } from '../policies/audit-actions'
import type { AuditLogEntry } from '../entities/audit-log-entry'

// specs/web-audit-logs.md §2.6/AC-AU-13 — offset pagination, fixed page
// size (docs/DEFAULTS-A-CHALLENGER.md carries the "switch to keyset
// pagination" challenge for this default). Exported so
// data/repositories/AuditLogRepositoryImpl.ts and the ViewModel never
// hardcode the number twice.
export const AUDIT_LOG_PAGE_SIZE = 50

// §2.6 — two independent, optional bounds (an open-ended range on either
// side is valid) and an optional action allow-list (empty/absent = no
// filter, §2.3 "conséquence acceptée"). Both bounds are already resolved,
// absolute instants by the time they reach this interface — see
// presentation/features/backoffice/audit/audit-log-date-range.ts for the
// day-bounds conversion that produces them; this interface doesn't know
// about date-only strings or timezones at all.
export interface AuditLogFilters {
  from?: Date
  to?: Date
  actions?: AuditAction[]
}

export interface AuditLogPage {
  entries: AuditLogEntry[]
  hasMore: boolean
}

// Follow-up pass to specs/web-audit-logs.md (2026-09-30 addendum) — the
// first real emitters (`role.granted`/`role.revoked`, wired into
// AssignRoleUseCase/AssignCoachToTeamsUseCase/RemoveRoleAssignmentUseCase).
// Deliberately NO `actorId` field: the actor is derived server-side from the
// caller's session (public.record_audit_log_entry, see
// supabase/migrations/20260930131500_audit_log_record_rpc.sql, `auth.uid()`
// read inside the function) — an actor a client could supply directly would
// make the trace worthless (anyone could claim to be anyone). `targetId` is
// the affected account/resource, never the actor.
// specs/web-audit-logs.md — 2026-09-30 (third addendum) — `targetType` is
// optional, purely informational labeling of whatever `targetId` points at
// (§1 "target_type", resolves PO-AU-02). No `source` field here, on
// purpose: `public.record_audit_log_entry` hardcodes `source = 'usecase'`
// server-side (only this RPC's own INSERT can truthfully claim it) — a
// client-supplied value would be exactly the spoofing concern already
// documented for why `actorId` isn't a parameter either.
export interface RecordAuditLogEntryInput {
  action: AuditAction
  targetId?: string
  targetType?: string
  metadata?: Record<string, unknown>
}

export interface AuditLogRepository {
  // §2.6 — always sorted `occurredAt` descending; filtering AND pagination
  // happen server-side, never a `.filter()`/`.slice()` on an
  // already-fetched array (AC-AU-12). `page` is 0-based.
  list(filters: AuditLogFilters, page: number): Promise<AuditLogPage>
  // supabase/migrations/20260930131500_audit_log_record_rpc.sql —
  // public.record_audit_log_entry, the only write path public.audit_log
  // has: no client INSERT policy exists or ever will for this table
  // (specs/web-audit-logs.md §2.5), by design.
  record(entry: RecordAuditLogEntryInput): Promise<void>
}
