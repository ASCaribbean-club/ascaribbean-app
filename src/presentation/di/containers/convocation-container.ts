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
import { CreateConvocationUseCase } from '@domain/usecases/convocation/CreateConvocationUseCase'
import { GetConvocationDetailsUseCase } from '@domain/usecases/convocation/GetConvocationDetailsUseCase'
import { GetConvocationRosterForCoachUseCase } from '@domain/usecases/convocation/GetConvocationRosterForCoachUseCase'
import { GetConvocationWithDetailsUseCase } from '@domain/usecases/convocation/GetConvocationWithDetailsUseCase'
import { ListConvocationRespondersUseCase } from '@domain/usecases/convocation/ListConvocationRespondersUseCase'
// specs/match_details_page.md §1 point 6 — reused as-is, not re-implemented:
// "Aucune nouvelle permission, aucune entrée de matrice." The screen's own
// use case is RespondToConvocationUseCase, already wired for
// player-dashboard — same class, a second constructor call here.
import { RespondToConvocationUseCase } from '@domain/usecases/player-dashboard/RespondToConvocationUseCase'
import { GetConvocationResponseByUserUseCase } from '@/domain/usecases/convocation/GetConvocationResponseByUserUseCase'

export interface ConvocationContainer {
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
  createConvocationUseCase: CreateConvocationUseCase
  getConvocationDetailsUseCase: GetConvocationDetailsUseCase
  getConvocationWithDetailsUseCase: GetConvocationWithDetailsUseCase
  listConvocationRespondersUseCase: ListConvocationRespondersUseCase
  getConvocationRosterForCoachUseCase: GetConvocationRosterForCoachUseCase
  respondToConvocationUseCase: RespondToConvocationUseCase
  getConvocationResponseByUserUseCase: GetConvocationResponseByUserUseCase
}

export function createConvocationContainer(supabaseClient: SupabaseClient): ConvocationContainer {
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
  const getConvocationResponseByUserUseCase = new GetConvocationResponseByUserUseCase(convocationResponseRepository)
  const assembleConvocationDetailFieldsUseCase = new AssembleConvocationDetailFieldsUseCase(opponentRepository)
  const createConvocationUseCase = new CreateConvocationUseCase(userRepository, teamRepository, convocationRepository)
  const getConvocationWithDetailsUseCase = new GetConvocationWithDetailsUseCase(
    convocationRepository,
    getConvocationDetailsUseCase,
    assembleConvocationDetailFieldsUseCase,
  )
  const listConvocationRespondersUseCase = new ListConvocationRespondersUseCase(convocationRespondersRepository)
  const getConvocationRosterForCoachUseCase = new GetConvocationRosterForCoachUseCase(
    convocationRespondersRepository,
    convocationResponseRepository,
  )
  const respondToConvocationUseCase = new RespondToConvocationUseCase(userRepository, convocationRepository, convocationResponseRepository)

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
    createConvocationUseCase,
    getConvocationDetailsUseCase,
    getConvocationWithDetailsUseCase,
    listConvocationRespondersUseCase,
    getConvocationRosterForCoachUseCase,
    respondToConvocationUseCase,
    getConvocationResponseByUserUseCase,
  }
}