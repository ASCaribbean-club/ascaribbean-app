import type { LineupSlots } from '../../entities/match-lineup'
import { InvalidMatchLineupInputError } from '../../errors/invalid-match-lineup-input-error'
import { NotFoundError } from '../../errors/not-found-error'
import { findLineupViolation, hasAnyPlacedPlayer, isFormation } from '../../policies/match-lineup-rules'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import type { MatchLineupRepository } from '../../repositories/match-lineup-repository'

export interface SaveMatchLineupInput {
  convocationId: string
  formation: string
  slots: LineupSlots
}

// specs/coach-match-composition.md AC-MC-07/AC-MC-08. Does NOT call can():
// authorization is usePermission('match_lineup:write') in presentation/
// (render gate) and the mirrored RLS policies (real gate), same as
// UpdateMatchDetailsUseCase. Deliberately NO time-window check (PO-MC-05,
// AC-MC-22): a lineup may be saved after kickoff and on a closed convocation.
//
// The pool of placeable players is the derived convoked roster
// (ConvocationRespondersRepository), the SAME source the Effectif tab uses
// (PO-MC-04) — never a second definition. No filtering on the declared
// response (PO-MC-13). Writes nothing to responses or attendance (AC-MC-12).
export class SaveMatchLineupUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly convocationRespondersRepository: ConvocationRespondersRepository,
    private readonly matchLineupRepository: MatchLineupRepository,
  ) {}

  // Resolves to false when nothing was persisted (an entirely empty lineup
  // has nothing useful to save, Q-UI-8), true otherwise.
  async execute(input: SaveMatchLineupInput): Promise<boolean> {
    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) throw new NotFoundError('Convocation not found.')
    if (convocation.type !== 'match') {
      throw new InvalidMatchLineupInputError('A lineup only exists for a match.')
    }

    const convoked = await this.convocationRespondersRepository.listForConvocation(input.convocationId)
    const violation = findLineupViolation(
      input.formation,
      input.slots,
      convoked.map((responder) => responder.userId),
    )
    if (violation || !isFormation(input.formation)) {
      throw new InvalidMatchLineupInputError(violation ?? 'Unknown formation.')
    }

    if (!hasAnyPlacedPlayer(input.slots)) return false

    await this.matchLineupRepository.save(input.convocationId, input.formation, input.slots)
    return true
  }
}
