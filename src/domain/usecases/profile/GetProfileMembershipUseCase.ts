import type { Membership } from '../../entities/membership'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { SeasonRepository } from '../../repositories/season-repository'

export interface GetProfileMembershipInput {
  userId: string
}

// specs/profile-page.md, 2026-09-04 addendum — resolves PO-PR-06.
// `seasonLabel` travels alongside `membership` rather than being a separate
// ViewModel field: a membership only means something in relation to which
// season it covers ("adhésion 2026-2027"), so the two are resolved and
// exposed together instead of forcing the Page to reconcile two
// independently-loading queries by hand.
export interface ProfileMembership {
  membership: Membership | null
  seasonLabel: string | null
}

export class GetProfileMembershipUseCase {
  constructor(
    private readonly membershipRepository: MembershipRepository,
    private readonly seasonRepository: SeasonRepository,
  ) { }

  async execute(input: GetProfileMembershipInput): Promise<ProfileMembership> {
    const season = await this.seasonRepository.findCurrent()

    // Gap between two seasons (e.g. summer break) — valid state, not an
    // error, same treatment as SeasonRepository.findCurrent's own contract
    // and TeamRepositoryImpl's handling of the same case.
    if (!season) return { membership: null, seasonLabel: null }

    const membership = await this.membershipRepository.findForUserAndSeason(input.userId, season.id)
    return { membership, seasonLabel: season.label }
  }
}
