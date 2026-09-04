import { describe, expect, it } from 'vitest'
import type { Membership } from '../../entities/membership'
import type { Season } from '../../entities/season'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { SeasonRepository } from '../../repositories/season-repository'
import { GetProfileMembershipUseCase } from './GetProfileMembershipUseCase'

// In-memory fakes, same pattern as sibling use case tests — no Supabase
// mock needed, domain/ is plain TypeScript.
function fakeSeasonRepository(season: Season | null): SeasonRepository {
  return { findCurrent: async () => season }
}

function fakeMembershipRepository(membership: Membership | null): MembershipRepository {
  return { findForUserAndSeason: async () => membership }
}

const season: Season = { id: 'season-1', label: '2026-2027', startDate: '2026-08-01', endDate: '2027-06-30' }

describe('GetProfileMembershipUseCase', () => {
  it("returns the user's membership and the current season label when both exist", async () => {
    const membership: Membership = {
      id: 'm1',
      userId: 'user-1',
      licenceNumber: 'LIC-123',
      status: 'active',
      seasonId: 'season-1',
      validUntil: '2027-06-30',
    }
    const useCase = new GetProfileMembershipUseCase(fakeMembershipRepository(membership), fakeSeasonRepository(season))

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual({
      membership,
      seasonLabel: '2026-2027',
    })
  })

  it('returns a null membership alongside the season label when the member has no row for the current season', async () => {
    const useCase = new GetProfileMembershipUseCase(fakeMembershipRepository(null), fakeSeasonRepository(season))

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual({
      membership: null,
      seasonLabel: '2026-2027',
    })
  })

  it('returns everything null during a gap between two seasons, without ever querying membership for that gap', async () => {
    let membershipRepositoryCalled = false
    const membershipRepository: MembershipRepository = {
      findForUserAndSeason: async () => {
        membershipRepositoryCalled = true
        return null
      },
    }
    const useCase = new GetProfileMembershipUseCase(membershipRepository, fakeSeasonRepository(null))

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual({
      membership: null,
      seasonLabel: null,
    })
    expect(membershipRepositoryCalled).toBe(false)
  })
})
