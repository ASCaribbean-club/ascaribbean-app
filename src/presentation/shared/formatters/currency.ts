// specs/web-memberships.md §2.2 — amounts live in the domain/data as
// strictly-positive integer cents, NEVER a float (a `300€` saved as a float
// re-serializes as `299,99999…`, per that section's own warning). Rendering
// to "X€" is exactly the kind of formatting concern CLAUDE.md §5 assigns to
// presentation/shared/formatters/, never to domain/ or data/.
//
// Cents are shown when present ("150.50€") and dropped when the amount is
// whole ("150€") — never rounded to the nearest euro, so a 150.50€ payment
// doesn't read as 151€. DISPLAY only; the integer-cents value is untouched.
export function formatEuros(amountCents: number): string {
  return `${Number((amountCents / 100).toFixed(2))}€`
}

// specs/web-memberships.md §2.2 — the reverse direction, for
// RecordPaymentDialog's amount field: a user types euros (with optional
// centimes, "150.50"), the ViewModel converts to integer cents before
// calling RecordPaymentUseCase. Rounds rather than truncates, to avoid a
// silent off-by-one-cent from floating point (e.g. 150.29 * 100 can
// evaluate to 15028.999999999998 before rounding).
export function eurosToCents(amountEuros: number): number {
  return Math.round(amountEuros * 100)
}

// specs/web-seasons.md §2.7 — Season.cotisationAmount is stored as a plain
// decimal number of euros (not integer cents, unlike the rest of this file
// — a developer call), so there's nothing to divide by 100 here. Rounds to
// 2 decimals first, to strip any float noise on read (e.g. 45.1 - 45 could
// otherwise reappear as 45.099999999999994), then drops a trailing ".00" so
// a whole-euro tarif still reads as "300€", not "300.00€".
export function formatEuroAmount(amount: number): string {
  return `${Number(amount.toFixed(2))}€`
}
