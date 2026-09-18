// specs/web-memberships.md §2.2 — amounts live in the domain/data as
// strictly-positive integer cents, NEVER a float (a `300€` saved as a float
// re-serializes as `299,99999…`, per that section's own warning). Rendering
// to "X€" is exactly the kind of formatting concern CLAUDE.md §5 assigns to
// presentation/shared/formatters/, never to domain/ or data/.
//
// Deliberately whole-euro only (no cents shown, e.g. "150€", not "150,00€"):
// every amount in this feature's mockup and dialogs is entered/displayed in
// whole euros (RecordPaymentDialog's `step="0.01"` input still allows a
// centime-precise entry, but nothing in the mockup ever shows one) — this
// formatter rounds to the nearest euro for DISPLAY only, it never touches
// the underlying integer-cents value it's given.
export function formatEuros(amountCents: number): string {
  const euros = amountCents / 100
  return `${Math.round(euros)}€`
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
