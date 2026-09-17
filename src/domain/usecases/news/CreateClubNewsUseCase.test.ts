import { describe, expect, it, vi } from 'vitest'
import type { ClubNews } from '../../entities/club-news'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidNewsInputError } from '../../errors/invalid-news-input-error'
import type { CreateClubNewsInput, NewsRepository } from '../../repositories/news-repository'
import type { User } from '../../entities/user'
import type { UserRepository } from '../../repositories/user-repository'
import { CreateClubNewsUseCase, type CreateClubNewsUseCaseInput } from './CreateClubNewsUseCase'

function adminUser(): User {
  return { id: 'admin-1', fullName: 'Admin', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function coachUser(): User {
  return { id: 'coach-1', fullName: 'Coach', email: 'coach@example.com', roles: [{ role: 'coach', teamIds: [] }], position: null, charterAcceptedAt: null }
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
  }
}

function fakeNewsRepository(overrides: Partial<NewsRepository> = {}): NewsRepository {
  return {
    listPublished: async () => [],
    listAll: async () => [],
    create: vi.fn(async (input: CreateClubNewsInput) => ({ id: 'news-1', createdAt: '2026-09-17T00:00:00.000Z', ...input }) satisfies ClubNews),
    update: async () => {
      throw new Error('not implemented')
    },
    archive: async () => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

function validInput(overrides: Partial<CreateClubNewsUseCaseInput> = {}): CreateClubNewsUseCaseInput {
  return {
    actorId: 'admin-1',
    title: 'Reprise des entraînements',
    details: 'Tous les groupes reprennent le 2 septembre',
    link: null,
    status: 'published',
    publishedAt: '2026-09-01T00:00:00.000Z',
    expiresAt: null,
    ...overrides,
  }
}

describe('CreateClubNewsUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new CreateClubNewsUseCase(fakeUserRepository(null), fakeNewsRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not admin', async () => {
    const useCase = new CreateClubNewsUseCase(fakeUserRepository(coachUser()), fakeNewsRepository())
    await expect(useCase.execute(validInput({ actorId: 'coach-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidNewsInputError when title is empty', async () => {
    const useCase = new CreateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository())
    await expect(useCase.execute(validInput({ title: '  ' }))).rejects.toThrow(InvalidNewsInputError)
  })

  it('throws InvalidNewsInputError when details is empty', async () => {
    const useCase = new CreateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository())
    await expect(useCase.execute(validInput({ details: '' }))).rejects.toThrow(InvalidNewsInputError)
  })

  it('throws InvalidNewsInputError when status is published and publishedAt is absent', async () => {
    const useCase = new CreateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository())
    await expect(useCase.execute(validInput({ status: 'published', publishedAt: null }))).rejects.toThrow(InvalidNewsInputError)
  })

  // 2026-09-17 developer decision (resolves PO-WA-02): draft is now a
  // selectable status, and a draft doesn't need a publish date yet — mirrors
  // club_news_published_has_date, which only constrains 'published' rows.
  it('accepts a missing publishedAt when status is draft', async () => {
    const create = vi.fn(async (input: CreateClubNewsInput) => ({ id: 'news-1', createdAt: '2026-09-17T00:00:00.000Z', ...input }) satisfies ClubNews)
    const useCase = new CreateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository({ create }))

    await useCase.execute(validInput({ status: 'draft', publishedAt: null }))

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', publishedAt: null }))
  })

  it('accepts a missing link and a missing expiresAt as valid', async () => {
    const create = vi.fn(async (input: CreateClubNewsInput) => ({ id: 'news-1', createdAt: '2026-09-17T00:00:00.000Z', ...input }) satisfies ClubNews)
    const useCase = new CreateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository({ create }))

    await useCase.execute(validInput({ link: null, expiresAt: null }))

    expect(create).toHaveBeenCalledOnce()
  })

  it('creates a published row with publishedAt from the DATE field and createdBy set to the actor', async () => {
    const create = vi.fn(async (input: CreateClubNewsInput) => ({ id: 'news-1', createdAt: '2026-09-17T00:00:00.000Z', ...input }) satisfies ClubNews)
    const useCase = new CreateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository({ create }))

    await useCase.execute(validInput())

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'published',
        publishedAt: '2026-09-01T00:00:00.000Z',
        createdBy: 'admin-1',
      }),
    )
  })
})
