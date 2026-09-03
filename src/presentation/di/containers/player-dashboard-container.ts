import type { SupabaseClient } from '@supabase/supabase-js'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { ConvocationResponseRepositoryImpl } from '@data/repositories/ConvocationResponseRepositoryImpl'
import { DocumentRepositoryImpl } from '@data/repositories/DocumentRepositoryImpl'
import { MatchDetailsRepositoryImpl } from '@data/repositories/MatchDetailsRepositoryImpl'
import { MeetingDetailsRepositoryImpl } from '@data/repositories/MeetingDetailsRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { DocumentRepository } from '@domain/repositories/document-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { MeetingDetailsRepository } from '@domain/repositories/meeting-details-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import { GetPlayerTeamUseCase } from '@domain/usecases/player-dashboard/GetPlayerTeamUseCase'
import { ListUserMissingOrRejectedDocumentsUseCase } from '@/domain/usecases/player-dashboard/ListUserMissingOrRejectedDocumentsUseCase'
import { ListUpcomingConvocationsForPlayerUseCase } from '@domain/usecases/player-dashboard/ListUpcomingConvocationsForPlayerUseCase'
import { RespondToConvocationUseCase } from '@domain/usecases/player-dashboard/RespondToConvocationUseCase'
import { AssembleConvocationDetailFieldsUseCase } from '@/domain/usecases/convocation/AssembleConvocationDetailFieldsUseCase'
import { GetConvocationDetailsUseCase } from '@/domain/usecases/convocation/GetConvocationDetailsUseCase'
import { UserRepositoryImpl } from '@/data/repositories/UserRepositoryImpl'
import type { UserRepository } from '@/domain/repositories/user-repository'

export interface PlayerDashboardContainer {
  // Repositories
  userRepository: UserRepository
  seasonRepository: SeasonRepository
  teamRepository: TeamRepository
  convocationRepository: ConvocationRepository
  convocationResponseRepository: ConvocationResponseRepository
  matchDetailsRepository: MatchDetailsRepository
  meetingDetailsRepository: MeetingDetailsRepository
  opponentRepository: OpponentRepository
  documentRepository: DocumentRepository

  // Use cases
  getPlayerTeamUseCase: GetPlayerTeamUseCase
  getConvocationDetailsUseCase: GetConvocationDetailsUseCase
  listUpcomingConvocationsForPlayerUseCase: ListUpcomingConvocationsForPlayerUseCase
  respondToConvocationUseCase: RespondToConvocationUseCase
  listUserMissingOrRejectedDocumentsUseCase: ListUserMissingOrRejectedDocumentsUseCase
}

export function createPlayerDashboardContainer(supabaseClient: SupabaseClient): PlayerDashboardContainer {
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const convocationResponseRepository = new ConvocationResponseRepositoryImpl(supabaseClient)
  const matchDetailsRepository = new MatchDetailsRepositoryImpl(supabaseClient)
  const meetingDetailsRepository = new MeetingDetailsRepositoryImpl(supabaseClient)
  const opponentRepository = new OpponentRepositoryImpl(supabaseClient)
  const documentRepository = new DocumentRepositoryImpl(supabaseClient)
  const getConvocationDetailsUseCase = new GetConvocationDetailsUseCase(meetingDetailsRepository, matchDetailsRepository)
  const assembleConvocationDetailFieldsUseCase = new AssembleConvocationDetailFieldsUseCase(opponentRepository)

  return {
    userRepository,
    seasonRepository,
    teamRepository,
    convocationRepository,
    convocationResponseRepository,
    matchDetailsRepository,
    meetingDetailsRepository,
    opponentRepository,
    documentRepository,
    getPlayerTeamUseCase: new GetPlayerTeamUseCase(teamRepository),
    getConvocationDetailsUseCase: getConvocationDetailsUseCase,
    listUpcomingConvocationsForPlayerUseCase: new ListUpcomingConvocationsForPlayerUseCase(
      convocationRepository,
      convocationResponseRepository,
      assembleConvocationDetailFieldsUseCase,
      getConvocationDetailsUseCase,
    ),
    respondToConvocationUseCase: new RespondToConvocationUseCase(userRepository, convocationRepository, convocationResponseRepository),
    listUserMissingOrRejectedDocumentsUseCase: new ListUserMissingOrRejectedDocumentsUseCase(documentRepository),
  }
}
