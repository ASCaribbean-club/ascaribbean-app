import type { SupabaseClient } from '@supabase/supabase-js'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { ConvocationRespondersRepositoryImpl } from '@data/repositories/ConvocationRespondersRepositoryImpl'
import { ConvocationResponseRepositoryImpl } from '@data/repositories/ConvocationResponseRepositoryImpl'
import { MatchDetailsRepositoryImpl } from '@data/repositories/MatchDetailsRepositoryImpl'
import { MeetingDetailsRepositoryImpl } from '@data/repositories/MeetingDetailsRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { ConvocationRespondersRepository } from '@domain/repositories/convocation-responders-repository'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { MeetingDetailsRepository } from '@domain/repositories/meeting-details-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { AssembleConvocationDetailFieldsUseCase } from '@domain/usecases/convocation/AssembleConvocationDetailFieldsUseCase'
import { GetConvocationDetailsUseCase } from '@domain/usecases/convocation/GetConvocationDetailsUseCase'
import { GetCoachTeamsUseCase } from '@domain/usecases/coach-dashboard/GetCoachTeamsUseCase'
import { ListTeamConvocationsUseCase } from '@/domain/usecases/coach-dashboard/ListTeamConvocationsUseCase'
import { GetPlayerTeamUseCase } from '@domain/usecases/player-dashboard/GetPlayerTeamUseCase'
import { ListUpcomingConvocationsForPlayerUseCase as ListConvocationsForPlayerUseCase } from '@/domain/usecases/player-dashboard/ListUConvocationsForPlayerUseCase'
// specs/calendar.md §7 (mentor-agent note) — reused as-is, a second
// constructor call, exactly the pattern already established by
// convocation-container.ts for the very same class ("Aucune nouvelle
// permission, aucune entrée de matrice").
import { RespondToConvocationUseCase } from '@domain/usecases/player-dashboard/RespondToConvocationUseCase'

// specs/calendar.md §7 — "réutiliser les use cases existants avant d'en
// créer": this container wires the SAME ListUpcomingTeamConvocationsUseCase
// (coach) and ListUpcomingConvocationsForPlayerUseCase (player) already used
// by coach-dashboard/player-dashboard, plus the same team-resolution use
// cases (GetCoachTeamsUseCase / GetPlayerTeamUseCase) — no Calendar-specific
// use case exists, and none should be added unless a future spec pass
// genuinely can't extend one of these. Repositories are instantiated fresh
// here rather than shared with the other containers — the same accepted
// duplication already present between coach-dashboard-container.ts and
// player-dashboard-container.ts, not a new pattern.
export interface CalendarContainer {
  // Repositories
  userRepository: UserRepository
  seasonRepository: SeasonRepository
  teamRepository: TeamRepository
  convocationRepository: ConvocationRepository
  convocationResponseRepository: ConvocationResponseRepository
  convocationRespondersRepository: ConvocationRespondersRepository
  matchDetailsRepository: MatchDetailsRepository
  meetingDetailsRepository: MeetingDetailsRepository
  opponentRepository: OpponentRepository

  // Use cases
  getCoachTeamsUseCase: GetCoachTeamsUseCase
  getPlayerTeamUseCase: GetPlayerTeamUseCase
  listTeamConvocationsUseCase: ListTeamConvocationsUseCase
  listConvocationsForPlayerUseCase: ListConvocationsForPlayerUseCase
  respondToConvocationUseCase: RespondToConvocationUseCase
}

export function createCalendarContainer(supabaseClient: SupabaseClient): CalendarContainer {
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const convocationResponseRepository = new ConvocationResponseRepositoryImpl(supabaseClient)
  const convocationRespondersRepository = new ConvocationRespondersRepositoryImpl(supabaseClient)
  const matchDetailsRepository = new MatchDetailsRepositoryImpl(supabaseClient)
  const meetingDetailsRepository = new MeetingDetailsRepositoryImpl(supabaseClient)
  const opponentRepository = new OpponentRepositoryImpl(supabaseClient)

  const getConvocationDetailsUseCase = new GetConvocationDetailsUseCase(meetingDetailsRepository, matchDetailsRepository)
  const assembleConvocationDetailFieldsUseCase = new AssembleConvocationDetailFieldsUseCase(opponentRepository)

  return {
    userRepository,
    seasonRepository,
    teamRepository,
    convocationRepository,
    convocationResponseRepository,
    convocationRespondersRepository,
    matchDetailsRepository,
    meetingDetailsRepository,
    opponentRepository,
    getCoachTeamsUseCase: new GetCoachTeamsUseCase(teamRepository),
    getPlayerTeamUseCase: new GetPlayerTeamUseCase(teamRepository),
    listTeamConvocationsUseCase: new ListTeamConvocationsUseCase(
      convocationRepository,
      convocationResponseRepository,
      convocationRespondersRepository,
      matchDetailsRepository,
      opponentRepository,
    ),
    listConvocationsForPlayerUseCase: new ListConvocationsForPlayerUseCase(
      convocationRepository,
      convocationResponseRepository,
      assembleConvocationDetailFieldsUseCase,
      getConvocationDetailsUseCase,
    ),
    respondToConvocationUseCase: new RespondToConvocationUseCase(userRepository, convocationRepository, convocationResponseRepository),
  }
}
