import { describe, expect, it } from 'vitest'
import type { ClubNews } from '../entities/club-news'
import { isNewsVisible, matchesNewsTagFilter } from './news-visibility'

function newsWith(overrides: Partial<ClubNews>): ClubNews {
  return {
    id: 'n1',
    title: 'Reprise des entraînements',
    details: 'La reprise aura lieu le premier samedi de septembre.',
    link: null,
    tag: null,
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

describe('matchesNewsTagFilter', () => {
  it("'all' keeps every item, tagged or not", () => {
    expect(matchesNewsTagFilter({ tag: null }, 'all')).toBe(true)
    expect(matchesNewsTagFilter({ tag: 'club' }, 'all')).toBe(true)
  })

  it('a specific tag keeps only that tag and drops untagged items', () => {
    expect(matchesNewsTagFilter({ tag: 'boutique' }, 'boutique')).toBe(true)
    expect(matchesNewsTagFilter({ tag: 'club' }, 'boutique')).toBe(false)
    expect(matchesNewsTagFilter({ tag: null }, 'boutique')).toBe(false)
  })
})
