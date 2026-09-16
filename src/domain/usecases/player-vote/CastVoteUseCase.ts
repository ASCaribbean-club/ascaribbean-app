import type { Vote, VoteCategoryId } from '@domain/entities/vote'
import type { VoteRepository } from '@domain/repositories/vote-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { can } from '@domain/policies/can'

export interface CastVoteInput {
  convocationId: string
  categoryId: VoteCategoryId
  // The authenticated player casting the vote. AC-PV-06 requires this to
  // always equal the caller's own id (enforced by RLS once the migration
  // exists) — same "never trust a caller-supplied third-party id" rule as
  // ConfirmAttendanceUseCase's validatedBy.
  voterId: string
  candidateId: string
  now: Date
}

// specs/player-vote.md §7 — "Ordre de dépendance": this is the write-path
// use case for AC-PV-16 (positive category only). Mirrors
// ConfirmAttendanceUseCase's shape (user lookup → convocation lookup →
// can() check → repository call) — not reinvented. PO-PV-01 is resolved
// (ASC Legacy attachment, decided 2026-09-16).
//
// PO-PV-06/AC-PV-12 (voting window) is still open and NOT enforced here,
// deliberately: there is no rule to enforce yet (48h-after-match has no
// basis in any scoping document), and guessing one would be worse than
// leaving the gap visible. Flag, don't guess (CLAUDE.md §7).
//
// PO-PV-10b (self-voting) is resolved (2026-09-16, developer decision):
// NOT permitted. Enforced both here (ForbiddenError, so the candidate list
// composed in presentation/ isn't the only thing standing between a caller
// and a self-vote) and at the base (votes_no_self_vote CHECK constraint,
// supabase/migrations/20260916180308_votes_no_self_vote.sql) — same
// belt-and-suspenders reasoning as every RBAC check in this codebase.
export class CastVoteUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly convocationRepository: ConvocationRepository,
    private readonly voteRepository: VoteRepository,
  ) {}

  async execute(input: CastVoteInput): Promise<Vote> {
    const user = await this.userRepository.findById(input.voterId)
    if (!user) {
      throw new NotFoundError(`User ${input.voterId} not found.`)
    }

    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) {
      throw new NotFoundError(`Convocation ${input.convocationId} not found.`)
    }

    const canVote = can(user, 'vote:cast', { teamId: convocation.teamId })
    if (!canVote) {
      throw new ForbiddenError(
        `User ${input.voterId} is not authorized to vote on convocation with id ${input.convocationId} for convocation assigned to team ${convocation.teamId}`,
      )
    }

    if (input.candidateId === input.voterId) {
      throw new ForbiddenError(`User ${input.voterId} cannot vote for themselves.`)
    }

    return this.voteRepository.upsert({
      convocationId: convocation.id,
      categoryId: input.categoryId,
      voterId: input.voterId,
      candidateId: input.candidateId,
      votedAt: input.now.toISOString(),
    })
  }
}
