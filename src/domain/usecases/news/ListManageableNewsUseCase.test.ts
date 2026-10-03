import { describe, expect, it } from 'vitest'
import type { ClubNews } from '../../entities/club-news'
import type { NewsRepository } from '../../repositories/news-repository'
import { ListManageableNewsUseCase } from './ListManageableNewsUseCase'

function news(id: string, status: ClubNews['status']): ClubNews {
  return { id, title: id, details: 'x', link: null, status, publishedAt: null, createdAt: '2026-10-01T00:00:00.000Z', createdBy: 'u1', expiresAt: null }
}

function fakeRepository(rows: ClubNews[]): NewsRepository {
  return {
    listPublished: async () => [],
    listAll: async () => rows,
    create: async () => {
      throw new Error('not implemented')
    },
    update: async () => {
      throw new Error('not implemented')
    },
    archive: async () => {
      throw new Error('not implemented')
    },
  }
}

describe('ListManageableNewsUseCase', () => {
  it('returns drafts and published rows but never archived ones', async () => {
    const useCase = new ListManageableNewsUseCase(fakeRepository([news('a', 'draft'), news('b', 'published'), news('c', 'archived')]))
    const result = await useCase.execute()
    expect(result.map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('returns an empty list when there is no news', async () => {
    const useCase = new ListManageableNewsUseCase(fakeRepository([]))
    expect(await useCase.execute()).toEqual([])
  })
})
