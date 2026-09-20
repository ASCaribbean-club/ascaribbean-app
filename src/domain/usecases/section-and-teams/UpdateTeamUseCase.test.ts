import { describe, expect, it, vi } from 'vitest'
import type { Team } from '../../entities/team'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTeamInputError } from '../../errors/invalid-team-input-error'
import type { TeamRepository, UpdateTeamInput } from '../../repositories/team-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { UpdateTeamUseCase, type UpdateTeamUseCaseInput } from './UpdateTeamUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function sectionManagerUser(): User {
  return {
    id: 'section-manager-1',
    fullName: 'Responsable de section',
    email: 'section-manager@example.com',
    roles: [{ role: 'section-manager', sectionId: 'section-1' }],
    position: null,
    charterAcceptedAt: null,
  }
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
    // specs/web-users.md §2.10 — added by that feature to UserRepository,
    // unrelated to this test's own assertions; stubbed so the fake keeps
    // satisfying the interface.
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateFullName: async () => {},
    invite: async () => {},
  }
}

function fakeTeamRepository(overrides: Partial<TeamRepository> = {}): TeamRepository {
  return {
    findByIds: async () => [],
    findById: async () => null,
    countActiveMembers: async () => 0,
    findAllForAdmin: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    update: vi.fn(async (id: string, input: UpdateTeamInput) => ({ id, ...input }) satisfies Team),
    ...overrides,
  }
}

function validInput(overrides: Partial<UpdateTeamUseCaseInput> = {}): UpdateTeamUseCaseInput {
  return {
    actorId: 'admin-1',
    teamId: 'team-1',
    name: 'Groupe A',
    sectionId: 'section-1',
    seasonId: 'season-1',
    ...overrides,
  }
}

describe('UpdateTeamUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(null), fakeTeamRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(sectionManagerUser()), fakeTeamRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidTeamInputError when name is empty', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository())
    await expect(useCase.execute(validInput({ name: '' }))).rejects.toThrow(InvalidTeamInputError)
  })

  it('throws InvalidTeamInputError when sectionId is missing', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository())
    await expect(useCase.execute(validInput({ sectionId: '' }))).rejects.toThrow(InvalidTeamInputError)
  })

  it('throws InvalidTeamInputError when seasonId is missing', async () => {
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository())
    await expect(useCase.execute(validInput({ seasonId: '' }))).rejects.toThrow(InvalidTeamInputError)
  })

  // AC-ST-24 — updates the SAME row, never creates a duplicate.
  it('updates the targeted team id with the trimmed name and given section/season ids', async () => {
    const update = vi.fn(async (id: string, input: UpdateTeamInput) => ({ id, ...input }) satisfies Team)
    const useCase = new UpdateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository({ update }))

    await useCase.execute(validInput({ teamId: 'team-42', name: '  Groupe B  ' }))

    expect(update).toHaveBeenCalledWith('team-42', { name: 'Groupe B', sectionId: 'section-1', seasonId: 'season-1' })
  })
})
