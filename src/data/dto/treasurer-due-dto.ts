// `get_treasurer_dues()` RPC return value — Dto convention (CLAUDE.md §4):
// an inline join/aggregation with no view behind it. See
// supabase/migrations/20261005130000_get_treasurer_dues_rpc.sql. No licence,
// status, validity or e-mail column exists on this shape, by contract
// (AC-TR-04).
export interface TreasurerDueSectionDto {
  id: string
  name: string
}

export interface TreasurerDuePaymentDto {
  id: string
  amount_cents: number
  paid_at: string
  payment_method: string | null
}

export interface TreasurerDueDto {
  membership_id: string
  member_name: string
  amount_due_cents: number | null
  // jsonb arrays — never null in the SQL (coalesced), tolerated here.
  sections: TreasurerDueSectionDto[] | null
  payments: TreasurerDuePaymentDto[] | null
  // specs/mobile-treasurer.md amendement (4) — from
  // supabase/migrations/20261005170200_send_dues_reminders.sql. count(*) is
  // never null in SQL; tolerated here.
  reminder_count: number | null
  last_reminded_at: string | null
}
