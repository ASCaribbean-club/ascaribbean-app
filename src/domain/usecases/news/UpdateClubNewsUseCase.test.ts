import { describe, expect, it, vi } from 'vitest'
import type { ClubNews } from '../../entities/club-news'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidNewsInputError } from '../../errors/invalid-news-input-error'
import type { NewsRepository, UpdateClubNewsInput } from '../../repositories/news-repository'
import type { User } from '../../entities/user'
import type { UserRepository } from '../../repositories/user-repository'
import { UpdateClubNewsUseCase, type UpdateClubNewsUseCaseInput } from './UpdateClubNewsUseCase'

function adminUser(id = 'admin-1'): User {
  return { id, fullName: 'Admin', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: null }
}

function coachUser(): User {
  return { id: 'coach-1', fullName: 'Coach', email: 'coach@example.com', roles: [{ role: 'coach', teamIds: [] }], position: null, charterAcceptedAt: null }
}

function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
  }
}

function existingNews(): ClubNews {
  return {
    id: 'news-1',
    title: 'Ancien titre',
    details: 'Ancien contenu',
    link: null,
    status: 'published',
    publishedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-07-30T00:00:00.000Z',
    createdBy: 'other-admin',
    expiresAt: null,
  }
}

function fakeNewsRepository(overrides: Partial<NewsRepository> = {}): NewsRepository {
  return {
    listPublished: async () => [],
    listAll: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    update: vi.fn(async (id: string, input: UpdateClubNewsInput) => ({ ...existingNews(), id, ...input }) satisfies ClubNews),
    archive: async () => {
      throw new Error('not implemented')
    },
    ...overrides,
  }
}

function validInput(overrides: Partial<UpdateClubNewsUseCaseInput> = {}): UpdateClubNewsUseCaseInput {
  return {
    actorId: 'admin-1',
    newsId: 'news-1',
    title: 'Nouveau titre',
    details: 'Nouveau contenu',
    link: null,
    status: 'published',
    publishedAt: '2026-09-01T00:00:00.000Z',
    expiresAt: null,
    ...overrides,
  }
}

describe('UpdateClubNewsUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new UpdateClubNewsUseCase(fakeUserRepository(null), fakeNewsRepository())
    await expect(useCase.execute(validInput())).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not admin', async () => {
    const useCase = new UpdateClubNewsUseCase(fakeUserRepository(coachUser()), fakeNewsRepository())
    await expect(useCase.execute(validInput({ actorId: 'coach-1' }))).rejects.toThrow(ForbiddenError)
  })

  it('throws InvalidNewsInputError when title is empty', async () => {
    const useCase = new UpdateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository())
    await expect(useCase.execute(validInput({ title: '' }))).rejects.toThrow(InvalidNewsInputError)
  })

  it('throws InvalidNewsInputError when details is empty', async () => {
    const useCase = new UpdateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository())
    await expect(useCase.execute(validInput({ details: '   ' }))).rejects.toThrow(InvalidNewsInputError)
  })

  it('throws InvalidNewsInputError when status is published and publishedAt is absent', async () => {
    const useCase = new UpdateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository())
    await expect(useCase.execute(validInput({ status: 'published', publishedAt: null }))).rejects.toThrow(InvalidNewsInputError)
  })

  // 2026-09-17 developer decision (resolves PO-WA-02): a published row can
  // be moved back to draft, and a draft doesn't need publishedAt.
  it('accepts a missing publishedAt when switching status to draft', async () => {
    const update = vi.fn(async (id: string, input: UpdateClubNewsInput) => ({ ...existingNews(), id, ...input }) satisfies ClubNews)
    const useCase = new UpdateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository({ update }))

    await useCase.execute(validInput({ status: 'draft', publishedAt: null }))

    expect(update).toHaveBeenCalledWith('news-1', expect.objectContaining({ status: 'draft', publishedAt: null }))
  })

  // specs/web-actus.md §2.3 — an admin may edit ANY row, including one
  // authored by a different admin: no createdBy comparison in this use case.
  it('allows an admin to update a news item authored by another admin', async () => {
    const update = vi.fn(async (id: string, input: UpdateClubNewsInput) => ({ ...existingNews(), id, ...input }) satisfies ClubNews)
    const useCase = new UpdateClubNewsUseCase(fakeUserRepository(adminUser('admin-2')), fakeNewsRepository({ update }))

    await useCase.execute(validInput({ actorId: 'admin-2' }))

    expect(update).toHaveBeenCalledOnce()
  })

  it('updates the same row (by id), never creating a duplicate, and never touches createdBy', async () => {
    const update = vi.fn(async (id: string, input: UpdateClubNewsInput) => ({ ...existingNews(), id, ...input }) satisfies ClubNews)
    const useCase = new UpdateClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository({ update }))

    await useCase.execute(validInput())

    expect(update).toHaveBeenCalledWith(
      'news-1',
      expect.objectContaining({
        title: 'Nouveau titre',
        details: 'Nouveau contenu',
        status: 'published',
        publishedAt: '2026-09-01T00:00:00.000Z',
      }),
    )
    const [, passedInput] = update.mock.calls[0]
    expect(passedInput).not.toHaveProperty('createdBy')
  })
})
