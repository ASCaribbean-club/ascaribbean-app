import type { ClubNews } from '../../entities/club-news'
import { ForbiddenError } from '../../errors/forbidden-error'
import { can } from '../../policies/can'
import type { NewsRepository } from '../../repositories/news-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface ArchiveClubNewsUseCaseInput {
  actorId: string
  newsId: string
}

// 2026-09-17 developer decision (resolves PO-WA-06): "Supprimer" on a news
// row is a SOFT delete — status flips to 'archived', the row is never
// removed from the table (same "expires_at masks, never deletes" spirit as
// the rest of specs/actus.md §4). No dedicated `delete` RLS policy exists
// or is needed: this is an UPDATE, already covered by the existing
// club_news_update_admin policy (private.is_admin(), no author
// restriction) — same authorization shape as UpdateClubNewsUseCase, kept as
// its own use case rather than folded into it because the trigger is a
// distinct user action ("Supprimer", not "Enregistrer") with no form behind
// it.
export class ArchiveClubNewsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly newsRepository: NewsRepository,
  ) {}

  async execute(input: ArchiveClubNewsUseCaseInput): Promise<ClubNews> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(user, 'news:write')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to write club news`)
    }

    return this.newsRepository.archive(input.newsId)
  }
}
