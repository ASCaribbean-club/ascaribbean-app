export type SeasonLabel = `${number}-${number}` // e.g. "2026-2027"

export interface Season {
  id: string
  label: SeasonLabel
  startDate: string // ISO date
  endDate: string // ISO date
  // specs/web-seasons.md §2.7/AC-WS-33/AC-WS-34 — amendement du 2026-09-17 (2):
  // the season's reference cotisation amount, in euros (a decimal, e.g.
  // 300 or 45.5) — deliberately not an integer-cents field like
  // Membership.amountDueCents, per the developer's own call. Nullable
  // ("tarif non fixé", distinct from 0 = "gratuit"). A pure reference read
  // by web-memberships — this feature never computes a payment status
  // from it.
  cotisationAmount: number | null
}
