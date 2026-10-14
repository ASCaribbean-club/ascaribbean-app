import { describe, expect, it, vi } from 'vitest'
import type { LegacyTierInput } from '@domain/entities/legacy'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { SaveLegacyTiersUseCase } from './SaveLegacyTiersUseCase'

function user(roles: User['roles']): User {
  return { id: 'u1', fullName: 'Utilisateur', email: 'u@example.com', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

const TIER: LegacyTierInput = {
  rank: 1,
  name: 'Bronze',
  minSeasons: 1,
  minPoints: 200,
  rewardLabel: 'Ensemble',
  discountPercent: 5,
  discountLifetime: false,
}

function build(actor: User | null) {
  const saveTiers = vi.fn(async () => 3)
  const users = { findById: async () => actor } as unknown as UserRepository
  const legacy = { saveTiers } as unknown as LegacyRepository
  return { useCase: new SaveLegacyTiersUseCase(users, legacy), saveTiers }
}

describe('SaveLegacyTiersUseCase', () => {
  it('lets an admin save a valid ladder and returns the seasons reached', async () => {
    const { useCase, saveTiers } = build(user([{ role: 'admin' }]))
    await expect(useCase.execute({ actorId: 'u1', tiers: [TIER] })).resolves.toBe(3)
    expect(saveTiers).toHaveBeenCalledWith([TIER])
  })

  it('refuses a non-admin before validating', async () => {
    const { useCase, saveTiers } = build(user([{ role: 'treasurer' }]))
    await expect(useCase.execute({ actorId: 'u1', tiers: [] })).rejects.toThrow(ForbiddenError)
    expect(saveTiers).not.toHaveBeenCalled()
  })

  it('rejects an incoherent ladder without any network call', async () => {
    const { useCase, saveTiers } = build(user([{ role: 'admin' }]))
    await expect(useCase.execute({ actorId: 'u1', tiers: [{ ...TIER, rank: 2 }] })).rejects.toThrow(InvalidLegacyInputError)
    expect(saveTiers).not.toHaveBeenCalled()
  })
})
