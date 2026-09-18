import type { MembershipRepository } from '../../repositories/membership-repository'
import type { SeasonRepository } from '../../repositories/season-repository'

// specs/web-memberships.md §2.8/PO-WM-06 — the nav badge on "Adhésions".
//
// PO-WM-06 (open, non-blocking for construction per the spec's own table,
// and STILL open after the 2026-09-17 amendment — the amendment resolves
// PO-WM-01, not PO-WM-06, see §2.8/UI design "Badge de navigation": "Source
// du chiffre — non résolue ici, volontairement") leaves two readings on the
// table: "adhésions non intégralement payées" (what the developer asked for
// — 3 on the mockup's own 4 rows) vs. "adhésions au statut 'En attente'"
// (what the mockup itself actually renders — 2, matching its own ALERTE
// block). This use case deliberately picks the SECOND reading, and this is
// a decision this pass makes and flags, not a silent default. Before the
// amendment, the first ("payment-based") reading was additionally BLOCKED
// by PO-WM-01 (no amount-due value existed anywhere); that blocker is gone
// now that `amount_due_cents` exists (§2.1/AC-WM-34), but PO-WM-06 itself
// was never about data availability — it's an unresolved choice of
// DEFINITION the Bureau/developer still needs to make, so this pass keeps
// the status-based reading rather than silently switching definitions. The
// status-based reading needs no amount due at all, matches the mockup's own
// rendered badge AND its own ALERTE copy, and is fully implementable today.
// If PO-WM-06 is ever resolved in favour of "non intégralement payée",
// only this use case (and MembershipRepository.countPendingForSeason,
// renamed to match) needs to change — the badge's own rendering in
// BackofficeSidebar.tsx is already written to not care which definition
// feeds it (UI design, "Badge de navigation").
//
// §2.8 point 3 — scoped to the CURRENT season only (never "toutes saisons
// confondues", which would never shrink back to 0 and become permanent
// noise), consistent with the list screen's own default filter (§2.6b).
export class CountMembershipsRequiringAttentionUseCase {
  constructor(
    private readonly seasonRepository: SeasonRepository,
    private readonly membershipRepository: MembershipRepository,
  ) {}

  async execute(): Promise<number> {
    const season = await this.seasonRepository.findCurrent()
    // §2.6c/UI design "Repli si aucune saison en cours" — no current season
    // means no badge (0), never an error and never a count computed against
    // a season that doesn't exist.
    if (!season) return 0

    return this.membershipRepository.countPendingForSeason(season.id)
  }
}
