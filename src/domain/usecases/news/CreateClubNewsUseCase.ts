import type { ClubNews, ClubNewsStatus } from '../../entities/club-news'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidNewsInputError } from '../../errors/invalid-news-input-error'
import { can } from '../../policies/can'
import type { NewsRepository } from '../../repositories/news-repository'
import type { UserRepository } from '../../repositories/user-repository'

// 2026-09-17 developer decision (resolves PO-WA-02 for the create path):
// draft is now a selectable status from the dialog — 'archived' is
// deliberately excluded here, there is no applicative path to CREATE an
// already-archived row, only to archive an existing one
// (see ArchiveClubNewsUseCase).
export type CreatableClubNewsStatus = Extract<ClubNewsStatus, 'draft' | 'published'>

export interface CreateClubNewsUseCaseInput {
  actorId: string
  title: string
  details: string
  link: string | null
  status: CreatableClubNewsStatus
  // ISO — the DATE field of the dialog. Required only when status is
  // 'published' (club_news_published_has_date, mirrored below) — a draft
  // may have no publish date yet.
  publishedAt: string | null
  expiresAt: string | null
}

// specs/web-actus.md §2.4/§3 — "aucune maquette, aucun document ne
// distingue un rôle qui pourrait faire l'une sans l'autre": create and
// update are two use cases, but they share the exact same authorization and
// validation shape (see UpdateClubNewsUseCase). Mirrors
// CreateConvocationUseCase's ordering: authorization BEFORE any business
// validation, so an unauthorized caller never learns anything about which
// field would have been rejected.
export class CreateClubNewsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly newsRepository: NewsRepository,
  ) {}

  async execute(input: CreateClubNewsUseCaseInput): Promise<ClubNews> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    // Club-wide action, no team/section scope (§3, 'admin' carries no scope
    // field in RoleAssignment) — no context object needed here.
    if (!can(user, 'news:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write club news`)
    }

    // AC-WA-11 — title/details empty is rejected from the domain, not a
    // component-level check, regardless of status. link and expiresAt
    // absent are valid cases (§2.4).
    if (!input.title.trim()) {
      throw new InvalidNewsInputError('title is required')
    }
    if (!input.details.trim()) {
      throw new InvalidNewsInputError('details is required')
    }
    // Mirrors the club_news_published_has_date CHECK constraint
    // (supabase/migrations/20260904205258_club_news.sql): publishedAt is
    // only mandatory once status is 'published'. A draft may have none yet.
    if (input.status === 'published' && !input.publishedAt) {
      throw new InvalidNewsInputError('publishedAt is required when status is published')
    }

    return this.newsRepository.create({
      title: input.title,
      details: input.details,
      link: input.link,
      status: input.status,
      publishedAt: input.publishedAt,
      createdBy: user.id,
      expiresAt: input.expiresAt,
    })
  }
}
