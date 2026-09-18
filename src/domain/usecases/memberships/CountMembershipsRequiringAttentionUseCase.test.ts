import { describe, expect, it, vi } from 'vitest'
import type { Season } from '../../entities/season'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { SeasonRepository } from '../../repositories/season-repository'
import { CountMembershipsRequiringAttentionUseCase } from './CountMembershipsRequiringAttentionUseCase'

function currentSeason(): Season {
  return { id: 'season-1', label: '2025-2026', startDate: '2025-09-01', endDate: '2026-06-30' }
}

function fakeSeasonRepository(overrides: Partial<SeasonRepository> = {}): SeasonRepository {
  return {
    findCurrent: async () => currentSeason(),
    findAll: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    update: async () => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

function fakeMembershipRepository(overrides: Partial<MembershipRepository> = {}): MembershipRepository {
  return {
    findForUserAndSeason: async () => null,
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
    countPendingForSeason: async () => 2,
    ...overrides,
  }
}

describe('CountMembershipsRequiringAttentionUseCase', () => {
  // §2.6c/§2.8 — gap between two seasons is a valid state, never an error,
  // and the badge must not compute a count against a season that doesn't
  // exist.
  it('returns 0 when no season is current, without calling the repository', async () => {
    const countPendingForSeason = vi.fn(async () => 5)
    const useCase = new CountMembershipsRequiringAttentionUseCase(
      fakeSeasonRepository({ findCurrent: async () => null }),
      fakeMembershipRepository({ countPendingForSeason }),
    )

    const result = await useCase.execute()

    expect(result).toBe(0)
    expect(countPendingForSeason).not.toHaveBeenCalled()
  })

  // §2.8 point 3 — scoped to the CURRENT season only.
  it('counts pending memberships scoped to the current season', async () => {
    const countPendingForSeason = vi.fn(async () => 2)
    const useCase = new CountMembershipsRequiringAttentionUseCase(fakeSeasonRepository(), fakeMembershipRepository({ countPendingForSeason }))

    const result = await useCase.execute()

    expect(countPendingForSeason).toHaveBeenCalledWith('season-1')
    expect(result).toBe(2)
  })
})
