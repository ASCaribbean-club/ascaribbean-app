import { describe, expect, it, vi } from 'vitest'
import type { User } from '@domain/entities/user'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidLegacyInputError } from '@domain/errors/invalid-legacy-input-error'
import type { LegacyRepository } from '@domain/repositories/legacy-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { SetLegacySeasonModeUseCase } from './SetLegacySeasonModeUseCase'

function user(roles: User['roles']): User {
  return { id: 'u1', fullName: 'Utilisateur', email: 'u@example.com', roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

function build(actor: User | null) {
  const setSeasonMode = vi.fn(async () => {})
  const users = { findById: async () => actor } as unknown as UserRepository
  const legacy = { setSeasonMode } as unknown as LegacyRepository
  return { useCase: new SetLegacySeasonModeUseCase(users, legacy), setSeasonMode }
}

describe('SetLegacySeasonModeUseCase', () => {
  it('lets an admin set the mode', async () => {
    const { useCase, setSeasonMode } = build(user([{ role: 'admin' }]))
    await useCase.execute({ actorId: 'u1', seasonId: 's1', mode: 'per_season' })
    expect(setSeasonMode).toHaveBeenCalledWith('s1', 'per_season')
  })

  it('refuses a non-admin before validating anything', async () => {
    const { useCase, setSeasonMode } = build(user([{ role: 'authorized-officer' }]))
    await expect(useCase.execute({ actorId: 'u1', seasonId: 's1', mode: 'nope' })).rejects.toThrow(ForbiddenError)
    expect(setSeasonMode).not.toHaveBeenCalled()
  })

  it('refuses an unknown user', async () => {
    const { useCase } = build(null)
    await expect(useCase.execute({ actorId: 'u1', seasonId: 's1', mode: 'cumulative' })).rejects.toThrow(ForbiddenError)
  })

  it('rejects an unknown mode', async () => {
    const { useCase, setSeasonMode } = build(user([{ role: 'admin' }]))
    await expect(useCase.execute({ actorId: 'u1', seasonId: 's1', mode: '' })).rejects.toThrow(InvalidLegacyInputError)
    expect(setSeasonMode).not.toHaveBeenCalled()
  })
})
