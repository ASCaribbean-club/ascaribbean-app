import type { MatchLineupRepository } from '../../repositories/match-lineup-repository'

// specs/coach-match-composition.md AC-MC-26 / PO-MC-16 — default numbers used
// to prefill a player's number when the coach selects them. Pass-through:
// the season resolution ("season containing the convocation date", none ->
// no entry) lives next to the data (get_lineup_default_jersey_numbers) and is
// restricted to the lineup writer by the database. Read-only: nothing here
// ever writes to memberships (§1 "Aucune propagation").
export class ListLineupDefaultJerseyNumbersUseCase {
  constructor(private readonly matchLineupRepository: MatchLineupRepository) {}

  async execute(convocationId: string): Promise<Record<string, number>> {
    return this.matchLineupRepository.listDefaultJerseyNumbers(convocationId)
  }
}
