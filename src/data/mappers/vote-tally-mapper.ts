import type { VoteCategoryId, VoteTally } from '@domain/entities/vote'
import type { VoteTallyDto } from '../dto/vote-tally-dto'

// AC-PV-10's structural guarantee only holds if this function's INPUT type
// (VoteTallyDto) never grows a voter-identity column in the first place —
// this mapper cannot fix a leak that already happened in the DTO/RPC.
//
// `convocationId`/`categoryId` come from the caller (VoteTallyRepositoryImpl
// already has both as its own method parameters), not from the DTO rows —
// so an empty `dtos` array (AC-PV-13, no votes cast yet) still produces a
// well-formed VoteTally with an empty `candidates` list, rather than one
// with no convocationId/categoryId to fall back on.
export function toVoteTally(convocationId: string, categoryId: VoteCategoryId, dtos: VoteTallyDto[]): VoteTally {
  return {
    convocationId,
    categoryId,
    candidates: dtos.map((dto) => ({
      candidateId: dto.candidate_id,
      candidateDisplayName: dto.candidate_display_name,
      voteCount: dto.vote_count,
    })),
    // Only meaningful when candidates is non-empty (AC-PV-13's empty state
    // never reads this value) — see get_vote_tally()'s own comment for why
    // it's derived from the team roster, not from convocation attendance.
    totalEligibleVoters: dtos[0]?.total_eligible_voters ?? 0,
  }
}
