import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { Opponent } from '../../entities/opponent'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { OpponentRepository } from '../../repositories/opponent-repository'
import { byDateAscending, isUpcoming, summarizeRosterStatuses, type ResponseCounts } from '../../rules/convocation-rules'

export interface ListTeamConvocationsInput {
  teamId: string
  now: Date
  includePast?: boolean
}

export interface ConvocationForCoach {
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

export class ListTeamConvocationsUseCase {
  private readonly convocationRepository: ConvocationRepository
  private readonly convocationResponseRepository: ConvocationResponseRepository
  private readonly convocationRespondersRepository: ConvocationRespondersRepository
  private readonly matchDetailsRepository: MatchDetailsRepository
  private readonly opponentRepository: OpponentRepository

  constructor(
    convocationRepository: ConvocationRepository,
    convocationResponseRepository: ConvocationResponseRepository,
    convocationRespondersRepository: ConvocationRespondersRepository,
    matchDetailsRepository: MatchDetailsRepository,
    opponentRepository: OpponentRepository,
  ) {
    this.convocationRepository = convocationRepository
    this.convocationResponseRepository = convocationResponseRepository
    this.convocationRespondersRepository = convocationRespondersRepository
    this.matchDetailsRepository = matchDetailsRepository
    this.opponentRepository = opponentRepository
  }

  async execute(input: ListTeamConvocationsInput): Promise<ConvocationForCoach[]> {
    const teamConvocations = await this.convocationRepository.listForTeam(input.teamId)
    // Soonest-first (byDateAscending): the "next" convocation and the "à
    // venir" list both depend on this order (useCoachDashboardViewModel
    // picks the array's first element as `nextTrainingOrMatch`) — sorted
    // explicitly rather than assuming listForTeam's own ordering. Despite
    // the name, `input.includePast` means this filtered/sorted set is not
    // exclusively upcoming convocations (specs/calendar.md PO-CA-02) — see
    // ConvocationForCoach's own name, chosen for the same reason.
    const scopedConvocations = teamConvocations
      .filter((convocation) => input.includePast ? true : isUpcoming(convocation, input.now))
      .sort(byDateAscending)

    // Roster-aware, same combination as GetConvocationRosterForCoachUseCase
    // (PO-MD-03): convocationRespondersRepository gives the complete convoked
    // roster (including non-responders), convocationResponseRepository gives
    // the real status for whoever actually responded — a non-responder
    // defaults to 'pending' instead of being silently absent from the count.
    const convocationsWithCounts: ConvocationForCoach[] = await Promise.all(
      scopedConvocations.map(async (convocation) => {
        const [convocationResponders, responses] = await Promise.all([
          this.convocationRespondersRepository.listForConvocation(convocation.id),
          this.convocationResponseRepository.findByConvocation(convocation.id),
        ])

        const statuses = convocationResponders.map((responder) => ({
          status: responses.find((response) => response.userId === responder.userId)?.status ?? 'pending',
        }))

        const counts = summarizeRosterStatuses(statuses)
        const { matchDetails, opponent } = await this.loadMatchInfo(convocation)

        return { convocation: convocation, responseCounts: counts, matchDetails, opponent }
      })
    )

    return convocationsWithCounts
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
