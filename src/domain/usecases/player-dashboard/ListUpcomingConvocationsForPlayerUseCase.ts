import { byDateAscending, isUpcoming } from '@/domain/rules/convocation-rules'
import type { Convocation, ConvocationResponse } from '@/domain/entities/convocation'
import type { MatchDetails } from '@/domain/entities/match-details'
import type { MeetingDetails } from '@/domain/entities/meeting-details'
import type { Opponent } from '@/domain/entities/opponent'
import type { ConvocationRepository } from '@/domain/repositories/convocation-repository'
import type { ConvocationResponseRepository } from '@/domain/repositories/convocation-response-repository'
import type { OpponentRepository } from '@/domain/repositories/opponent-repository'
import type { GetConvocationDetailsUseCase } from '@/domain/usecases/convocation/GetConvocationDetailsUseCase'

export interface ListUpcomingConvocationsForPlayerInput {
  teamId: string
  userId: string
  now: Date
}

export interface UpcomingConvocationForPlayer {
  convocation: Convocation
  // The player's OWN declared intent for this convocation — never an
  // aggregate across the team (PO-PD-05, AC-PD-09 — contrast with
  // ListUpcomingTeamConvocationsUseCase's `responseCounts`) and never an
  // AttendanceRecord (AC-PD-03). `null` means no response row exists yet,
  // which is a distinct state from a ConvocationResponse whose `status`
  // happens to be 'pending' (domain/entities/convocation.ts, DeclaredStatus).
  myResponse: ConvocationResponse | null
  // Non-null only for the matching `convocation.type`. 
  matchDetails: MatchDetails | null
  opponent: Opponent | null
  meetingDetails: MeetingDetails | null
}

export class ListUpcomingConvocationsForPlayerUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly convocationResponseRepository: ConvocationResponseRepository,
    private readonly opponentRepository: OpponentRepository,
    private readonly getConvocationDetailsUseCase: GetConvocationDetailsUseCase,
  ) { }

  async execute(input: ListUpcomingConvocationsForPlayerInput): Promise<UpcomingConvocationForPlayer[]> {
    const upcomingTeamConvocations = (await this.convocationRepository.listForTeam(input.teamId))
      .filter((convocation) => isUpcoming(convocation, input.now))
      .sort(byDateAscending)

    return await Promise.all(upcomingTeamConvocations.map(async (convocation) => {
      const details = convocation.type === 'training' // TODO To remove when training will be mapped
        ? null
        : await this.getConvocationDetailsUseCase.execute(convocation)

      const mappedDetails = await this._buildDetailFields(convocation, details, this.opponentRepository)

      const myResponse = await this.convocationResponseRepository.findByConvocationAndUser(convocation.id, input.userId)
      return {
        convocation: convocation,
        myResponse: myResponse,
        ...mappedDetails,
      }
    }))
  }

  async _buildDetailFields(convocation: Convocation, details: MeetingDetails | MatchDetails | null, opponentRepository: OpponentRepository) {
    switch (convocation.type) {
      case 'meeting':
        return { matchDetails: null, opponent: null, meetingDetails: details as MeetingDetails | null }
      case 'match':
        if (!details) return { matchDetails: null, opponent: null, meetingDetails: null }

        const opponent = await opponentRepository.findById((details as MatchDetails)?.opponentId)
        return { matchDetails: details as MatchDetails | null, opponent: opponent, meetingDetails: null }
      case 'training':
        return { matchDetails: null, opponent: null, meetingDetails: null }
      default: {
        const _exhaustive: never = convocation.type
        throw new Error(`Unhandled convocation type: ${_exhaustive}`)
      }
    }

  }
}


