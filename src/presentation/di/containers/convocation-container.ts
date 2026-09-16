import type { SupabaseClient } from '@supabase/supabase-js'
import { AttendanceRecordRepositoryImpl } from '@data/repositories/AttendanceRecordRepositoryImpl'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { ConvocationRespondersRepositoryImpl } from '@data/repositories/ConvocationRespondersRepositoryImpl'
import { ConvocationResponseRepositoryImpl } from '@data/repositories/ConvocationResponseRepositoryImpl'
import { MatchDetailsRepositoryImpl } from '@data/repositories/MatchDetailsRepositoryImpl'
import { MeetingDetailsRepositoryImpl } from '@data/repositories/MeetingDetailsRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { SectionRepositoryImpl } from '@data/repositories/SectionRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
// specs/player-vote.md §7 — net-new in this pass: PO-PV-01 is resolved and
// the migration is written, so these back a real Supabase implementation,
// not a throwing stub.
import { VoteCategoryRepositoryImpl } from '@data/repositories/VoteCategoryRepositoryImpl'
import { VoteRepositoryImpl } from '@data/repositories/VoteRepositoryImpl'
import { VoteTallyRepositoryImpl } from '@data/repositories/VoteTallyRepositoryImpl'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { ConvocationRespondersRepository } from '@domain/repositories/convocation-responders-repository'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { MeetingDetailsRepository } from '@domain/repositories/meeting-details-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { SectionRepository } from '@domain/repositories/section-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import type { VoteCategoryRepository } from '@domain/repositories/vote-category-repository'
import type { VoteRepository } from '@domain/repositories/vote-repository'
import type { VoteTallyRepository } from '@domain/repositories/vote-tally-repository'
import { AssembleConvocationDetailFieldsUseCase } from '@domain/usecases/convocation/AssembleConvocationDetailFieldsUseCase'
import { ConfirmAttendanceUseCase } from '@domain/usecases/convocation/ConfirmAttendanceUseCase'
import { CreateConvocationUseCase } from '@domain/usecases/convocation/CreateConvocationUseCase'
import { GetConvocationDetailsUseCase } from '@domain/usecases/convocation/GetConvocationDetailsUseCase'
import { GetConvocationRosterForCoachUseCase } from '@domain/usecases/convocation/GetConvocationRosterForCoachUseCase'
import { GetConvocationWithDetailsUseCase } from '@domain/usecases/convocation/GetConvocationWithDetailsUseCase'
import { ListConvocationRespondersUseCase } from '@domain/usecases/convocation/ListConvocationRespondersUseCase'
import { CastVoteUseCase } from '@domain/usecases/player-vote/CastVoteUseCase'
import { GetMyVoteUseCase } from '@domain/usecases/player-vote/GetMyVoteUseCase'
import { GetVoteCategoryUseCase } from '@domain/usecases/player-vote/GetVoteCategoryUseCase'
import { GetVoteTallyUseCase } from '@domain/usecases/player-vote/GetVoteTallyUseCase'
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
  // 2026-09-16 hero pass — training header title needs the team's section
  // name, not just the team itself (see ConvocationHero).
  sectionRepository: SectionRepository
  convocationRepository: ConvocationRepository
  convocationResponseRepository: ConvocationResponseRepository
  convocationRespondersRepository: ConvocationRespondersRepository
  matchDetailsRepository: MatchDetailsRepository
  meetingDetailsRepository: MeetingDetailsRepository
  opponentRepository: OpponentRepository
  // specs/coach-attendance-confirmation.md §1 — net-new, no implementation
  // existed anywhere in the repo before this pass.
  attendanceRecordRepository: AttendanceRecordRepository
  // specs/player-vote.md §7 — net-new. PO-PV-01 is resolved.
  voteRepository: VoteRepository
  voteTallyRepository: VoteTallyRepository
  voteCategoryRepository: VoteCategoryRepository

  // Use cases
  createConvocationUseCase: CreateConvocationUseCase
  getConvocationDetailsUseCase: GetConvocationDetailsUseCase
  getConvocationWithDetailsUseCase: GetConvocationWithDetailsUseCase
  listConvocationRespondersUseCase: ListConvocationRespondersUseCase
  getConvocationRosterForCoachUseCase: GetConvocationRosterForCoachUseCase
  respondToConvocationUseCase: RespondToConvocationUseCase
  getConvocationResponseByUserUseCase: GetConvocationResponseByUserUseCase
  confirmAttendanceUseCase: ConfirmAttendanceUseCase
  castVoteUseCase: CastVoteUseCase
  getMyVoteUseCase: GetMyVoteUseCase
  getVoteTallyUseCase: GetVoteTallyUseCase
  getVoteCategoryUseCase: GetVoteCategoryUseCase
}

export function createConvocationContainer(supabaseClient: SupabaseClient): ConvocationContainer {
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const sectionRepository = new SectionRepositoryImpl(supabaseClient)
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const convocationResponseRepository = new ConvocationResponseRepositoryImpl(supabaseClient)
  const convocationRespondersRepository = new ConvocationRespondersRepositoryImpl(supabaseClient)
  const matchDetailsRepository = new MatchDetailsRepositoryImpl(supabaseClient)
  const meetingDetailsRepository = new MeetingDetailsRepositoryImpl(supabaseClient)
  const opponentRepository = new OpponentRepositoryImpl(supabaseClient)
  const attendanceRecordRepository = new AttendanceRecordRepositoryImpl(supabaseClient)
  const voteRepository = new VoteRepositoryImpl(supabaseClient)
  const voteTallyRepository = new VoteTallyRepositoryImpl(supabaseClient)
  const voteCategoryRepository = new VoteCategoryRepositoryImpl(supabaseClient)
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
    attendanceRecordRepository,
  )
  const respondToConvocationUseCase = new RespondToConvocationUseCase(userRepository, convocationRepository, convocationResponseRepository)
  const confirmAttendanceUseCase = new ConfirmAttendanceUseCase(userRepository, convocationRepository, attendanceRecordRepository)
  const castVoteUseCase = new CastVoteUseCase(userRepository, convocationRepository, voteRepository)
  const getMyVoteUseCase = new GetMyVoteUseCase(voteRepository)
  const getVoteTallyUseCase = new GetVoteTallyUseCase(voteTallyRepository)
  const getVoteCategoryUseCase = new GetVoteCategoryUseCase(voteCategoryRepository)

  return {
    userRepository,
    seasonRepository,
    teamRepository,
    sectionRepository,
    convocationRepository,
    convocationResponseRepository,
    convocationRespondersRepository,
    matchDetailsRepository,
    meetingDetailsRepository,
    opponentRepository,
    attendanceRecordRepository,
    voteRepository,
    voteTallyRepository,
    voteCategoryRepository,
    createConvocationUseCase,
    getConvocationDetailsUseCase,
    getConvocationWithDetailsUseCase,
    listConvocationRespondersUseCase,
    getConvocationRosterForCoachUseCase,
    respondToConvocationUseCase,
    getConvocationResponseByUserUseCase,
    confirmAttendanceUseCase,
    castVoteUseCase,
    getMyVoteUseCase,
    getVoteTallyUseCase,
    getVoteCategoryUseCase,
  }
}