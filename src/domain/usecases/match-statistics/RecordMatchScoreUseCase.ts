import type { MatchDetails } from '../../entities/match-details'
import { InconsistentMatchScoreError } from '../../errors/inconsistent-match-score-error'
import { MatchNotStartedError } from '../../errors/match-not-started-error'
import { NotFoundError } from '../../errors/not-found-error'
import { isScorerCountConsistent } from '../../policies/match-outcome-rules'
import { isMatchResultRecordable } from '../../policies/match-result-timing-rules'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { MatchDetailsRepository } from '../../repositories/match-details-repository'
import type { MatchEventRepository } from '../../repositories/match-event-repository'

export interface RecordMatchScoreInput {
  convocationId: string
  goalsFor: number
  goalsAgainst: number
  now: Date
}

// specs/match-stats.md MS-01/MS-12/MS-05 — Coach/Staff's own write path
// (`match_result:record`). Authorization stays in RLS
// (match_details_update_record_score) — this use case does NOT call can(),
// deliberately unlike ConfirmAttendanceUseCase/CreateConvocationUseCase
// (specs/match-stats.md build note, "Authorization stays in RLS — use
// cases don't re-check roles").
export class RecordMatchScoreUseCase {
  constructor(
    private readonly convocationRepository: ConvocationRepository,
    private readonly matchEventRepository: MatchEventRepository,
    private readonly matchDetailsRepository: MatchDetailsRepository,
  ) {}

  async execute(input: RecordMatchScoreInput): Promise<MatchDetails> {
    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) {
      throw new NotFoundError(`Convocation ${input.convocationId} not found.`)
    }

    // AC-MS-13/MS-12 — use-case-level guard, no matching SQL guard (accepted
    // risk, see domain/policies/match-result-timing-rules.ts's own comment).
    if (!isMatchResultRecordable(new Date(convocation.date), input.now)) {
      throw new MatchNotStartedError(`Match ${input.convocationId} has not kicked off yet.`)
    }

    // AC-MS-05 — a revised goalsFor may never fall below the number of
    // 'goal' events already recorded for this match (same rule, same
    // predicate, as AddMatchEventUseCase's own check in the other
    // direction).
    const events = await this.matchEventRepository.findByConvocation(input.convocationId)
    const recordedGoalEventCount = events.filter((event) => event.eventType === 'goal').length
    if (!isScorerCountConsistent(input.goalsFor, recordedGoalEventCount)) {
      throw new InconsistentMatchScoreError(
        `Cannot set goalsFor to ${input.goalsFor}: ${recordedGoalEventCount} goal events are already recorded for convocation ${input.convocationId}.`,
      )
    }

    return this.matchDetailsRepository.recordScore(input.convocationId, input.goalsFor, input.goalsAgainst)
  }
}
