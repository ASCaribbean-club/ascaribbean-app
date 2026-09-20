import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidUserInputError } from '../../errors/invalid-user-input-error'
import type { UserRepository } from '../../repositories/user-repository'
import { InviteUserUseCase, type InviteUserUseCaseInput } from './InviteUserUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function coachUser(): User {
  return {
    id: 'coach-1',
    fullName: 'Coach',
    email: 'coach@example.com',
    roles: [{ role: 'coach', teamIds: ['team-1'] }],
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
    updateFullName: async () => {},
    invite: vi.fn(async () => {}),
    ...overrides,
  }
}

function validInput(overrides: Partial<InviteUserUseCaseInput> = {}): InviteUserUseCaseInput {
  return { actorId: 'admin-1', fullName: 'Nouveau membre', email: 'nouveau@example.com', ...overrides }
}

describe('InviteUserUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new InviteUserUseCase(fakeUserRepository(null))
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not an admin', async () => {
    const useCase = new InviteUserUseCase(fakeUserRepository(coachUser()))
    await expect(useCase.execute(validInput({ actorId: 'coach-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidUserInputError when fullName is blank', async () => {
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser()))
    await expect(useCase.execute(validInput({ fullName: '   ' }))).rejects.toThrow(InvalidUserInputError)
  })

  it('throws InvalidUserInputError when email is blank', async () => {
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser()))
    await expect(useCase.execute(validInput({ email: '' }))).rejects.toThrow(InvalidUserInputError)
  })

  it('invites with the trimmed fullName and email', async () => {
    const invite = vi.fn(async () => {})
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser(), { invite }))

    await useCase.execute(validInput({ fullName: '  Nouveau membre  ', email: '  nouveau@example.com  ' }))

    expect(invite).toHaveBeenCalledWith({ fullName: 'Nouveau membre', email: 'nouveau@example.com' })
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    class FakeRepositoryError extends Error {}
    const invite = vi.fn(async () => {
      throw new FakeRepositoryError('boom')
    })
    const useCase = new InviteUserUseCase(fakeUserRepository(adminUser(), { invite }))

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeRepositoryError)
  })
})
