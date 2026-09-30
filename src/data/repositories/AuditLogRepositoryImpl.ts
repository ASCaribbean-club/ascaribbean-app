import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AUDIT_LOG_PAGE_SIZE,
  type AuditLogFilters,
  type AuditLogPage,
  type AuditLogRepository,
  type RecordAuditLogEntryInput,
} from '@domain/repositories/audit-log-repository'
import type { AuditLogEntryRow } from '../dto/audit-log-entry-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toAuditLogEntry } from '../mappers/audit-log-entry-mapper'

// specs/web-audit-logs.md — 2026-09-30 (third addendum) — target_type,
// source, and metadata appended; see AuditLogEntryRow's own header comment.
const AUDIT_LOG_ENTRIES_COLUMNS = 'id, occurred_at, actor_id, actor_full_name, action, target_id, target_type, source, metadata'

// specs/web-audit-logs.md §2.4/§2.6 — reads from the security_invoker view
// public.audit_log_entries, never a client-side join against public.users:
// the underlying RLS (audit_log_select_admin, users_select_own) is the
// actual boundary, this class only shapes the request.
export class AuditLogRepositoryImpl implements AuditLogRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  // AC-AU-12 — filtering AND pagination happen IN the request (`gte`/`lt`/
  // `in`/`range`), never a `.filter()`/`.slice()` on an already-fetched
  // array. `page` is 0-based; `range()` requests one row MORE than
  // AUDIT_LOG_PAGE_SIZE so `hasMore` is derived from the real result length
  // rather than guessed from an assumed total (AC-AU-13's "charger plus").
  async list(filters: AuditLogFilters, page: number): Promise<AuditLogPage> {
    const rangeFrom = page * AUDIT_LOG_PAGE_SIZE
    const rangeTo = rangeFrom + AUDIT_LOG_PAGE_SIZE // inclusive range() bound -> AUDIT_LOG_PAGE_SIZE + 1 rows

    let query = this.client
      .from('audit_log_entries')
      .select(AUDIT_LOG_ENTRIES_COLUMNS)
      // §2.6 — occurred_at descending, unconditionally, whatever the filters.
      .order('occurred_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if (filters.from) query = query.gte('occurred_at', filters.from.toISOString())
    // §2.6 — `to` is the EXCLUSIVE start of the day after the admin's
    // chosen end date (presentation/features/backoffice/audit/audit-log-date-range.ts
    // already resolved that inclusivity) — `lt`, never `lte`.
    if (filters.to) query = query.lt('occurred_at', filters.to.toISOString())
    if (filters.actions && filters.actions.length > 0) query = query.in('action', filters.actions)

    const { data, error } = await query.overrideTypes<AuditLogEntryRow[]>()
    if (error) throw mapSupabaseError(error)

    const rows = data ?? []
    const hasMore = rows.length > AUDIT_LOG_PAGE_SIZE
    const entries = rows.slice(0, AUDIT_LOG_PAGE_SIZE).map(toAuditLogEntry)

    return { entries, hasMore }
  }

  // Follow-up pass (specs/web-audit-logs.md, 2026-09-30 addendum) — the only
  // write path public.audit_log has: a SECURITY DEFINER RPC, not a plain
  // INSERT (no client INSERT policy exists on that table, and none ever
  // will — §2.5). `actorId` is never sent: the RPC reads `auth.uid()`
  // itself (supabase/migrations/20260930131500_audit_log_record_rpc.sql).
  async record(entry: RecordAuditLogEntryInput): Promise<void> {
    const { error } = await this.client.rpc('record_audit_log_entry', {
      p_action: entry.action,
      p_target_id: entry.targetId ?? null,
      p_metadata: entry.metadata ?? {},
      // specs/web-audit-logs.md — 2026-09-30 (third addendum) — no
      // `p_source`: the RPC hardcodes `source = 'usecase'` server-side, see
      // RecordAuditLogEntryInput's own comment.
      p_target_type: entry.targetType ?? null,
    })
    if (error) throw mapSupabaseError(error)
  }
}
