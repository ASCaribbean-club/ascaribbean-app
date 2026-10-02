import type { SupabaseClient } from '@supabase/supabase-js'
import { LeaderboardRepositoryImpl } from '@data/repositories/LeaderboardRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import type { LeaderboardRepository } from '@domain/repositories/leaderboard-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import { GetCoachTeamsUseCase } from '@domain/usecases/coach-dashboard/GetCoachTeamsUseCase'
import { GetTeamLeaderboardUseCase } from '@domain/usecases/leaderboard/GetTeamLeaderboardUseCase'
import { GetTeamPresenceLeaderboardUseCase } from '@domain/usecases/leaderboard/GetTeamPresenceLeaderboardUseCase'

export interface LeaderboardContainer {
  // Repositories
  leaderboardRepository: LeaderboardRepository
  // "No current season" empty state (AC-LB-15), same read as coach-team-stats.
  seasonRepository: SeasonRepository

  // Use cases
  // Reused so a coach's team resolves exactly like the other coach screens
  // (shared queryKeys.coachTeams cache, selected team else first).
  getCoachTeamsUseCase: GetCoachTeamsUseCase
  getTeamLeaderboardUseCase: GetTeamLeaderboardUseCase
  getTeamPresenceLeaderboardUseCase: GetTeamPresenceLeaderboardUseCase
}

export function createLeaderboardContainer(supabaseClient: SupabaseClient): LeaderboardContainer {
  const leaderboardRepository = new LeaderboardRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)

  return {
    leaderboardRepository,
    seasonRepository,
    getCoachTeamsUseCase: new GetCoachTeamsUseCase(teamRepository),
    getTeamLeaderboardUseCase: new GetTeamLeaderboardUseCase(leaderboardRepository),
    getTeamPresenceLeaderboardUseCase: new GetTeamPresenceLeaderboardUseCase(leaderboardRepository),
  }
}
