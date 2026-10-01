import type { SupabaseClient } from '@supabase/supabase-js'
import { AdminConvocationRepositoryImpl } from '@data/repositories/AdminConvocationRepositoryImpl'
import { AttendanceRecordRepositoryImpl } from '@data/repositories/AttendanceRecordRepositoryImpl'
import { AuditLogRepositoryImpl } from '@data/repositories/AuditLogRepositoryImpl'
import { ConvocationRepositoryImpl } from '@data/repositories/ConvocationRepositoryImpl'
import { OpponentRepositoryImpl } from '@data/repositories/OpponentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { SectionRepositoryImpl } from '@data/repositories/SectionRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { TeamRosterRepositoryImpl } from '@data/repositories/TeamRosterRepositoryImpl'
import { TrainingLocationRepositoryImpl } from '@data/repositories/TrainingLocationRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { AdminConvocationRepository } from '@domain/repositories/admin-convocation-repository'
import type { OpponentRepository } from '@domain/repositories/opponent-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { SectionRepository } from '@domain/repositories/section-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import { CreateConvocationUseCase } from '@domain/usecases/convocation/CreateConvocationUseCase'
import { UpdateConvocationUseCase } from '@domain/usecases/convocation/UpdateConvocationUseCase'
import { GetAdminAttendanceSheetUseCase } from '@domain/usecases/convocation-admin/GetAdminAttendanceSheetUseCase'
import { ListAdminConvocationsUseCase } from '@domain/usecases/convocation-admin/ListAdminConvocationsUseCase'
import { RecordAttendanceByAdminUseCase } from '@domain/usecases/convocation-admin/RecordAttendanceByAdminUseCase'
import { ListAvailableTrainingLocationsUseCase } from '@domain/usecases/training-locations/ListAvailableTrainingLocationsUseCase'

// specs/web-create-convocation.md — its own container (own repository
// instances, same per-feature pattern as every other di/containers/ file).
// The plain reads (seasons, sections, teams, opponents, convocation detail)
// are exposed as repositories and called directly by the ViewModels — same
// "no wrapping use case for a plain passthrough read" precedent as
// useBackofficeTeamsViewModel.
export interface ConvocationAdminContainer {
  adminConvocationRepository: AdminConvocationRepository
  seasonRepository: SeasonRepository
  sectionRepository: SectionRepository
  teamRepository: TeamRepository
  opponentRepository: OpponentRepository
  listAdminConvocationsUseCase: ListAdminConvocationsUseCase
  listAvailableTrainingLocationsUseCase: ListAvailableTrainingLocationsUseCase
  createConvocationUseCase: CreateConvocationUseCase
  updateConvocationUseCase: UpdateConvocationUseCase
  getAdminAttendanceSheetUseCase: GetAdminAttendanceSheetUseCase
  recordAttendanceByAdminUseCase: RecordAttendanceByAdminUseCase
}

export function createConvocationAdminContainer(supabaseClient: SupabaseClient): ConvocationAdminContainer {
  const adminConvocationRepository = new AdminConvocationRepositoryImpl(supabaseClient)
  const convocationRepository = new ConvocationRepositoryImpl(supabaseClient)
  const attendanceRecordRepository = new AttendanceRecordRepositoryImpl(supabaseClient)
  const auditLogRepository = new AuditLogRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const sectionRepository = new SectionRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const teamRosterRepository = new TeamRosterRepositoryImpl(supabaseClient)
  const opponentRepository = new OpponentRepositoryImpl(supabaseClient)
  const trainingLocationRepository = new TrainingLocationRepositoryImpl(supabaseClient)

  return {
    adminConvocationRepository,
    seasonRepository,
    sectionRepository,
    teamRepository,
    opponentRepository,
    listAdminConvocationsUseCase: new ListAdminConvocationsUseCase(adminConvocationRepository),
    listAvailableTrainingLocationsUseCase: new ListAvailableTrainingLocationsUseCase(trainingLocationRepository),
    createConvocationUseCase: new CreateConvocationUseCase(userRepository, teamRepository, convocationRepository),
    updateConvocationUseCase: new UpdateConvocationUseCase(userRepository, convocationRepository, opponentRepository),
    getAdminAttendanceSheetUseCase: new GetAdminAttendanceSheetUseCase(
      convocationRepository,
      teamRepository,
      teamRosterRepository,
      attendanceRecordRepository,
    ),
    recordAttendanceByAdminUseCase: new RecordAttendanceByAdminUseCase(
      userRepository,
      convocationRepository,
      attendanceRecordRepository,
      teamRosterRepository,
      auditLogRepository,
    ),
  }
}
