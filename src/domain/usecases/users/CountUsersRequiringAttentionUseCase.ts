import { hasMissingElement } from '../../policies/user-completeness'
import type { SeasonRepository } from '../../repositories/season-repository'
import type { UserRepository } from '../../repositories/user-repository'

// specs/web-users.md §2.3/§2.8/AC-WU-16/AC-WU-17 — the nav badge on
// "Utilisateurs". A DELIBERATE TWIN of CountMembershipsRequiringAttentionUseCase
// (copied, not reinvented, per §2.8's own instruction): same shape (resolve
// the current season, then run one light, dedicated read), same "no current
// season means 0, never an error" fallback.
//
// Counts ACCOUNTS "à traiter", never CRITERIA: an account failing three of
// the four §2.3 criteria at once still adds exactly ONE to this count
// (§2.8, UI design "Icône d'avertissement de ligne et badge de navigation" —
// "compte des comptes, pas des critères").
export class CountUsersRequiringAttentionUseCase {
  constructor(
    private readonly seasonRepository: SeasonRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<number> {
    const season = await this.seasonRepository.findCurrent()
    // §2.3 "repli" — no current season means criteria 2/3 are unevaluable,
    // NOT that the whole count is undefined: findMissingElementFacts(null)
    // already returns both as `false` for every account (never an error),
    // so this still counts accounts failing criteria 1/4 alone. Mirrors
    // CountMembershipsRequiringAttentionUseCase's OWN "no current season
    // means no badge (0)" only in spirit, not literally — that use case's
    // count is entirely season-scoped (nothing to count without one), this
    // one isn't.
    const entries = await this.userRepository.findMissingElementFacts(season?.id ?? null)
    return entries.filter((entry) => hasMissingElement(entry.facts)).length
  }
}
