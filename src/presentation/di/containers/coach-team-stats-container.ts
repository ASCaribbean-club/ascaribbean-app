import type { SupabaseClient } from '@supabase/supabase-js'
import { AttendanceRecordRepositoryImpl } from '@data/repositories/AttendanceRecordRepositoryImpl'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { MatchEventRepositoryImpl } from '@data/repositories/MatchEventRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { SectionRepositoryImpl } from '@data/repositories/SectionRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { TeamRosterRepositoryImpl } from '@data/repositories/TeamRosterRepositoryImpl'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { SectionRepository } from '@domain/repositories/section-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { TeamRosterRepository } from '@domain/repositories/team-roster-repository'
// specs/coach-team-stats.md UI design §3 — "18 licenciés" reuses the SAME
// {team, activeMemberCount} read the coach-dashboard header already makes
// (team_active_headcount view via TeamRepository.countActiveMembers), never
// a new query on membership/payment data (AC-CTS-11) — reused here as-is
// rather than re-implemented under a new name.
import { GetCoachTeamsUseCase } from '@domain/usecases/coach-dashboard/GetCoachTeamsUseCase'
import { GetTeamStatsUseCase } from '@domain/usecases/coach-team-stats/GetTeamStatsUseCase'

export interface CoachTeamStatsContainer {
  // Repositories
  seasonRepository: SeasonRepository
  teamRepository: TeamRepository
  sectionRepository: SectionRepository
  convocationRepository: ConvocationRepository
  attendanceRecordRepository: AttendanceRecordRepository
  matchEventRepository: MatchEventRepository
  // specs/coach-team-stats.md §1 — net-new, no implementation existed
  // anywhere in the repo before this pass (get_team_roster RPC).
  teamRosterRepository: TeamRosterRepository

  // Use cases
  getCoachTeamsUseCase: GetCoachTeamsUseCase
  getTeamStatsUseCase: GetTeamStatsUseCase
}

export function createCoachTeamStatsContainer(supabaseClient: SupabaseClient): CoachTeamStatsContainer {
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const sectionRepository = new SectionRepositoryImpl(supabaseClient)
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const attendanceRecordRepository = new AttendanceRecordRepositoryImpl(supabaseClient)
  const matchEventRepository = new MatchEventRepositoryImpl(supabaseClient)
  const teamRosterRepository = new TeamRosterRepositoryImpl(supabaseClient)

  return {
    seasonRepository,
    teamRepository,
    sectionRepository,
    convocationRepository,
    attendanceRecordRepository,
    matchEventRepository,
    teamRosterRepository,
    getCoachTeamsUseCase: new GetCoachTeamsUseCase(teamRepository),
    getTeamStatsUseCase: new GetTeamStatsUseCase(teamRosterRepository, convocationRepository, attendanceRecordRepository, matchEventRepository),
  }
}
