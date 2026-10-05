import { describe, expect, it } from 'vitest'
import type { Membership } from '../../entities/membership'
import type { Season } from '../../entities/season'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { Payment } from '../../entities/payment'
import type { PaymentRepository } from '../../repositories/payment-repository'
import type { SeasonRepository } from '../../repositories/season-repository'
import { GetProfileMembershipUseCase } from './GetProfileMembershipUseCase'

// In-memory fakes, same pattern as sibling use case tests — no Supabase
// mock needed, domain/ is plain TypeScript.
function fakeSeasonRepository(season: Season | null): SeasonRepository {
  return {
    findCurrent: async () => season,
    // Not exercised by this use case (it only ever calls findCurrent) —
    // specs/web-seasons.md §2.6 extended SeasonRepository with these three
    // methods, unrelated to this test's own concern.
    findAll: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    update: async () => {
      throw new Error('not implemented')
    },
  }
}

function fakePaymentRepository(payments: Payment[] = []): PaymentRepository {
  return {
    listForMembership: async () => payments,
    findAllForAdmin: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
  }
}

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: 'p1',
    membershipId: 'm1',
    amountCents: 5000,
    paidAt: '2026-09-10',
    paymentMethod: 'card',
    recordedBy: 'treasurer-1',
    recordedAt: '2026-09-10T10:00:00Z',
    ...overrides,
  }
}

function fakeMembershipRepository(membership: Membership | null): MembershipRepository {
  return {
    findForUserAndSeason: async () => membership,
    // Not exercised by this use case (it only ever calls
    // findForUserAndSeason) — specs/web-memberships.md §2.10 extended
    // MembershipRepository with these methods, unrelated to this test's own
    // concern.
    findAllForAdmin: async () => [],
    findArchivedForUserAndSeason: async () => null,
    create: async () => {
      throw new Error('not implemented')
    },
    update: async () => {
      throw new Error('not implemented')
    },
    replaceArchived: async () => {
      throw new Error('not implemented')
    },
    archive: async () => {
      throw new Error('not implemented')
    },
    countPendingForSeason: async () => 0,
  }
}

const season: Season = { id: 'season-1', label: '2026-2027', startDate: '2026-08-01', endDate: '2027-06-30', cotisationAmount: null, paymentUrl: null }

describe('GetProfileMembershipUseCase', () => {
  it("returns the user's membership and the current season label when both exist", async () => {
    const membership: Membership = {
      id: 'm1',
      userId: 'user-1',
      licenceNumber: 'LIC-123',
      status: 'active',
      seasonId: 'season-1',
      validUntil: '2027-06-30',
      amountDueCents: null,
    }
    const useCase = new GetProfileMembershipUseCase(fakeMembershipRepository(membership), fakeSeasonRepository(season), fakePaymentRepository())

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual({
      membership,
      seasonLabel: '2026-2027',
      dues: {
        amountDueCents: null,
        paidCents: 0,
        status: 'undefined',
        payments: [],
        paymentUrl: null,
        showPaymentLink: false,
      },
    })
  })

  it('returns a null membership alongside the season label when the member has no row for the current season', async () => {
    const useCase = new GetProfileMembershipUseCase(fakeMembershipRepository(null), fakeSeasonRepository(season), fakePaymentRepository())

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual({
      membership: null,
      seasonLabel: '2026-2027',
      dues: null,
    })
  })

  it('returns everything null during a gap between two seasons, without ever querying membership for that gap', async () => {
    let membershipRepositoryCalled = false
    const membershipRepository: MembershipRepository = {
      findForUserAndSeason: async () => {
        membershipRepositoryCalled = true
        return null
      },
      findAllForAdmin: async () => [],
      findArchivedForUserAndSeason: async () => null,
      create: async () => {
        throw new Error('not implemented')
      },
      update: async () => {
        throw new Error('not implemented')
      },
      replaceArchived: async () => {
        throw new Error('not implemented')
      },
      archive: async () => {
        throw new Error('not implemented')
      },
      countPendingForSeason: async () => 0,
    }
    const useCase = new GetProfileMembershipUseCase(membershipRepository, fakeSeasonRepository(null), fakePaymentRepository())

    await expect(useCase.execute({ userId: 'user-1' })).resolves.toEqual({
      membership: null,
      seasonLabel: null,
      dues: null,
    })
    expect(membershipRepositoryCalled).toBe(false)
  })

  // specs/profile-membership-dues.md AC-PMD-05/AC-PMD-11 — the member's own dues.
  describe('dues', () => {
    const baseMembership: Membership = {
      id: 'm1',
      userId: 'user-1',
      licenceNumber: null,
      status: 'active',
      seasonId: 'season-1',
      validUntil: '2027-06-30',
      amountDueCents: 12000,
    }
    const payUrl = 'https://pay.example.org/cotisation'

    function build(membership: Membership, payments: Payment[], seasonOverrides: Partial<Season> = {}) {
      return new GetProfileMembershipUseCase(
        fakeMembershipRepository(membership),
        fakeSeasonRepository({ ...season, paymentUrl: payUrl, ...seasonOverrides }),
        fakePaymentRepository(payments),
      )
    }

    it('reports an unpaid cotisation with the link when nothing was paid', async () => {
      const result = await build(baseMembership, []).execute({ userId: 'user-1' })

      expect(result.dues).toEqual({
        amountDueCents: 12000,
        paidCents: 0,
        status: 'unpaid',
        payments: [],
        paymentUrl: payUrl,
        showPaymentLink: true,
      })
    })

    it('reports a partial cotisation, summing payments and keeping the repository order', async () => {
      const newest = payment({ id: 'p2', amountCents: 3000, paidAt: '2026-10-01' })
      const oldest = payment({ id: 'p1', amountCents: 5000, paidAt: '2026-09-10' })

      const result = await build(baseMembership, [newest, oldest]).execute({ userId: 'user-1' })

      expect(result.dues?.paidCents).toBe(8000)
      expect(result.dues?.status).toBe('partial')
      expect(result.dues?.payments).toEqual([newest, oldest])
      expect(result.dues?.showPaymentLink).toBe(true)
    })

    it('hides the link once settled, including over-payment', async () => {
      const result = await build(baseMembership, [payment({ amountCents: 13000 })]).execute({ userId: 'user-1' })

      expect(result.dues?.status).toBe('paid')
      expect(result.dues?.paidCents).toBe(13000)
      expect(result.dues?.showPaymentLink).toBe(false)
    })

    it('falls back to the season tariff (euros -> cents) when the membership has no own amount', async () => {
      const result = await build({ ...baseMembership, amountDueCents: null }, [], { cotisationAmount: 80 }).execute({ userId: 'user-1' })

      expect(result.dues?.amountDueCents).toBe(8000)
      expect(result.dues?.status).toBe('unpaid')
    })

    it('reports an undefined status without a link when no amount due exists anywhere', async () => {
      const result = await build({ ...baseMembership, amountDueCents: null }, [payment({})]).execute({ userId: 'user-1' })

      expect(result.dues?.amountDueCents).toBeNull()
      expect(result.dues?.paidCents).toBe(5000)
      expect(result.dues?.status).toBe('undefined')
      expect(result.dues?.showPaymentLink).toBe(false)
    })

    it('hides the link when the season carries no payment URL', async () => {
      const result = await build(baseMembership, [], { paymentUrl: null }).execute({ userId: 'user-1' })

      expect(result.dues?.status).toBe('unpaid')
      expect(result.dues?.paymentUrl).toBeNull()
      expect(result.dues?.showPaymentLink).toBe(false)
    })

    it('never reads payments when there is no membership', async () => {
      let paymentsRead = false
      const paymentRepository = { ...fakePaymentRepository(), listForMembership: async () => { paymentsRead = true; return [] } }
      const useCase = new GetProfileMembershipUseCase(fakeMembershipRepository(null), fakeSeasonRepository(season), paymentRepository)

      await useCase.execute({ userId: 'user-1' })

      expect(paymentsRead).toBe(false)
    })
  })
})
