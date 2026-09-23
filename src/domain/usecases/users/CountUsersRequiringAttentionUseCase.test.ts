import { describe, expect, it, vi } from 'vitest'
import type { Season } from '../../entities/season'
import type { SeasonRepository } from '../../repositories/season-repository'
import type { UserMissingElementFactsEntry, UserRepository } from '../../repositories/user-repository'
import { CountUsersRequiringAttentionUseCase } from './CountUsersRequiringAttentionUseCase'

function currentSeason(): Season {
  return { id: 'season-1', label: '2025-2026', startDate: '2025-09-01', endDate: '2026-06-30', cotisationAmount: null }
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

function fakeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: async () => null,
    acceptCharter: async () => {},
    findAll: async () => [],
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: async () => {},
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
    ...overrides,
  }
}

function factsEntry(userId: string, missing: boolean): UserMissingElementFactsEntry {
  return {
    userId,
    facts: {
      hasRole: !missing,
      hasMembershipForCurrentSeason: true,
      hasLicenceNumberForCurrentSeason: true,
      charterAccepted: true,
    },
  }
}

describe('CountUsersRequiringAttentionUseCase', () => {
  // §2.8 point 3 — dedicated, light read, never the full directory counted
  // client-side.
  it('counts accounts whose facts trip hasMissingElement, scoped to the current season', async () => {
    const findMissingElementFacts = vi.fn(async () => [factsEntry('u1', true), factsEntry('u2', false), factsEntry('u3', true)])
    const useCase = new CountUsersRequiringAttentionUseCase(fakeSeasonRepository(), fakeUserRepository({ findMissingElementFacts }))

    const result = await useCase.execute()

    expect(findMissingElementFacts).toHaveBeenCalledWith('season-1')
    expect(result).toBe(2)
  })

  // §2.8 UI design — "compte des comptes, pas des critères": an account
  // failing every criterion at once still adds exactly ONE.
  it('counts an account failing all four criteria only once', async () => {
    const findMissingElementFacts = vi.fn(async () => [
      {
        userId: 'u1',
        facts: { hasRole: false, hasMembershipForCurrentSeason: false, hasLicenceNumberForCurrentSeason: false, charterAccepted: false },
      },
    ])
    const useCase = new CountUsersRequiringAttentionUseCase(fakeSeasonRepository(), fakeUserRepository({ findMissingElementFacts }))

    expect(await useCase.execute()).toBe(1)
  })

  // §2.3 "repli" — no current season is NOT an error and does not zero the
  // whole count: criteria 1/4 still apply, fed in as facts already forced
  // false for 2/3 by the repository, never recomputed here.
  it('passes null when there is no current season, without treating that as an error', async () => {
    const findMissingElementFacts = vi.fn(async () => [factsEntry('u1', true)])
    const useCase = new CountUsersRequiringAttentionUseCase(
      fakeSeasonRepository({ findCurrent: async () => null }),
      fakeUserRepository({ findMissingElementFacts }),
    )

    const result = await useCase.execute()

    expect(findMissingElementFacts).toHaveBeenCalledWith(null)
    expect(result).toBe(1)
  })

  it('returns 0 when no account has a missing element', async () => {
    const findMissingElementFacts = vi.fn(async () => [factsEntry('u1', false), factsEntry('u2', false)])
    const useCase = new CountUsersRequiringAttentionUseCase(fakeSeasonRepository(), fakeUserRepository({ findMissingElementFacts }))

    expect(await useCase.execute()).toBe(0)
  })
})
