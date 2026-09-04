import { describe, expect, it } from 'vitest'
import type { ClubNews } from '../entities/club-news'
import { isNewsVisible } from './news-visibility'

function newsWith(overrides: Partial<ClubNews>): ClubNews {
  return {
    id: 'n1',
    title: 'Reprise des entraînements',
    details: 'La reprise aura lieu le premier samedi de septembre.',
    link: null,
    status: 'published',
    publishedAt: '2026-08-01T00:00:00.000Z',
    createdAt: '2026-07-30T00:00:00.000Z',
    createdBy: 'admin-1',
    expiresAt: null,
    ...overrides,
  }
}

describe('isNewsVisible', () => {
  it('is not visible while draft', () => {
    const news = newsWith({ status: 'draft' })
    expect(isNewsVisible(news, new Date('2026-08-02T00:00:00.000Z'))).toBe(false)
  })

  it('is not visible once archived', () => {
    const news = newsWith({ status: 'archived' })
    expect(isNewsVisible(news, new Date('2026-08-02T00:00:00.000Z'))).toBe(false)
  })

  it('is visible when published with no expiry', () => {
    const news = newsWith({ status: 'published', expiresAt: null })
    expect(isNewsVisible(news, new Date('2026-08-02T00:00:00.000Z'))).toBe(true)
  })

  it('is visible when published and expiresAt is in the future', () => {
    const news = newsWith({ status: 'published', expiresAt: '2026-09-01T00:00:00.000Z' })
    expect(isNewsVisible(news, new Date('2026-08-02T00:00:00.000Z'))).toBe(true)
  })

  it('is not visible when published and expiresAt is in the past', () => {
    const news = newsWith({ status: 'published', expiresAt: '2026-07-01T00:00:00.000Z' })
    expect(isNewsVisible(news, new Date('2026-08-02T00:00:00.000Z'))).toBe(false)
  })

  it('is not visible when expiresAt is exactly equal to now (strict comparison)', () => {
    const news = newsWith({ status: 'published', expiresAt: '2026-08-02T00:00:00.000Z' })
    expect(isNewsVisible(news, new Date('2026-08-02T00:00:00.000Z'))).toBe(false)
  })
})
