import type { VoteCategoryId, VoteTally } from '@domain/entities/vote'
import type { VoteTallyRepository } from '@domain/repositories/vote-tally-repository'

export interface GetVoteTallyInput {
  convocationId: string
  categoryId: VoteCategoryId
}

// Read path consumed by BOTH role variants (player + coach) — no RBAC
// matrix entry of its own, same "RLS-only, structure doesn't change per
// role" reasoning documented at the top of rbac-matrix.ts and repeated in
// specs/player-vote.md §2. AC-PV-10 is guaranteed by VoteTallyRepository's
// own interface shape (see that file), not by anything this use case adds —
// this class stays a thin pass-through, resist the urge to add filtering
// logic here that belongs in the repository/RLS instead.
//
// AC-PV-13 — "état vide explicite, jamais une liste de zéros présentée
// comme un classement": resolved at the repository/RPC level (see
// VoteTallyRepositoryImpl/get_vote_tally), not here — a category with zero
// votes comes back with an empty `candidates` array (the aggregate simply
// has no rows to group), which is exactly the signal VotesTab's composition
// step (still pending, see useConvocationDetailViewModel.ts) needs to
// render VoteEmptyState instead of a zero-filled list.
export class GetVoteTallyUseCase {
  constructor(private readonly voteTallyRepository: VoteTallyRepository) {}

  async execute(input: GetVoteTallyInput): Promise<VoteTally> {
    return this.voteTallyRepository.getTally(input.convocationId, input.categoryId)
  }
}
