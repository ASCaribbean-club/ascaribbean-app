import type { Vote } from '@domain/entities/vote'
import type { VoteRow } from '../dto/vote-row'

// CLAUDE.md §4 — a mapper is always present between DTO and entity, never
// skipped. Field-for-field snake_case -> camelCase translation, same shape
// as toAttendanceRecord/toAttendanceRecordRow.
export function toVote(row: VoteRow): Vote {
  return {
    id: row.id,
    convocationId: row.convocation_id,
    categoryId: row.category_id,
    voterId: row.voter_id,
    candidateId: row.candidate_id,
    votedAt: row.voted_at,
  }
}

export function toVoteRow(vote: Omit<Vote, 'id'>): Omit<VoteRow, 'id'> {
  return {
    convocation_id: vote.convocationId,
    category_id: vote.categoryId,
    voter_id: vote.voterId,
    candidate_id: vote.candidateId,
    voted_at: vote.votedAt,
  }
}
