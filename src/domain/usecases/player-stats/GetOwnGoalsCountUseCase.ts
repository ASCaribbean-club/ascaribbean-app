import type { MatchEventRepository } from '@domain/repositories/match-event-repository'

// specs/player-stats.md §1/AC-PS-03 — "Buts marqués". No new rbac-matrix
// entry (already covered by the existing 'match_goals:view', §2 "aucune
// action de matrice non plus"). Thin pass-through, same shape as the two
// summary use cases in this folder — season-scoping and the "own goals
// only" boundary both live in get_my_goals_count() (SECURITY INVOKER,
// match_events_select_scoped already lets a team member read their own
// 'goal' rows), not here.
export class GetOwnGoalsCountUseCase {
  constructor(private readonly matchEventRepository: MatchEventRepository) {}

  async execute(): Promise<number> {
    return this.matchEventRepository.getOwnGoalsCountForCurrentSeason()
  }
}
