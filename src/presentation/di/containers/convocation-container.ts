import type { SupabaseClient } from '@supabase/supabase-js'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { MatchDetailsRepositoryImpl } from '@data/repositories/MatchDetailsRepositoryImpl'
import { MeetingDetailsRepositoryImpl } from '@data/repositories/MeetingDetailsRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { MeetingDetailsRepository } from '@domain/repositories/meeting-details-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { CreateConvocationUseCase } from '@domain/usecases/convocation/CreateConvocationUseCase'
import { GetConvocationDetailsUseCase } from '@domain/usecases/convocation/GetConvocationDetailsUseCase'

export interface ConvocationContainer {
  // Repositories
  userRepository: UserRepository
  seasonRepository: SeasonRepository
  teamRepository: TeamRepository
  convocationRepository: ConvocationRepository
  matchDetailsRepository: MatchDetailsRepository
  meetingDetailsRepository: MeetingDetailsRepository
  opponentRepository: OpponentRepository

  // Use cases
  createConvocationUseCase: CreateConvocationUseCase
  getConvocationDetailsUseCase: GetConvocationDetailsUseCase
}

export function createConvocationContainer(supabaseClient: SupabaseClient): ConvocationContainer {
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const matchDetailsRepository = new MatchDetailsRepositoryImpl(supabaseClient)
  const meetingDetailsRepository = new MeetingDetailsRepositoryImpl(supabaseClient)
  const opponentRepository = new OpponentRepositoryImpl(supabaseClient)

  return {
    userRepository,
    seasonRepository,
    teamRepository,
    convocationRepository,
    matchDetailsRepository,
    meetingDetailsRepository,
    opponentRepository,
    createConvocationUseCase: new CreateConvocationUseCase(userRepository, teamRepository, convocationRepository),
    getConvocationDetailsUseCase: new GetConvocationDetailsUseCase(meetingDetailsRepository, matchDetailsRepository),
  }
}