// specs/web-audit-logs.md §2.4/§2.7 — `action` is `string`, NOT `AuditAction`
// (domain/policies/audit-actions.ts): a row written by a retired/unknown
// code must still be representable without throwing anywhere on the read
// path (AC-AU-08) — a narrower type here would make that structurally
// impossible instead of merely avoided.
//
// `actorFullName` is resolved by the `audit_log_entries` view's own left
// join to `public.users` (supabase/migrations/20260930090000_web_audit_logs_schema.sql)
// — `null` covers BOTH "no human actor at all" (`actorId` also `null`, a
// service_role job like `purge.executed`) and "an actor id that no longer
// resolves to a name" (`actorId` set, join found nothing — PO-AU-01,
// disambiguated by `actorId`'s own nullity, never merged into one boolean).
//
// specs/web-audit-logs.md — 2026-09-30 (third addendum) — supersedes the
// "`metadata` is deliberately absent" note above (AC-AU-15): `targetType`,
// `source`, and `metadata` are added, all three now read and rendered.
// `targetType` is `string | null`, not an enum — purely informational
// labeling of whatever `target_id` points at, no CHECK constrains it either
// (see the migration's own comment for why, contrasted with `action`).
// `source` is deliberately `string`, not `AuditLogSource`
// (domain/policies/audit-sources.ts) — same "never throw on an unrecognized
// value" reasoning as `action: string` above. `metadata` is
// `Record<string, unknown>`, never `null` — the column itself defaults to
// `'{}'::jsonb not null`.
export interface AuditLogEntry {
  id: string
  occurredAt: Date
  actorId: string | null
  actorFullName: string | null
  action: string
  targetId: string | null
  targetType: string | null
  source: string
  metadata: Record<string, unknown>
}
