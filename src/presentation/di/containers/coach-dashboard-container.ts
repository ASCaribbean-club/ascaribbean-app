import type { SupabaseClient } from '@supabase/supabase-js'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { ConvocationRespondersRepositoryImpl } from '@data/repositories/ConvocationRespondersRepositoryImpl'
import { ConvocationResponseRepositoryImpl } from '@data/repositories/ConvocationResponseRepositoryImpl'
import { MatchDetailsRepositoryImpl } from '@data/repositories/MatchDetailsRepositoryImpl'
import { MatchEventRepositoryImpl } from '@data/repositories/MatchEventRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { ConvocationRespondersRepository } from '@domain/repositories/convocation-responders-repository'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import { GetCoachTeamsUseCase } from '@domain/usecases/coach-dashboard/GetCoachTeamsUseCase'
import { ListTeamConvocationsUseCase } from '@/domain/usecases/coach-dashboard/ListTeamConvocationsUseCase'
import { GetTeamRecentFormUseCase } from '@domain/usecases/team-form/GetTeamRecentFormUseCase'
// specs/coach-alerts.md PO-AL-03, re-résolu 2026-09-30 (décision
// développeuse) — le badge de compteur sur l'icône d'alerte demande le
// même calcul en bloc que l'écran Alertes lui-même. Même use case, même
// queryKey (`coachAlerts`) que coach-alerts-container.ts : le cache
// TanStack Query est partagé entre les deux écrans, pas une seconde
// lecture indépendante.
import { ListCoachAlertsUseCase } from '@domain/usecases/coach-alerts/ListCoachAlertsUseCase'

export interface CoachDashboardContainer {
  // Repositories
  seasonRepository: SeasonRepository
  teamRepository: TeamRepository
  convocationRepository: ConvocationRepository
  convocationResponseRepository: ConvocationResponseRepository
  convocationRespondersRepository: ConvocationRespondersRepository
  matchDetailsRepository: MatchDetailsRepository
  matchEventRepository: MatchEventRepository
  opponentRepository: OpponentRepository

  // Use cases
  getCoachTeamsUseCase: GetCoachTeamsUseCase
  listTeamConvocationsUseCase: ListTeamConvocationsUseCase
  getTeamRecentFormUseCase: GetTeamRecentFormUseCase
  listCoachAlertsUseCase: ListCoachAlertsUseCase
}

export function createCoachDashboardContainer(supabaseClient: SupabaseClient): CoachDashboardContainer {
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const convocationResponseRepository = new ConvocationResponseRepositoryImpl(supabaseClient)
  const convocationRespondersRepository = new ConvocationRespondersRepositoryImpl(supabaseClient)
  const matchDetailsRepository = new MatchDetailsRepositoryImpl(supabaseClient)
  const matchEventRepository = new MatchEventRepositoryImpl(supabaseClient)
  const opponentRepository = new OpponentRepositoryImpl(supabaseClient)

  return {
    seasonRepository,
    teamRepository,
    convocationRepository,
    convocationResponseRepository,
    convocationRespondersRepository,
    matchDetailsRepository,
    matchEventRepository,
    opponentRepository,
    getCoachTeamsUseCase: new GetCoachTeamsUseCase(teamRepository),
    listTeamConvocationsUseCase: new ListTeamConvocationsUseCase(
      convocationRepository,
      convocationResponseRepository,
      convocationRespondersRepository,
      matchDetailsRepository,
      opponentRepository,
    ),
    getTeamRecentFormUseCase: new GetTeamRecentFormUseCase(convocationRepository, matchDetailsRepository),
    listCoachAlertsUseCase: new ListCoachAlertsUseCase(convocationRepository, matchDetailsRepository, matchEventRepository, opponentRepository),
  }
}
