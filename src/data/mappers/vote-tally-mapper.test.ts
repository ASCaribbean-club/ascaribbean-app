import { describe, expect, it } from 'vitest'
import type { VoteTallyDto } from '../dto/vote-tally-dto'
import { toVoteTally } from './vote-tally-mapper'

describe('toVoteTally', () => {
  it('groups per-candidate rows into one VoteTally, using the caller-supplied convocation/category ids', () => {
    const dtos: VoteTallyDto[] = [
      { candidate_id: 'player-1', candidate_display_name: 'Joueur 1', vote_count: 6, total_eligible_voters: 14 },
      { candidate_id: 'player-2', candidate_display_name: 'Joueur 2', vote_count: 4, total_eligible_voters: 14 },
    ]

    expect(toVoteTally('convocation-1', 'positive', dtos)).toEqual({
      convocationId: 'convocation-1',
      categoryId: 'positive',
      candidates: [
        { candidateId: 'player-1', candidateDisplayName: 'Joueur 1', voteCount: 6 },
        { candidateId: 'player-2', candidateDisplayName: 'Joueur 2', voteCount: 4 },
      ],
      totalEligibleVoters: 14,
    })
  })

  // AC-PV-13 — a category with zero votes must still produce a well-formed
  // VoteTally (empty candidates), not a shape missing convocationId/
  // categoryId just because there was no row to read them from.
  it('returns an empty tally for a category with no votes yet', () => {
    expect(toVoteTally('convocation-1', 'positive', [])).toEqual({
      convocationId: 'convocation-1',
      categoryId: 'positive',
      candidates: [],
      totalEligibleVoters: 0,
    })
  })
})
