import type { Vote, VoteCategoryId } from '@domain/entities/vote'
import type { VoteRepository } from '@domain/repositories/vote-repository'

export interface GetMyVoteInput {
  convocationId: string
  categoryId: VoteCategoryId
  voterId: string
}

// Backs the bulletin's own state (unvoted vs. voted vs. "changer mon vote"
// pre-selection, UI design "États à couvrir") — reads only the CALLER's own
// row, never a listing (that's VoteTallyRepository's job, AC-PV-10). No
// RBAC check of its own beyond RLS: a player reading their own vote on a
// convocation they're not on resolves to `null` via RLS the same way
// ConvocationRepository.findById resolves an out-of-scope id to null
// elsewhere in this codebase (no existence leak) — see
// GetConvocationResponseByUserUseCase for the closest existing precedent to
// mirror.
//
export class GetMyVoteUseCase {
  constructor(private readonly voteRepository: VoteRepository) {}

  async execute(input: GetMyVoteInput): Promise<Vote | null> {
    return this.voteRepository.findMyVote(input.convocationId, input.categoryId, input.voterId)
  }
}
