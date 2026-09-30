import type { AuditLogEntry } from '@domain/entities/audit-log-entry'
import type { AuditLogEntryRow } from '../dto/audit-log-entry-row'

// specs/web-audit-logs.md §2.7/AC-AU-08 — no validation, no throw: `action`
// is passed through as-is, whatever string the row carries. Domain/entities/
// audit-log-entry.ts's own `action: string` field is what makes this
// possible — isAuditAction() is only ever consulted downstream
// (presentation/features/backoffice/audit/audit-action-labels.ts), never
// here. Same "never throw" treatment now applies to `metadata`
// (2026-09-30, third addendum) — see normalizeMetadata() below.
export function toAuditLogEntry(row: AuditLogEntryRow): AuditLogEntry {
  return {
    id: row.id,
    occurredAt: new Date(row.occurred_at),
    actorId: row.actor_id,
    actorFullName: row.actor_full_name,
    action: row.action,
    targetId: row.target_id,
    targetType: row.target_type,
    source: row.source,
    metadata: normalizeMetadata(row.metadata),
  }
}

// Defensive, matching this mapper's existing "never throw" philosophy for
// `action`: `metadata` is typed as `Record<string, unknown>` on
// AuditLogEntryRow, but the raw value coming back from PostgREST is
// untyped at runtime — a null, an array, or a scalar would all otherwise
// propagate an unexpected shape straight into presentation/'s
// `Object.keys(entry.metadata)` call. Falls back to `{}`, never throws.
function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}
