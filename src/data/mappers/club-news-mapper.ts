import type { ClubNews, ClubNewsStatus } from '@domain/entities/club-news'
import type { CreateClubNewsInput, UpdateClubNewsInput } from '@domain/repositories/news-repository'
import type { ClubNewsInsertRow, ClubNewsRow, ClubNewsUpdateRow } from '../dto/club-news-row'

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

// specs/web-actus.md §2.4 — the reverse direction, entity -> row, needed by
// NewsRepositoryImpl.create(). Mirrors toVoteRow's shape (CLAUDE.md §4, a
// mapper always sits between DTO and entity, both directions).
export function toClubNewsInsertRow(input: CreateClubNewsInput): ClubNewsInsertRow {
  return {
    title: input.title,
    details: input.details,
    link: input.link,
    status: input.status,
    published_at: input.publishedAt,
    created_by: input.createdBy,
    expires_at: input.expiresAt,
  }
}

// Same reverse mapping for NewsRepositoryImpl.update() — the 5 mockup
// fields plus `status` (no `created_by`: §2.1, still no author field in
// either dialog).
export function toClubNewsUpdateRow(input: UpdateClubNewsInput): ClubNewsUpdateRow {
  return {
    title: input.title,
    details: input.details,
    link: input.link,
    status: input.status,
    published_at: input.publishedAt,
    expires_at: input.expiresAt,
  }
}
