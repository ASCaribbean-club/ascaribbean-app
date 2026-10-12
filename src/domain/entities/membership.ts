export type MembershipStatus = 'pending' | 'active' | 'suspended'

export interface Membership {
  id: string
  userId: string
  licenceNumber: string | null
  status: MembershipStatus
  seasonId: string
  validUntil: string // ISO date
  // specs/web-memberships.md §2.1/AC-WM-34 — amendement du 2026-09-17,
  // resolves PO-WM-01: the amount DUE for this membership's cotisation
  // ("Cotisation totale (€)" on the mockup's own edit panel), an integer
  // number of CENTS, never a float. Nullable: the "Nouvelle adhésion"
  // dialog does not carry this field (§2.1), so a membership can be
  // created with no amount due set yet — only the edit row (§1) writes it.
  amountDueCents: number | null
  // specs/coach-match-composition.md AC-MC-24 (amendement du 2026-10-12) —
  // default jersey number for THIS membership's season, integer 1..99
  // (PO-MC-15), nullable, no unicity (PO-MC-14). Prefills a lineup; a lineup
  // never writes back here (§1 "Aucune propagation").
  jerseyNumber: number | null
}
