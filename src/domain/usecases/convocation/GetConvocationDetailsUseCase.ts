import type { Convocation } from '../../entities/convocation'
import type { MatchDetails } from '../../entities/match-details'
import type { MeetingDetails } from '../../entities/meeting-details'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MeetingDetailsRepository } from '../../repositories/meeting-details-repository'

// specs/create-convocation.md §2 — the routing logic for "which satellite
// table holds this convocation's type-specific details" lives in a use
// case, never in a ViewModel or component (ARCHITECTURE.md §6).
//
// NOTE on file location: the spec's own code sample writes this file as
// `domain/usecases/get-convocation-details.ts` (flat, kebab-case). This
// scaffold instead follows the folder-per-feature + PascalCase-file
// convention already established by domain/usecases/coach-dashboard/ (see
// GetCoachTeamsUseCase.ts) per ARCHITECTURE.md §13.2 ("usecases/ — one
// folder per feature") — flagged here rather than silently deviating.
export class GetConvocationDetailsUseCase {
  constructor(
    private readonly meetingDetails: MeetingDetailsRepository,
    private readonly matchDetails: MatchDetailsRepository,
    // trainingDetails: to add once training_details exists — see §2/§7,
    // "no shape defined yet", not created in this pass.
  ) {}

  async execute(convocation: Convocation): Promise<MeetingDetails | MatchDetails | null> {
    switch (convocation.type) {
      case 'meeting':
        return this.meetingDetails.findByConvocationId(convocation.id)
      case 'match':
        return this.matchDetails.findByConvocationId(convocation.id)
      case 'training':
        // No details repository configured for this type: either a caller
        // is asking for details on a type that doesn't have any (bug), or
        // training_details needs to be built first — see §2/§7 "training_details".
        throw new Error(`No details repository configured for convocation type: ${convocation.type}`)
      default: {
        const _exhaustive: never = convocation.type
        throw new Error(`Unhandled convocation type: ${_exhaustive}`)
      }
    }
  }
}