import type { MatchEvent } from '../../entities/match-event'
import type { MatchEventRepository } from '../../repositories/match-event-repository'

// specs/match-stats.md §2 — the "Résultats" tab's own read path for BOTH
// role variants (`match_goals:view`/`match_staff_events:view`). Thin
// pass-through, same reasoning as DeleteMatchEventUseCase: the actual
// visibility split (goal vs everything else) is enforced by RLS's own
// whitelist-on-goal policy (MS-09), not re-derived here — a player token
// simply never gets a non-goal row back from `findByConvocation` itself.
export class GetMatchEventsUseCase {
  constructor(private readonly matchEventRepository: MatchEventRepository) {}

  async execute(convocationId: string): Promise<MatchEvent[]> {
    return this.matchEventRepository.findByConvocation(convocationId)
  }
}
