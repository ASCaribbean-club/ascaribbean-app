// specs/mobile-treasurer.md amendement UI du 2026-10-05 (3), "Validation" —
// field-level checks of the "Enregistrer un paiement" form, run before the
// use case so the form can show a message under the field. They mirror (never
// replace) RecordPaymentUseCase's own rejections (AC-WM-16): the use case
// stays the authority, and the DB CHECK on amount_cents the last line.

export type PaymentAmountError = 'required' | 'not-positive' | 'too-many-decimals'
export type PaymentDateError = 'required' | 'in-future'

// `amountEuros` is the raw text of the input (a user types "150.50").
export function validatePaymentAmount(amountEuros: string): PaymentAmountError | null {
  const trimmed = amountEuros.trim()
  if (trimmed === '') return 'required'
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0) return 'not-positive'
  // More than 2 decimals would be silently rounded when converted to cents.
  const decimals = trimmed.split('.')[1]
  if (decimals !== undefined && decimals.length > 2) return 'too-many-decimals'
  return null
}

// Both dates are `yyyy-mm-dd` (same-format strings compare lexicographically).
// A payment dated exactly `today` is valid; only a later date is rejected.
export function validatePaymentDate(paidAt: string, today: string): PaymentDateError | null {
  if (paidAt === '') return 'required'
  if (paidAt > today) return 'in-future'
  return null
}
