// specs/web-memberships.md §2.2 — a payment is a dated, cumulative FACT, not
// a current-state row (CLAUDE.md §6's "upsert-on-conflict" rule for
// AttendanceRecord/ConvocationResponse deliberately does NOT apply here —
// see the migration's own comment for the explicit exception). One
// Membership has MANY Payment rows over time (0€ → 150€ → 300€), never one
// overwritten "amount paid" field.
export interface Payment {
  id: string
  membershipId: string
  // Strictly positive integer, in cents — never a float (§2.2: "300€ saisi
  // en flottant se réécrit 299,99999…"). Formatting to "300€" is a
  // presentation/shared/formatters/ concern, never a domain concern.
  amountCents: number
  paidAt: string // ISO date (yyyy-mm-dd) — date the payment was RECEIVED, not a due date (§1, no échéancier here).
  recordedBy: string // the account that recorded this payment (§4 — attribution, not the audit log itself).
  recordedAt: string // ISO timestamp — when the entry was made, may differ from paidAt (a cheque received yesterday, entered today).
}
