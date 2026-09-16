import type { VoteCategory, VoteCategoryId } from '@domain/entities/vote'
import type { VoteCategoryRepository } from '@domain/repositories/vote-category-repository'

export interface GetVoteCategoryInput {
  categoryId: VoteCategoryId
}

// Read path consumed by both role variants (player + coach) — no RBAC
// matrix entry, same "RLS-only, structure doesn't change per role" reasoning
// as GetVoteTallyUseCase. Thin pass-through: the label itself is a database
// value (PO-PV-03), never a hardcoded constant in presentation/.
export class GetVoteCategoryUseCase {
  constructor(private readonly voteCategoryRepository: VoteCategoryRepository) {}

  async execute(input: GetVoteCategoryInput): Promise<VoteCategory | null> {
    return this.voteCategoryRepository.findById(input.categoryId)
  }
}
