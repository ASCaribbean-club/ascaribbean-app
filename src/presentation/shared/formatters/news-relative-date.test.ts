import { describe, expect, it } from 'vitest'
import { formatNewsRelativeDate } from './news-relative-date'

const NOW = new Date(2026, 9, 14, 15, 30) // 14 Oct 2026, local

describe('formatNewsRelativeDate', () => {
  it.each([
    [new Date(2026, 9, 14, 0, 0), 'aujourd’hui'],
    [new Date(2026, 9, 13, 0, 0), 'hier'],
    [new Date(2026, 9, 11, 0, 0), 'il y a 3 j'],
    [new Date(2026, 9, 8, 0, 0), 'il y a 6 j'],
  ])('formats %s as "%s"', (publishedAt, expected) => {
    expect(formatNewsRelativeDate(publishedAt.toISOString(), NOW)).toBe(expected)
  })

  it('falls back to the plain lowercase date from 7 days on', () => {
    expect(formatNewsRelativeDate(new Date(2026, 9, 7, 0, 0).toISOString(), NOW)).toBe('7 octobre')
  })

  it('treats a future publication date as today', () => {
    expect(formatNewsRelativeDate(new Date(2026, 9, 20, 0, 0).toISOString(), NOW)).toBe('aujourd’hui')
  })
})
