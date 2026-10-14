import type { ClubNewsFavoriteRow } from '../dto/club-news-favorite-row'

export function toFavoriteNewsIds(rows: Pick<ClubNewsFavoriteRow, 'news_id'>[]): string[] {
  return rows.map((row) => row.news_id)
}
