// specs/web-audit-logs.md — 2026-09-30 (third addendum, `target_type`/
// `source`/`metadata`) — mirrors the `check` constraint on
// public.audit_log.source, hand-mirrored, never generated either direction
// (CLAUDE.md §7) — see
// supabase/migrations/20260930140500_audit_log_target_type_source.sql's own
// comment naming THIS file back. Same "never throw on an unknown value, the
// log outlives the code" reasoning as domain/policies/audit-actions.ts: a
// future refactor could retire or rename a source kind, and a row already
// written with a retired one must still be representable without throwing
// anywhere on the read path — domain/entities/audit-log-entry.ts's own
// `source: string` field (not `AuditLogSource`) is what makes that possible.
export const AUDIT_SOURCES = ['usecase', 'job', 'trigger'] as const

export type AuditLogSource = (typeof AUDIT_SOURCES)[number]

// A pure guard, never throws. Consulted downstream (presentation/) to branch
// on "known vs unknown" without ever throwing on the unknown branch, exactly
// like isAuditAction().
export function isAuditSource(value: string): value is AuditLogSource {
  return (AUDIT_SOURCES as readonly string[]).includes(value)
}
