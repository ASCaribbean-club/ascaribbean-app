import { describe, expect, it, vi } from 'vitest'
import type { ClubNews } from '../../entities/club-news'
import type { NewsRepository } from '../../repositories/news-repository'
import { ListPublishedNewsUseCase } from './ListPublishedNewsUseCase'

describe('ListPublishedNewsUseCase', () => {
  it('delegates to NewsRepository.listPublished', async () => {
    const news: ClubNews[] = [
      {
        id: 'n1',
        title: 'Reprise des entraînements',
        details: 'Les Seniors reprennent au stade municipal.',
        link: null,
        status: 'published',
        publishedAt: '2026-08-01T00:00:00.000Z',
        createdAt: '2026-07-30T00:00:00.000Z',
        createdBy: 'admin-1',
        expiresAt: null,
      },
    ]
    const listPublished = vi.fn().mockResolvedValue(news)
    const newsRepository = { listPublished } as unknown as NewsRepository

    const result = await new ListPublishedNewsUseCase(newsRepository).execute()

    expect(listPublished).toHaveBeenCalledOnce()
    expect(result).toBe(news)
  })
})
