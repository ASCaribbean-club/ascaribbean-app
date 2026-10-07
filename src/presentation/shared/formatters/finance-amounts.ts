// specs/mob-treasurer-finances.md AC-FI-24 — amounts are integer CENTS in the
// domain/data; display formatting is a presentation concern. Whole euros are
// shown without decimals, centimes only when non-zero ("4 234 €", "12,50 €").
// The sign is ALWAYS part of the text (never colour alone).
const AMOUNT_FORMAT = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const MINUS = '−'

function formatMagnitude(cents: number): string {
  return `${AMOUNT_FORMAT.format(Math.abs(cents) / 100)} €`
}

// "1 252 €", "−537 €" for a negative balance.
export function formatFinanceAmount(cents: number): string {
  return `${cents < 0 ? MINUS : ''}${formatMagnitude(cents)}`
}

// An expense line: always "−38 €".
export function formatExpenseAmount(cents: number): string {
  return `${MINUS}${formatMagnitude(cents)}`
}

// A variance: "+12 €", "−8 €", "0 €" (callers show "Juste" for zero).
export function formatSignedFinanceAmount(cents: number): string {
  if (cents === 0) return formatMagnitude(0)
  return `${cents < 0 ? MINUS : '+'}${formatMagnitude(cents)}`
}
