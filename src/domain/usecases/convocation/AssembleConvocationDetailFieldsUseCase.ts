import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MeetingDetails } from '../../entities/meeting-details'
import type { Opponent } from '../../entities/opponent'
import type { OpponentRepository } from '../../repositories/opponent-repository'

// Shared shape, non-null only for the matching `convocation.type` — reused
// by GetConvocationWithDetailsUseCase.ConvocationWithDetails and
// ListUpcomingConvocationsForPlayerUseCase.UpcomingConvocationForPlayer via
// `extends`, rather than each interface re-declaring the same three fields.
export interface ConvocationDetailFields {
  matchDetails: MatchDetails | null
  opponent: Opponent | null
  meetingDetails: MeetingDetails | null
}

// Extracted from ListUpcomingConvocationsForPlayerUseCase's private
// `_buildDetailFields` — GetConvocationWithDetailsUseCase needs the exact
// same type-conditional assembly (meeting -> meetingDetails, match ->
// matchDetails + resolved opponent, training -> neither), so it's a use
// case of its own rather than a second copy of the switch.
export class AssembleConvocationDetailFieldsUseCase {
  constructor(private readonly opponentRepository: OpponentRepository) { }

  async execute(convocation: Convocation, details: MeetingDetails | MatchDetails | null): Promise<ConvocationDetailFields> {
    switch (convocation.type) {
      case 'meeting':
        return { matchDetails: null, opponent: null, meetingDetails: details as MeetingDetails | null }
      case 'match': {
        if (!details) return { matchDetails: null, opponent: null, meetingDetails: null }
        const matchDetails = details as MatchDetails
        const opponent = await this.opponentRepository.findById(matchDetails.opponentId)
        return { matchDetails, opponent, meetingDetails: null }
      }
      case 'training':
        return { matchDetails: null, opponent: null, meetingDetails: null }
      default: {
        const _exhaustive: never = convocation.type
        throw new Error(`Unhandled convocation type: ${_exhaustive}`)
      }
    }
  }
}
