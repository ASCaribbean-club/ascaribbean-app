import type { ExpensePaymentMethod } from '@domain/entities/expense-payment-method'

// specs/mob-treasurer-finances.md PO-FI-04 — French labels of the expense
// payment-method referential (the domain constant holds the codes only).
const LABELS: Record<ExpensePaymentMethod, string> = {
  card: 'CB',
  transfer: 'Virement',
  cash: 'Espèces',
  cheque: 'Chèque',
  direct_debit: 'Prélèvement',
}

export function formatExpensePaymentMethod(method: ExpensePaymentMethod): string {
  return LABELS[method]
}
