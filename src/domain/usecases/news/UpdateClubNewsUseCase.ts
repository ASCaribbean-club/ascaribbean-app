import type { ClubNews } from '../../entities/club-news'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidNewsInputError } from '../../errors/invalid-news-input-error'
import { can } from '../../policies/can'
import type { NewsRepository } from '../../repositories/news-repository'
import type { UserRepository } from '../../repositories/user-repository'
import type { CreatableClubNewsStatus } from './CreateClubNewsUseCase'

export interface UpdateClubNewsUseCaseInput {
  actorId: string
  newsId: string
  title: string
  details: string
  link: string | null
  // 2026-09-17 developer decision (resolves PO-WA-02 for the edit path):
  // the dialog's status selector offers 'draft'/'published' only — flipping
  // to 'archived' goes exclusively through ArchiveClubNewsUseCase's
  // dedicated "Supprimer" action, never through this general-purpose edit.
  status: CreatableClubNewsStatus
  publishedAt: string | null // ISO — required only when status is 'published'
  expiresAt: string | null
}

// specs/web-actus.md §2.3 — "un administrateur modifie n'importe quelle
// actu, y compris celle rédigée par un autre administrateur. Pas de
// restriction « sa propre ligne »" — no createdBy comparison here, same
// shape as the RLS policy it mirrors (club_news_update_admin,
// `using (private.is_admin())`, no author check).
export class UpdateClubNewsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly newsRepository: NewsRepository,
  ) {}

  async execute(input: UpdateClubNewsUseCaseInput): Promise<ClubNews> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'news:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write club news`)
    }

    // Same validation as CreateClubNewsUseCase (AC-WA-11) — a modification
    // can't leave title/details empty, and publishedAt is required exactly
    // when the (possibly just-changed) status is 'published' — mirrors
    // club_news_published_has_date.
    if (!input.title.trim()) {
      throw new InvalidNewsInputError('title is required')
    }
    if (!input.details.trim()) {
      throw new InvalidNewsInputError('details is required')
    }
    if (input.status === 'published' && !input.publishedAt) {
      throw new InvalidNewsInputError('publishedAt is required when status is published')
    }

    // AC-WA-17 — updates the SAME row, never creates a duplicate.
    return this.newsRepository.update(input.newsId, {
      title: input.title,
      details: input.details,
      link: input.link,
      status: input.status,
      publishedAt: input.publishedAt,
      expiresAt: input.expiresAt,
    })
  }
}
