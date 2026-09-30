import type { SupabaseClient } from '@supabase/supabase-js'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { MatchDetailsRepositoryImpl } from '@data/repositories/MatchDetailsRepositoryImpl'
import { MatchEventRepositoryImpl } from '@data/repositories/MatchEventRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import { ListCoachAlertsUseCase } from '@domain/usecases/coach-alerts/ListCoachAlertsUseCase'

// specs/coach-alerts.md §6 point 2 — no repository built for this feature:
// every one of the four repos below already exists (ConvocationRepository/
// MatchDetailsRepository/MatchEventRepository from coach-dashboard/
// coach-team-stats, OpponentRepository from create-convocation/
// coach-dashboard), same RLS boundary as their existing call sites — this
// container only wires them into the one new use case this screen needs.
export interface CoachAlertsContainer {
  // Repositories
  convocationRepository: ConvocationRepository
  matchDetailsRepository: MatchDetailsRepository
  matchEventRepository: MatchEventRepository
  opponentRepository: OpponentRepository

  // Use cases
  listCoachAlertsUseCase: ListCoachAlertsUseCase
}

export function createCoachAlertsContainer(supabaseClient: SupabaseClient): CoachAlertsContainer {
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const matchDetailsRepository = new MatchDetailsRepositoryImpl(supabaseClient)
  const matchEventRepository = new MatchEventRepositoryImpl(supabaseClient)
  const opponentRepository = new OpponentRepositoryImpl(supabaseClient)

  return {
    convocationRepository,
    matchDetailsRepository,
    matchEventRepository,
    opponentRepository,
    listCoachAlertsUseCase: new ListCoachAlertsUseCase(convocationRepository, matchDetailsRepository, matchEventRepository, opponentRepository),
  }
}
