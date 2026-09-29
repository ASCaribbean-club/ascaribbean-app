import type { CardsSummary } from '@domain/entities/cards-summary'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'

// specs/player-stats.md addendum "PO-PS-03 tranché" — own yellow/red cards.
// Mirrors rbac-matrix.ts 'match_cards:view-own' -> ['player']. Thin
// pass-through, same shape as GetOwnGoalsCountUseCase: the boundary is the
// database (get_my_cards_count()'s own auth.uid() filter, plus the own-row
// RLS branch it depends on).
export class GetOwnCardsCountUseCase {
  constructor(private readonly matchEventRepository: MatchEventRepository) {}

  async execute(): Promise<CardsSummary> {
    return this.matchEventRepository.getOwnCardsCountForCurrentSeason()
  }
}
