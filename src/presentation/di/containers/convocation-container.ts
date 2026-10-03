import type { SupabaseClient } from '@supabase/supabase-js'
import { AttendanceRecordRepositoryImpl } from '@data/repositories/AttendanceRecordRepositoryImpl'
import { ConvocationMissionRepositoryImpl } from '@data/repositories/ConvocationMissionRepositoryImpl'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { ConvocationRespondersRepositoryImpl } from '@data/repositories/ConvocationRespondersRepositoryImpl'
import { ConvocationResponseRepositoryImpl } from '@data/repositories/ConvocationResponseRepositoryImpl'
import { MatchDetailsRepositoryImpl } from '@data/repositories/MatchDetailsRepositoryImpl'
// specs/match-stats.md §7/"Forme technique attendue" — net-new in this pass.
import { MatchEventRepositoryImpl } from '@data/repositories/MatchEventRepositoryImpl'
import { MatchLineupRepositoryImpl } from '@data/repositories/MatchLineupRepositoryImpl'
import { MeetingDetailsRepositoryImpl } from '@data/repositories/MeetingDetailsRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { SectionRepositoryImpl } from '@data/repositories/SectionRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { TrainingLocationRepositoryImpl } from '@data/repositories/TrainingLocationRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
// specs/player-vote.md §7 — net-new in this pass: PO-PV-01 is resolved and
// the migration is written, so these back a real Supabase implementation,
// not a throwing stub.
import { VoteCategoryRepositoryImpl } from '@data/repositories/VoteCategoryRepositoryImpl'
import { VoteRepositoryImpl } from '@data/repositories/VoteRepositoryImpl'
import { VoteTallyRepositoryImpl } from '@data/repositories/VoteTallyRepositoryImpl'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import type { ConvocationMissionRepository } from '@domain/repositories/convocation-mission-repository'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import type { ConvocationRespondersRepository } from '@domain/repositories/convocation-responders-repository'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'
import type { MatchLineupRepository } from '@domain/repositories/match-lineup-repository'
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
import { ListAvailableTrainingLocationsUseCase } from '@domain/usecases/training-locations/ListAvailableTrainingLocationsUseCase'
import { CreateConvocationUseCase } from '@domain/usecases/convocation/CreateConvocationUseCase'
import { DeleteConvocationUseCase } from '@domain/usecases/convocation/DeleteConvocationUseCase'
import { GetConvocationDetailsUseCase } from '@domain/usecases/convocation/GetConvocationDetailsUseCase'
import { GetConvocationRosterForCoachUseCase } from '@domain/usecases/convocation/GetConvocationRosterForCoachUseCase'
import { GetConvocationWithDetailsUseCase } from '@domain/usecases/convocation/GetConvocationWithDetailsUseCase'
import { ListConvocationRespondersUseCase } from '@domain/usecases/convocation/ListConvocationRespondersUseCase'
import { UpdateMatchDetailsUseCase } from '@domain/usecases/convocation/UpdateMatchDetailsUseCase'
import { UpdateTrainingScheduleUseCase } from '@domain/usecases/convocation/UpdateTrainingScheduleUseCase'
// specs/match-details-missions.md §2.7 — missions tab use cases.
import { AddAdHocMissionUseCase } from '@domain/usecases/convocation-missions/AddAdHocMissionUseCase'
import { AssignMemberToMissionUseCase } from '@domain/usecases/convocation-missions/AssignMemberToMissionUseCase'
import { ClaimMissionUseCase } from '@domain/usecases/convocation-missions/ClaimMissionUseCase'
import { ListConvocationMissionsUseCase } from '@domain/usecases/convocation-missions/ListConvocationMissionsUseCase'
import { ReleaseMissionUseCase } from '@domain/usecases/convocation-missions/ReleaseMissionUseCase'
import { RemoveMemberFromMissionUseCase } from '@domain/usecases/convocation-missions/RemoveMemberFromMissionUseCase'
import { RemoveMissionUseCase } from '@domain/usecases/convocation-missions/RemoveMissionUseCase'
import { GetMatchLineupUseCase } from '@domain/usecases/match-lineup/GetMatchLineupUseCase'
import { SaveMatchLineupUseCase } from '@domain/usecases/match-lineup/SaveMatchLineupUseCase'
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
// specs/match-stats.md — result-entry (Coach) use cases. GetTeamMatchRecordUseCase/
// GetTeamScorerRankingUseCase are NOT wired here — see this file's own note
// below on the competition_type block.
import { AddMatchEventUseCase } from '@domain/usecases/match-statistics/AddMatchEventUseCase'
import { DeleteMatchEventUseCase } from '@domain/usecases/match-statistics/DeleteMatchEventUseCase'
import { GetMatchEventsUseCase } from '@domain/usecases/match-statistics/GetMatchEventsUseCase'
import { RecordMatchScoreUseCase } from '@domain/usecases/match-statistics/RecordMatchScoreUseCase'

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
  // specs/match-stats.md — net-new. teamStatsRepository/team_match_record/
  // team_scorer_ranking are NOT wired anywhere in this container — blocked
  // on the competition_type backfill decision (see the STOP block in
  // supabase/migrations/20260924100000_match_statistics_schema.sql; no view
  // exists yet for a repository to call).
  matchEventRepository: MatchEventRepository
  // specs/coach-match-composition.md — net-new.
  matchLineupRepository: MatchLineupRepository
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
  // specs/web-localizations.md §2.7 — feeds the training form's location
  // select (non-archived venues only). This container's OWN repository
  // instance, same per-container pattern as every other one above.
  listAvailableTrainingLocationsUseCase: ListAvailableTrainingLocationsUseCase
  getConvocationDetailsUseCase: GetConvocationDetailsUseCase
  getConvocationWithDetailsUseCase: GetConvocationWithDetailsUseCase
  listConvocationRespondersUseCase: ListConvocationRespondersUseCase
  getConvocationRosterForCoachUseCase: GetConvocationRosterForCoachUseCase
  respondToConvocationUseCase: RespondToConvocationUseCase
  getConvocationResponseByUserUseCase: GetConvocationResponseByUserUseCase
  confirmAttendanceUseCase: ConfirmAttendanceUseCase
  // specs/edit-match-details.md §5/§7 — net-new, coach-only write path.
  updateMatchDetailsUseCase: UpdateMatchDetailsUseCase
  updateTrainingScheduleUseCase: UpdateTrainingScheduleUseCase
  deleteConvocationUseCase: DeleteConvocationUseCase
  castVoteUseCase: CastVoteUseCase
  getMyVoteUseCase: GetMyVoteUseCase
  getVoteTallyUseCase: GetVoteTallyUseCase
  getVoteCategoryUseCase: GetVoteCategoryUseCase
  // specs/match-stats.md — result-entry (Coach) use cases, plus the "Résultat"
  // tab's own read (GetMatchEventsUseCase, both role variants). No
  // GetTeamMatchRecordUseCase/GetTeamScorerRankingUseCase here (blocked,
  // see matchEventRepository's own comment above).
  recordMatchScoreUseCase: RecordMatchScoreUseCase
  addMatchEventUseCase: AddMatchEventUseCase
  deleteMatchEventUseCase: DeleteMatchEventUseCase
  getMatchEventsUseCase: GetMatchEventsUseCase
  // specs/coach-match-composition.md — "Composition" tab read/write.
  getMatchLineupUseCase: GetMatchLineupUseCase
  saveMatchLineupUseCase: SaveMatchLineupUseCase
  // specs/match-details-missions.md — "Missions" tab.
  convocationMissionRepository: ConvocationMissionRepository
  listConvocationMissionsUseCase: ListConvocationMissionsUseCase
  claimMissionUseCase: ClaimMissionUseCase
  releaseMissionUseCase: ReleaseMissionUseCase
  assignMemberToMissionUseCase: AssignMemberToMissionUseCase
  removeMemberFromMissionUseCase: RemoveMemberFromMissionUseCase
  addAdHocMissionUseCase: AddAdHocMissionUseCase
  removeMissionUseCase: RemoveMissionUseCase
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
  const matchEventRepository = new MatchEventRepositoryImpl(supabaseClient)
  const matchLineupRepository = new MatchLineupRepositoryImpl(supabaseClient)
  const meetingDetailsRepository = new MeetingDetailsRepositoryImpl(supabaseClient)
  const opponentRepository = new OpponentRepositoryImpl(supabaseClient)
  const attendanceRecordRepository = new AttendanceRecordRepositoryImpl(supabaseClient)
  const voteRepository = new VoteRepositoryImpl(supabaseClient)
  const voteTallyRepository = new VoteTallyRepositoryImpl(supabaseClient)
  const voteCategoryRepository = new VoteCategoryRepositoryImpl(supabaseClient)
  const trainingLocationRepository = new TrainingLocationRepositoryImpl(supabaseClient)
  const listAvailableTrainingLocationsUseCase = new ListAvailableTrainingLocationsUseCase(trainingLocationRepository)
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
  const updateMatchDetailsUseCase = new UpdateMatchDetailsUseCase(convocationRepository, matchDetailsRepository)
  const updateTrainingScheduleUseCase = new UpdateTrainingScheduleUseCase(convocationRepository)
  const deleteConvocationUseCase = new DeleteConvocationUseCase(convocationRepository)
  const castVoteUseCase = new CastVoteUseCase(userRepository, convocationRepository, voteRepository)
  const getMyVoteUseCase = new GetMyVoteUseCase(voteRepository)
  const getVoteTallyUseCase = new GetVoteTallyUseCase(voteTallyRepository)
  const getVoteCategoryUseCase = new GetVoteCategoryUseCase(voteCategoryRepository)
  const recordMatchScoreUseCase = new RecordMatchScoreUseCase(convocationRepository, matchEventRepository, matchDetailsRepository)
  const addMatchEventUseCase = new AddMatchEventUseCase(convocationRepository, matchDetailsRepository, matchEventRepository)
  const deleteMatchEventUseCase = new DeleteMatchEventUseCase(matchEventRepository)
  const getMatchEventsUseCase = new GetMatchEventsUseCase(matchEventRepository)
  const getMatchLineupUseCase = new GetMatchLineupUseCase(matchLineupRepository)
  const saveMatchLineupUseCase = new SaveMatchLineupUseCase(convocationRepository, convocationRespondersRepository, matchLineupRepository)
  const convocationMissionRepository = new ConvocationMissionRepositoryImpl(supabaseClient)
  const listConvocationMissionsUseCase = new ListConvocationMissionsUseCase(convocationMissionRepository)
  const claimMissionUseCase = new ClaimMissionUseCase(
    userRepository,
    convocationRepository,
    teamRepository,
    convocationRespondersRepository,
    convocationMissionRepository,
  )
  const releaseMissionUseCase = new ReleaseMissionUseCase(
    userRepository,
    convocationRepository,
    teamRepository,
    convocationRespondersRepository,
    convocationMissionRepository,
  )
  const assignMemberToMissionUseCase = new AssignMemberToMissionUseCase(
    userRepository,
    convocationRepository,
    teamRepository,
    convocationRespondersRepository,
    convocationMissionRepository,
  )
  const removeMemberFromMissionUseCase = new RemoveMemberFromMissionUseCase(
    userRepository,
    convocationRepository,
    teamRepository,
    convocationMissionRepository,
  )
  const addAdHocMissionUseCase = new AddAdHocMissionUseCase(userRepository, convocationRepository, teamRepository, convocationMissionRepository)
  const removeMissionUseCase = new RemoveMissionUseCase(userRepository, convocationRepository, teamRepository, convocationMissionRepository)

  return {
    userRepository,
    seasonRepository,
    teamRepository,
    sectionRepository,
    convocationRepository,
    convocationResponseRepository,
    convocationRespondersRepository,
    matchDetailsRepository,
    matchEventRepository,
    matchLineupRepository,
    meetingDetailsRepository,
    opponentRepository,
    attendanceRecordRepository,
    voteRepository,
    voteTallyRepository,
    voteCategoryRepository,
    createConvocationUseCase,
    listAvailableTrainingLocationsUseCase,
    getConvocationDetailsUseCase,
    getConvocationWithDetailsUseCase,
    listConvocationRespondersUseCase,
    getConvocationRosterForCoachUseCase,
    respondToConvocationUseCase,
    getConvocationResponseByUserUseCase,
    confirmAttendanceUseCase,
    updateMatchDetailsUseCase,
    updateTrainingScheduleUseCase,
    deleteConvocationUseCase,
    castVoteUseCase,
    getMyVoteUseCase,
    getVoteTallyUseCase,
    getVoteCategoryUseCase,
    recordMatchScoreUseCase,
    addMatchEventUseCase,
    deleteMatchEventUseCase,
    getMatchEventsUseCase,
    getMatchLineupUseCase,
    saveMatchLineupUseCase,
    convocationMissionRepository,
    listConvocationMissionsUseCase,
    claimMissionUseCase,
    releaseMissionUseCase,
    assignMemberToMissionUseCase,
    removeMemberFromMissionUseCase,
    addAdHocMissionUseCase,
    removeMissionUseCase,
  }
}