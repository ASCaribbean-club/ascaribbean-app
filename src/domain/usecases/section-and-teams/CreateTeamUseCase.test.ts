import { describe, expect, it, vi } from 'vitest'
import type { Team } from '../../entities/team'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTeamInputError } from '../../errors/invalid-team-input-error'
import type { CreateTeamInput, TeamRepository } from '../../repositories/team-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { CreateTeamUseCase, type CreateTeamUseCaseInput } from './CreateTeamUseCase'

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
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
  }
}

function fakeTeamRepository(overrides: Partial<TeamRepository> = {}): TeamRepository {
  return {
    findByIds: async () => [],
    findById: async () => null,
    countActiveMembers: async () => 0,
    findAllForAdmin: async () => [],
    create: vi.fn(async (input: CreateTeamInput) => ({ id: 'team-1', ...input }) satisfies Team),
    update: async () => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

function validInput(overrides: Partial<CreateTeamUseCaseInput> = {}): CreateTeamUseCaseInput {
  return {
    actorId: 'admin-1',
    name: 'Groupe A',
    sectionId: 'section-1',
    seasonId: 'season-1',
    ...overrides,
  }
}

describe('CreateTeamUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new CreateTeamUseCase(fakeUserRepository(null), fakeTeamRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  // §3 — a section-manager must never be granted this write in this pass
  // (PO-ST-05), not even for their own section.
  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new CreateTeamUseCase(fakeUserRepository(sectionManagerUser()), fakeTeamRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1', sectionId: 'section-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidTeamInputError when name is empty', async () => {
    const useCase = new CreateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository())
    await expect(useCase.execute(validInput({ name: '   ' }))).rejects.toThrow(InvalidTeamInputError)
  })

  // §2.2/AC-ST-11 — "Section et saison sont obligatoires", the mockup's own
  // rule, enforced from the domain before any network call.
  it('throws InvalidTeamInputError when sectionId is missing', async () => {
    const useCase = new CreateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository())
    await expect(useCase.execute(validInput({ sectionId: '' }))).rejects.toThrow(InvalidTeamInputError)
  })

  it('throws InvalidTeamInputError when seasonId is missing', async () => {
    const useCase = new CreateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository())
    await expect(useCase.execute(validInput({ seasonId: '' }))).rejects.toThrow(InvalidTeamInputError)
  })

  it('creates a team with the trimmed name and given section/season ids', async () => {
    const create = vi.fn(async (input: CreateTeamInput) => ({ id: 'team-1', ...input }) satisfies Team)
    const useCase = new CreateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository({ create }))

    await useCase.execute(validInput({ name: '  Groupe A  ' }))

    expect(create).toHaveBeenCalledWith({ name: 'Groupe A', sectionId: 'section-1', seasonId: 'season-1' })
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    class FakeRepositoryError extends Error {}
    const create = vi.fn(async () => {
      throw new FakeRepositoryError('boom')
    })
    const useCase = new CreateTeamUseCase(fakeUserRepository(adminUser()), fakeTeamRepository({ create }))

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeRepositoryError)
  })
})
