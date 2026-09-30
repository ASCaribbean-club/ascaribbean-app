// Raw shape of public.audit_log_entries — a `security_invoker = true` view
// over public.audit_log left-joined to public.users for the actor's display
// name, see supabase/migrations/20260930125319_web_audit_logs_schema.sql.
// `Row` suffix (not `Dto`, CLAUDE.md §4): a view with a stable column set
// counts as a row, same reasoning as ClubNewsRow. RLS on the underlying
// audit_log table (audit_log_select_admin) already restricts what a SELECT
// can return — this DTO just describes the columns the view exposes.
//
// specs/web-audit-logs.md — 2026-09-30 (third addendum) — `target_type`,
// `source`, and `metadata` added. `metadata` is now exposed by the view
// (supabase/migrations/20260930140500_audit_log_target_type_source.sql):
// this reverses the original AC-AU-15 exclusion noted above in earlier
// revisions of this file — safe, since `metadata` never carries
// health/medical content per public.audit_log's own column comment.
//
// No generated `database.types.ts` exists in this repo to regenerate from
// (checked — none present, no Supabase MCP `generate_typescript_types` call
// made since this migration is unapplied) — hand-written from the view
// definition instead, same as every other *Row DTO in this directory.
export interface AuditLogEntryRow {
  id: string
  occurred_at: string
  actor_id: string | null
  actor_full_name: string | null
  action: string
  target_id: string | null
  target_type: string | null
  source: string
  metadata: Record<string, unknown>
}
