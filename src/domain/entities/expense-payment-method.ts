// specs/mob-treasurer-finances.md §2 (PO-FI-04, tranché) — referential of the
// payment methods of an EXPENSE, distinct from PAYMENT_METHODS (cotisation
// payments, payment-method.ts, which stays untouched). Stored as TEXT in
// public.expenses.payment_method; the CHECK constraint on that column mirrors
// this list by hand (CLAUDE.md §7) — see
// supabase/migrations/20261007081032_finances.sql
// (expenses_payment_method_check). Change both together. French labels live in
// presentation/shared/formatters/expense-payment-method-labels.ts.
export const EXPENSE_PAYMENT_METHODS = ['card', 'transfer', 'cash', 'cheque', 'direct_debit'] as const

export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number]

export function isExpensePaymentMethod(value: unknown): value is ExpensePaymentMethod {
  return typeof value === 'string' && (EXPENSE_PAYMENT_METHODS as readonly string[]).includes(value)
}
