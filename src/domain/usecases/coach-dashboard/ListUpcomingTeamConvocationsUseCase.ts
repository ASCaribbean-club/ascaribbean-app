import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { Opponent } from '../../entities/opponent'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import { byDateAscending, isUpcoming, summarizeResponses, type ResponseCounts } from '../../rules/convocation-rules'

export interface ListUpcomingTeamConvocationsInput {
  teamId: string
  now: Date
}

export interface UpcomingConvocation {
  convocation: Convocation
  responseCounts: ResponseCounts
  // Non-null only for `convocation.type === 'match'` — see
  // specs/coach-dashboard.md UI design §2 ("Prochain match" card needs
  // adversaire + heure de RDV). `opponent` can still be null even for a
  // match if MatchDetails exists but its opponentId doesn't resolve
  // (shouldn't happen once creation is wired, but this use case doesn't
  // assume it).
  matchDetails: MatchDetails | null
  opponent: Opponent | null
}

export class ListUpcomingTeamConvocationsUseCase {
  private readonly convocationRepository: ConvocationRepository
  private readonly convocationResponseRepository: ConvocationResponseRepository
  private readonly matchDetailsRepository: MatchDetailsRepository
  private readonly opponentRepository: OpponentRepository

  constructor(
    convocationRepository: ConvocationRepository,
    convocationResponseRepository: ConvocationResponseRepository,
    matchDetailsRepository: MatchDetailsRepository,
    opponentRepository: OpponentRepository,
  ) {
    this.convocationRepository = convocationRepository
    this.convocationResponseRepository = convocationResponseRepository
    this.matchDetailsRepository = matchDetailsRepository
    this.opponentRepository = opponentRepository
  }

  async execute(input: ListUpcomingTeamConvocationsInput): Promise<UpcomingConvocation[]> {
    const teamConvocations = await this.convocationRepository.listForTeam(input.teamId)
    // Soonest-first (byDateAscending): the "next" convocation and the "à
    // venir" list both depend on this order (useCoachDashboardViewModel
    // picks the array's first element as `nextTrainingOrMatch`) — sorted
    // explicitly rather than assuming listForTeam's own ordering.
    const upcomingConvocations = teamConvocations
      .filter((convocation) => isUpcoming(convocation, input.now))
      .sort(byDateAscending)

    // For each convocation, get the responses and reduce thems as count them by status
    const upcomingConvocationsWithCounts: UpcomingConvocation[] = await Promise.all(

      upcomingConvocations.map(async (convocation) => {
        const responses = await this.convocationResponseRepository.findByConvocation(convocation.id)

        const counts = summarizeResponses(responses)
        const { matchDetails, opponent } = await this.loadMatchInfo(convocation)

        return { convocation: convocation, responseCounts: counts, matchDetails, opponent }
      })
    )

    return upcomingConvocationsWithCounts
  }

  private async loadMatchInfo(
    convocation: Convocation,
  ): Promise<{ matchDetails: MatchDetails | null; opponent: Opponent | null }> {
    if (convocation.type !== 'match') return { matchDetails: null, opponent: null }

    const matchDetails = await this.matchDetailsRepository.findByConvocationId(convocation.id)
    if (!matchDetails) return { matchDetails: null, opponent: null }

    const opponent = await this.opponentRepository.findById(matchDetails.opponentId)
    return { matchDetails, opponent }
  }
}
