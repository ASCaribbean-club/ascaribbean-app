import { describe, expect, it } from 'vitest'
import type { Vote } from '@domain/entities/vote'
import type { VoteRow } from '../dto/vote-row'
import { toVote, toVoteRow } from './vote-mapper'

const row: VoteRow = {
  id: 'vote-1',
  convocation_id: 'convocation-1',
  category_id: 'positive',
  voter_id: 'player-1',
  candidate_id: 'player-2',
  voted_at: '2026-09-16T20:00:00.000Z',
}

const vote: Vote = {
  id: 'vote-1',
  convocationId: 'convocation-1',
  categoryId: 'positive',
  voterId: 'player-1',
  candidateId: 'player-2',
  votedAt: '2026-09-16T20:00:00.000Z',
}

describe('toVote', () => {
  it('maps a row to an entity', () => {
    expect(toVote(row)).toEqual(vote)
  })
})

describe('toVoteRow', () => {
  it('maps an entity (minus id) to a row', () => {
    const { id: _id, ...withoutId } = vote
    expect(toVoteRow(withoutId)).toEqual({
      convocation_id: 'convocation-1',
      category_id: 'positive',
      voter_id: 'player-1',
      candidate_id: 'player-2',
      voted_at: '2026-09-16T20:00:00.000Z',
    })
  })
})
