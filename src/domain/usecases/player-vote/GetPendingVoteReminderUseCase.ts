import type { VoteCategoryId } from '@domain/entities/vote'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import type { VoteRepository } from '@domain/repositories/vote-repository'
import { getVotingDaysRemaining } from '@domain/policies/player-vote-rules'

export interface GetPendingVoteReminderInput {
  teamId: string
  userId: string
  categoryId: VoteCategoryId
  now: Date
}

export interface PendingVoteReminder {
  convocationId: string
  daysRemaining: number
  // Recap of the match to vote on. Opponent/score are null when unknown
  // (no match details, score not recorded yet — both goals are null together).
  kickoff: string
  opponentName: string | null
  goalsFor: number | null
  goalsAgainst: number | null
}

// Dashboard reminder: the match whose vote the player still owes, while its
// voting window (kickoff → VOTING_DEADLINE_DAYS later) is open. Several
// matches can qualify; the one closing first wins, since it is the most
// urgent. Reads only the caller's OWN vote (VoteRepository.findMyVote).
export class GetPendingVoteReminderUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly voteRepository: VoteRepository,
    private readonly matchDetailsRepository: MatchDetailsRepository,
    private readonly opponentRepository: OpponentRepository,
  ) {}

  async execute(input: GetPendingVoteReminderInput): Promise<PendingVoteReminder | null> {
    const convocations = await this.convocationRepository.listForTeam(input.teamId)

    const inWindow = convocations
      .filter((convocation) => convocation.type === 'match' && convocation.status !== 'cancelled')
      .map((convocation) => ({
        convocationId: convocation.id,
        kickoff: new Date(convocation.date),
        daysRemaining: getVotingDaysRemaining(new Date(convocation.date), input.now),
      }))
      .filter((candidate): candidate is typeof candidate & { daysRemaining: number } => candidate.daysRemaining !== null)
      .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())

    for (const candidate of inWindow) {
      const myVote = await this.voteRepository.findMyVote(candidate.convocationId, input.categoryId, input.userId)
      if (myVote) continue

      const matchDetails = await this.matchDetailsRepository.findByConvocationId(candidate.convocationId)
      const opponent = matchDetails ? await this.opponentRepository.findById(matchDetails.opponentId) : null
      return {
        convocationId: candidate.convocationId,
        daysRemaining: candidate.daysRemaining,
        kickoff: candidate.kickoff.toISOString(),
        opponentName: opponent?.name ?? null,
        goalsFor: matchDetails?.goalsFor ?? null,
        goalsAgainst: matchDetails?.goalsAgainst ?? null,
      }
    }
    return null
  }
}
