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
  // Text column, CHECK-constrained to the domain's PAYMENT_METHODS; null on older rows.
  payment_method: string | null
  // specs/mob-treasurer-finances.md — nullable FK to finance_carriers.
  carrier_id: string | null
  recorded_by: string
  recorded_at: string
}

// Insert payload for PaymentRepositoryImpl.create(). No `id`/`recorded_at`
// (DB defaults).
export interface PaymentInsertRow {
  membership_id: string
  amount_cents: number
  paid_at: string
  payment_method: string | null
  carrier_id: string | null
  recorded_by: string
}
