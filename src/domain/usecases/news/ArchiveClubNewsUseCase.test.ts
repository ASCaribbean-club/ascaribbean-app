import { describe, expect, it, vi } from 'vitest'
import type { ClubNews } from '../../entities/club-news'
import { ForbiddenError } from '../../errors/forbidden-error'
import type { NewsRepository } from '../../repositories/news-repository'
import type { User } from '../../entities/user'
import type { UserRepository } from '../../repositories/user-repository'
import { ArchiveClubNewsUseCase } from './ArchiveClubNewsUseCase'

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
  }
}

function archivedNews(): ClubNews {
  return {
    id: 'news-1',
    title: 'Ancien titre',
    details: 'Ancien contenu',
    link: null,
    status: 'archived',
    publishedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-07-30T00:00:00.000Z',
    createdBy: 'admin-2',
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
    update: async () => {
      throw new Error('not implemented')
    },
    archive: vi.fn(async (id: string) => ({ ...archivedNews(), id })),
    ...overrides,
  }
}

describe('ArchiveClubNewsUseCase', () => {
  it('throws ForbiddenError when the actor does not exist', async () => {
    const useCase = new ArchiveClubNewsUseCase(fakeUserRepository(null), fakeNewsRepository())
    await expect(useCase.execute({ actorId: 'admin-1', newsId: 'news-1' })).rejects.toThrow(ForbiddenError)
  })

  it('throws ForbiddenError when the actor is not admin', async () => {
    const useCase = new ArchiveClubNewsUseCase(fakeUserRepository(coachUser()), fakeNewsRepository())
    await expect(useCase.execute({ actorId: 'coach-1', newsId: 'news-1' })).rejects.toThrow(ForbiddenError)
  })

  // 2026-09-17 developer decision (resolves PO-WA-06): "Supprimer" archives
  // ANY row regardless of author — same no-author-restriction shape as
  // UpdateClubNewsUseCase.
  it('archives a news item authored by a different admin', async () => {
    const archive = vi.fn(async (id: string) => ({ ...archivedNews(), id }))
    const useCase = new ArchiveClubNewsUseCase(fakeUserRepository(adminUser()), fakeNewsRepository({ archive }))

    const result = await useCase.execute({ actorId: 'admin-1', newsId: 'news-1' })

    expect(archive).toHaveBeenCalledWith('news-1')
    expect(result.status).toBe('archived')
  })
})
