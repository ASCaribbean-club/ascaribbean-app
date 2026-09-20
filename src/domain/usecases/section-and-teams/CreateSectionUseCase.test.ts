import { describe, expect, it, vi } from 'vitest'
import type { Section } from '../../entities/section'
import type { User } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidSectionInputError } from '../../errors/invalid-section-input-error'
import type { CreateSectionInput, SectionRepository } from '../../repositories/section-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { CreateSectionUseCase, type CreateSectionUseCaseInput } from './CreateSectionUseCase'

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

function fakeSectionRepository(overrides: Partial<SectionRepository> = {}): SectionRepository {
  return {
    findById: async () => null,
    findAll: async () => [],
    create: vi.fn(async (input: CreateSectionInput) => ({ id: 'section-1', createdAt: '2026-09-17T00:00:00.000Z', ...input }) satisfies Section),
    update: async () => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

function validInput(overrides: Partial<CreateSectionUseCaseInput> = {}): CreateSectionUseCaseInput {
  return {
    actorId: 'admin-1',
    name: 'Senior masculin',
    type: 'football',
    ...overrides,
  }
}

describe('CreateSectionUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new CreateSectionUseCase(fakeUserRepository(null), fakeSectionRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  // §3 — a section-manager must never be granted this write, not even by
  // analogy with 'section:manage'.
  it('throws ForbiddenError when the actor is a section-manager, not an admin', async () => {
    const useCase = new CreateSectionUseCase(fakeUserRepository(sectionManagerUser()), fakeSectionRepository())
    await expect(useCase.execute(validInput({ actorId: 'section-manager-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidSectionInputError when name is empty', async () => {
    const useCase = new CreateSectionUseCase(fakeUserRepository(adminUser()), fakeSectionRepository())
    await expect(useCase.execute(validInput({ name: '  ' }))).rejects.toThrow(InvalidSectionInputError)
  })

  // AC-ST-11 — a type outside the four SECTION_TYPES values is rejected
  // from the domain, before any network call.
  it('throws InvalidSectionInputError when type is not one of the four allowed values', async () => {
    const useCase = new CreateSectionUseCase(fakeUserRepository(adminUser()), fakeSectionRepository())
    await expect(useCase.execute(validInput({ type: 'rugby' }))).rejects.toThrow(InvalidSectionInputError)
  })

  it('creates a section with the trimmed name and given type', async () => {
    const create = vi.fn(async (input: CreateSectionInput) => ({ id: 'section-1', createdAt: '2026-09-17T00:00:00.000Z', ...input }) satisfies Section)
    const useCase = new CreateSectionUseCase(fakeUserRepository(adminUser()), fakeSectionRepository({ create }))

    await useCase.execute(validInput({ name: '  Senior masculin  ' }))

    expect(create).toHaveBeenCalledWith({ name: 'Senior masculin', type: 'football' })
  })

  it('propagates whatever error the repository throws, without swallowing or rewrapping it', async () => {
    class FakeRepositoryError extends Error {}
    const create = vi.fn(async () => {
      throw new FakeRepositoryError('boom')
    })
    const useCase = new CreateSectionUseCase(fakeUserRepository(adminUser()), fakeSectionRepository({ create }))

    await expect(useCase.execute(validInput())).rejects.toThrow(FakeRepositoryError)
  })
})
