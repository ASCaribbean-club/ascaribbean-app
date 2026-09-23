import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidFullNameInputError } from '../../errors/invalid-full-name-input-error'
import type { UserRepository } from '../../repositories/user-repository'
import { UpdateUserFullNameUseCase, type UpdateUserFullNameUseCaseInput } from './UpdateUserFullNameUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function playerUser(): User {
  return {
    id: 'player-1',
    fullName: 'Joueur',
    email: 'player@example.com',
    roles: [{ role: 'player', teamId: 'team-1' }],
    position: null,
    charterAcceptedAt: null,
  }
}

function fakeUserRepository(user: User | null, overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: vi.fn(async () => {}),
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
    ...overrides,
  }
}

function validInput(overrides: Partial<UpdateUserFullNameUseCaseInput> = {}): UpdateUserFullNameUseCaseInput {
  return { actorId: 'admin-1', userId: 'player-1', fullName: 'Nouveau nom', ...overrides }
}

describe('UpdateUserFullNameUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new UpdateUserFullNameUseCase(fakeUserRepository(null))
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not an admin', async () => {
    const useCase = new UpdateUserFullNameUseCase(fakeUserRepository(playerUser()))
    await expect(useCase.execute(validInput({ actorId: 'player-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidFullNameInputError when fullName is blank', async () => {
    const useCase = new UpdateUserFullNameUseCase(fakeUserRepository(adminUser()))
    await expect(useCase.execute(validInput({ fullName: '   ' }))).rejects.toThrow(InvalidFullNameInputError)
  })

  it('throws InvalidFullNameInputError when userId is missing', async () => {
    const useCase = new UpdateUserFullNameUseCase(fakeUserRepository(adminUser()))
    await expect(useCase.execute(validInput({ userId: '' }))).rejects.toThrow(InvalidFullNameInputError)
  })

  it('updates with the trimmed fullName', async () => {
    const updateFullName = vi.fn(async () => {})
    const useCase = new UpdateUserFullNameUseCase(fakeUserRepository(adminUser(), { updateFullName }))

    await useCase.execute(validInput({ fullName: '  Nouveau nom  ' }))

    expect(updateFullName).toHaveBeenCalledWith('player-1', 'Nouveau nom')
  })

  // AC-WU-25 — the policy permits an admin to edit their own row too;
  // nothing in the domain forbids it either (§2.7, sous-question
  // résiduelle non bloquante).
  it('allows an admin to update their own fullName', async () => {
    const updateFullName = vi.fn(async () => {})
    const useCase = new UpdateUserFullNameUseCase(fakeUserRepository(adminUser(), { updateFullName }))

    await useCase.execute(validInput({ userId: 'admin-1' }))

    expect(updateFullName).toHaveBeenCalledWith('admin-1', 'Nouveau nom')
  })
})
