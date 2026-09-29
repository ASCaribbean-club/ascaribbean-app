import type { ResponseSummary } from '@domain/entities/response-summary'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'

// specs/player-stats.md §2/§6.3 — mirrors rbac-matrix.ts
// 'response:read-own-summary' -> ['player']. Same thin pass-through shape
// as GetOwnAttendanceSummaryUseCase — the real boundary is the database
// (get_my_response_summary's own auth.uid() filter,
// convocation_responses_select_own_or_coach, §6.2) and the repository's own
// interface shape (no userId parameter, AC-02).
export class GetOwnResponseSummaryUseCase {
  constructor(private readonly convocationResponseRepository: ConvocationResponseRepository) {}

  async execute(): Promise<ResponseSummary> {
    return this.convocationResponseRepository.getOwnResponseSummary()
  }
}
