import { describe, expect, it, vi } from 'vitest'
import type { Opponent } from '../../entities/opponent'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidOpponentInputError } from '../../errors/invalid-opponent-input-error'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { AddOpponentToTeamUseCase } from './AddOpponentToTeamUseCase'

function userWith(roles: User['roles']): User {
  return { id: 'user-1', fullName: 'Utilisateur', email: 'user@example.com', roles, position: null, charterAcceptedAt: null }
}

const admin = userWith([{ role: 'admin' }])
const coach = userWith([{ role: 'coach', teamIds: ['team-1'] }])
const sectionManager = userWith([{ role: 'section-manager', sectionId: 'section-1' }])

function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: async () => {},
    invite: async () => ({ url: 'https://app.example.com/fake' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/fake' }),
    generatePasswordResetLink: async () => ({ url: 'https://app.example.com/fake' }),
  }
}

function fakeOpponentRepository() {
  const addToTeam = vi.fn(async (_teamId: string, name: string): Promise<Opponent> => ({ id: 'opponent-1', name }))
  const repository: OpponentRepository = {
    findByTeamId: async () => [],
    findById: async () => null,
    create: async () => {
      throw new Error('not used by this feature')
    },
    addToTeam,
  }
  return { repository, addToTeam }
}

describe('AddOpponentToTeamUseCase', () => {
  it('forwards the trimmed name and the CHOSEN team id to the repository', async () => {
    const { repository, addToTeam } = fakeOpponentRepository()
    const useCase = new AddOpponentToTeamUseCase(fakeUserRepository(admin), repository)

    const result = await useCase.execute({ actorId: 'user-1', teamId: 'chosen-team', name: '  AS Exemple  ' })

    expect(addToTeam).toHaveBeenCalledWith('chosen-team', 'AS Exemple')
    expect(result).toEqual({ id: 'opponent-1', name: 'AS Exemple' })
  })

  it('keeps internal spaces and case untouched (strict equality rule, PO-TO-01)', async () => {
    const { repository, addToTeam } = fakeOpponentRepository()
    const useCase = new AddOpponentToTeamUseCase(fakeUserRepository(admin), repository)

    await useCase.execute({ actorId: 'user-1', teamId: 'team-1', name: ' as  Exemple ' })

    expect(addToTeam).toHaveBeenCalledWith('team-1', 'as  Exemple')
  })

  it.each([
    ['coach', coach],
    ['section-manager', sectionManager],
  ])('refuses a %s without any repository call', async (_label, user) => {
    const { repository, addToTeam } = fakeOpponentRepository()
    const useCase = new AddOpponentToTeamUseCase(fakeUserRepository(user), repository)

    await expect(useCase.execute({ actorId: 'user-1', teamId: 'team-1', name: 'AS Exemple' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(addToTeam).not.toHaveBeenCalled()
  })

  it('refuses an unknown actor', async () => {
    const { repository, addToTeam } = fakeOpponentRepository()
    const useCase = new AddOpponentToTeamUseCase(fakeUserRepository(null), repository)

    await expect(useCase.execute({ actorId: 'ghost', teamId: 'team-1', name: 'AS Exemple' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(addToTeam).not.toHaveBeenCalled()
  })

  it.each(['', '   ', '\t\n'])('refuses an empty or whitespace-only name %j without a network call', async (name) => {
    const { repository, addToTeam } = fakeOpponentRepository()
    const useCase = new AddOpponentToTeamUseCase(fakeUserRepository(admin), repository)

    await expect(useCase.execute({ actorId: 'user-1', teamId: 'team-1', name })).rejects.toBeInstanceOf(InvalidOpponentInputError)
    expect(addToTeam).not.toHaveBeenCalled()
  })

  it('refuses a missing team without a network call', async () => {
    const { repository, addToTeam } = fakeOpponentRepository()
    const useCase = new AddOpponentToTeamUseCase(fakeUserRepository(admin), repository)

    await expect(useCase.execute({ actorId: 'user-1', teamId: '', name: 'AS Exemple' })).rejects.toBeInstanceOf(InvalidOpponentInputError)
    expect(addToTeam).not.toHaveBeenCalled()
  })

  it('propagates a repository failure', async () => {
    const { repository, addToTeam } = fakeOpponentRepository()
    addToTeam.mockRejectedValueOnce(new ForbiddenError('rls'))
    const useCase = new AddOpponentToTeamUseCase(fakeUserRepository(admin), repository)

    await expect(useCase.execute({ actorId: 'user-1', teamId: 'team-1', name: 'AS Exemple' })).rejects.toBeInstanceOf(ForbiddenError)
  })
})
