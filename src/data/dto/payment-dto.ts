// Raw shape of public.membership_payments, see
// supabase/migrations/20260917174652_web_memberships_write_policies.sql.
// Append-only child table (§2.2) — no update/delete row shape exists on
// purpose, there is no application path that ever modifies a row after
// insert.
export interface PaymentRow {
  id: string
  membership_id: string
  amount_cents: number
  paid_at: string
  recorded_by: string
  recorded_at: string
}

// Insert payload for PaymentRepositoryImpl.create(). No `id`/`recorded_at`
// (DB defaults).
export interface PaymentInsertRow {
  membership_id: string
  amount_cents: number
  paid_at: string
  recorded_by: string
}
