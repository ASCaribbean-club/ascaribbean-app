import type { ClubNews, ClubNewsStatus } from '@domain/entities/club-news'
import type { ClubNewsRow } from '../dto/club-news-row'

export function toClubNews(row: ClubNewsRow): ClubNews {
  return {
    id: row.id,
    title: row.title,
    details: row.details,
    link: row.link,
    status: row.status as ClubNewsStatus,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
    expiresAt: row.expires_at,
  }
}
