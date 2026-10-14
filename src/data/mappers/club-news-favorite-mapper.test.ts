import { describe, expect, it } from 'vitest'
import { toFavoriteNewsIds } from './club-news-favorite-mapper'

describe('toFavoriteNewsIds', () => {
  it('keeps only the news ids', () => {
    expect(toFavoriteNewsIds([{ news_id: 'news-1' }, { news_id: 'news-2' }])).toEqual(['news-1', 'news-2'])
  })

  it('returns an empty list when there is no favorite', () => {
    expect(toFavoriteNewsIds([])).toEqual([])
  })
})
