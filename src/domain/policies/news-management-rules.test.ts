import { describe, expect, it } from 'vitest'
import type { ClubNews } from '../entities/club-news'
import { getNewsConsoleStatus, isNewsManageable, matchesNewsStatusFilter } from './news-management-rules'

function news(overrides: Partial<ClubNews> = {}): ClubNews {
  return {
    id: 'n1',
    title: 'Titre',
    details: 'Contenu',
    link: null,
    status: 'published',
    publishedAt: '2026-10-01T00:00:00.000Z',
    createdAt: '2026-09-30T00:00:00.000Z',
    createdBy: 'u1',
    expiresAt: null,
    ...overrides,
  }
}

const now = new Date('2026-10-05T12:00:00.000Z')

describe('isNewsManageable', () => {
  it('accepts draft and published, refuses archived', () => {
    expect(isNewsManageable(news({ status: 'draft', publishedAt: null }))).toBe(true)
    expect(isNewsManageable(news({ status: 'published' }))).toBe(true)
    expect(isNewsManageable(news({ status: 'archived' }))).toBe(false)
  })
})

describe('matchesNewsStatusFilter', () => {
  it('"all" matches every status', () => {
    expect(matchesNewsStatusFilter(news({ status: 'draft' }), 'all')).toBe(true)
    expect(matchesNewsStatusFilter(news({ status: 'published' }), 'all')).toBe(true)
  })

  it('"draft" only matches drafts', () => {
    expect(matchesNewsStatusFilter(news({ status: 'draft' }), 'draft')).toBe(true)
    expect(matchesNewsStatusFilter(news({ status: 'published' }), 'draft')).toBe(false)
  })

  it('"published" includes expired published rows (PO-DH-16)', () => {
    const expired = news({ expiresAt: '2026-10-02T00:00:00.000Z' })
    expect(matchesNewsStatusFilter(expired, 'published')).toBe(true)
    expect(matchesNewsStatusFilter(news({ status: 'draft' }), 'published')).toBe(false)
  })
})

describe('getNewsConsoleStatus', () => {
  it('is "draft" for a draft', () => {
    expect(getNewsConsoleStatus(news({ status: 'draft' }), now)).toBe('draft')
  })

  it('is "published" for a visible published row', () => {
    expect(getNewsConsoleStatus(news(), now)).toBe('published')
    expect(getNewsConsoleStatus(news({ expiresAt: '2026-10-06T00:00:00.000Z' }), now)).toBe('published')
  })

  it('is "expired" for a published row past its expiry, boundary included', () => {
    expect(getNewsConsoleStatus(news({ expiresAt: '2026-10-04T00:00:00.000Z' }), now)).toBe('expired')
    expect(getNewsConsoleStatus(news({ expiresAt: now.toISOString() }), now)).toBe('expired')
  })
})
