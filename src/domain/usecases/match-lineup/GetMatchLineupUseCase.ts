import type { MatchLineup } from '../../entities/match-lineup'
import type { MatchLineupRepository } from '../../repositories/match-lineup-repository'

// specs/coach-match-composition.md §2 "Lecture" — thin pass-through, same
// reasoning as GetMatchEventsUseCase: the visibility window for players is
// enforced by the database (AC-MC-09). Returning null means "no lineup to
// show", never an error (AC-MC-14).
export class GetMatchLineupUseCase {
  constructor(private readonly matchLineupRepository: MatchLineupRepository) {}

  async execute(convocationId: string): Promise<MatchLineup | null> {
    return this.matchLineupRepository.findByConvocationId(convocationId)
  }
}
