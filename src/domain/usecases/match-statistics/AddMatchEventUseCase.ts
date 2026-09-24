import type { MatchEvent, MatchEventType } from '../../entities/match-event'
import { InconsistentMatchScoreError } from '../../errors/inconsistent-match-score-error'
import { MatchNotStartedError } from '../../errors/match-not-started-error'
import { MatchScoreMissingError } from '../../errors/match-score-missing-error'
import { NotFoundError } from '../../errors/not-found-error'
import { isValidPenaltyFlag } from '../../policies/match-event-rules'
import { isScorerCountConsistent } from '../../policies/match-outcome-rules'
import { isMatchResultRecordable } from '../../policies/match-result-timing-rules'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MatchEventRepository } from '../../repositories/match-event-repository'

export interface AddMatchEventInput {
  convocationId: string
  userId: string // the scorer/carded player — NEVER checked for eligibility here, MS-13
  eventType: MatchEventType
  isPenalty: boolean
  createdBy: string
  now: Date
}

// specs/match-stats.md MS-03/MS-05/MS-14/MS-16/MS-17 — Coach/Staff's own
// write path (`match_result:record`). Authorization stays in RLS
// (match_events_insert_record) — no can() call here, same reasoning as
// RecordMatchScoreUseCase. Scorer eligibility (MS-13, AttendanceRecord >
// ConvocationResponse) is a SOFT rule for the picker UI only — this use
// case never checks it, and never will (AC-MS-14, "aucun use case... ne
// refuse un événement portant sur un joueur hors de cette liste").
export class AddMatchEventUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly matchDetailsRepository: MatchDetailsRepository,
    private readonly matchEventRepository: MatchEventRepository,
  ) {}

  async execute(input: AddMatchEventInput): Promise<MatchEvent> {
    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) {
      throw new NotFoundError(`Convocation ${input.convocationId} not found.`)
    }

    // AC-MS-13/MS-12.
    if (!isMatchResultRecordable(new Date(convocation.date), input.now)) {
      throw new MatchNotStartedError(`Match ${input.convocationId} has not kicked off yet.`)
    }

    // AC-MS-16 — defensive: the result-entry screen's own UI (Penalty chip
    // only ever shown on the BUTEURS card, never on CARTONS) already makes
    // this unreachable through normal use, same "shouldn't normally happen
    // from the UI, still guarded in domain/" reasoning as
    // CreateConvocationUseCase's isPastDate check. Not a DomainError
    // subclass on purpose — this isn't a user-facing rejection with its own
    // French copy, just a last-resort guard against a caller bypassing the
    // UI entirely.
    if (!isValidPenaltyFlag(input.eventType, input.isPenalty)) {
      throw new Error(`isPenalty can only be true for a 'goal' event (got eventType=${input.eventType}).`)
    }

    // MS-14/MS-17 — the score-related checks apply ONLY to 'goal' events.
    // 'penalty_missed' (and the two card types) skip both entirely — MS-17
    // is explicit that a missed penalty never touches goalsFor and never
    // enters the AC-MS-05 consistency check.
    if (input.eventType === 'goal') {
      const matchDetails = await this.matchDetailsRepository.findByConvocationId(input.convocationId)
      if (!matchDetails || matchDetails.goalsFor === null) {
        // AC-MS-15 — MS-14: the score must be recorded BEFORE any goal event.
        throw new MatchScoreMissingError(`No score recorded yet for convocation ${input.convocationId}.`)
      }

      const events = await this.matchEventRepository.findByConvocation(input.convocationId)
      const recordedGoalEventCount = events.filter((event) => event.eventType === 'goal').length
      // AC-MS-05 — this new goal would push the count past goalsFor.
      if (!isScorerCountConsistent(matchDetails.goalsFor, recordedGoalEventCount + 1)) {
        throw new InconsistentMatchScoreError(
          `Adding one more goal event would exceed goalsFor (${matchDetails.goalsFor}) for convocation ${input.convocationId}.`,
        )
      }
    }

    return this.matchEventRepository.add({
      convocationId: input.convocationId,
      userId: input.userId,
      eventType: input.eventType,
      isPenalty: input.isPenalty,
      createdBy: input.createdBy,
    })
  }
}
