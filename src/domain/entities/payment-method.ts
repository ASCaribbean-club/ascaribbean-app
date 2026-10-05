// specs/mobile-treasurer.md (amendement "moyen de paiement") — constant
// referential, no lookup table. Stored as TEXT in
// public.membership_payments.payment_method (nullable: rows recorded before
// the column existed have none). The CHECK constraint on that column mirrors
// this list by hand (CLAUDE.md §7) — see
// supabase/migrations/20261005140000_payment_method.sql and
// 20261005150000_payment_method_cash.sql (adds 'cash'). Change both together.
// French display labels live in presentation/shared/formatters/payment-method-labels.ts.
export const PAYMENT_METHODS = ['card', 'cash', 'transfer', 'other'] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value)
}
