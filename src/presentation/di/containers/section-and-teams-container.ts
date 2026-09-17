import type { SupabaseClient } from '@supabase/supabase-js'
import { CoachRepositoryImpl } from '@data/repositories/CoachRepositoryImpl'
import { RoleAssignmentRepositoryImpl } from '@data/repositories/RoleAssignmentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { SectionRepositoryImpl } from '@data/repositories/SectionRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { CoachRepository } from '@domain/repositories/coach-repository'
import type { RoleAssignmentRepository } from '@domain/repositories/role-assignment-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { SectionRepository } from '@domain/repositories/section-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { AssignCoachToTeamsUseCase } from '@domain/usecases/section-and-teams/AssignCoachToTeamsUseCase'
import { CreateSectionUseCase } from '@domain/usecases/section-and-teams/CreateSectionUseCase'
import { CreateTeamUseCase } from '@domain/usecases/section-and-teams/CreateTeamUseCase'
import { UpdateSectionUseCase } from '@domain/usecases/section-and-teams/UpdateSectionUseCase'
import { UpdateTeamUseCase } from '@domain/usecases/section-and-teams/UpdateTeamUseCase'

// specs/section-and-teams.md §2.7 — a dedicated container for the
// /admin/sections and /admin/teams write paths, shared by both screens
// (they read the exact same repositories, only their destination differs,
// §1 "Note de cadrage"). Its OWN repository instances, not shared with the
// ones other containers (profile-container.ts, coach-dashboard-container.ts,
// ...) already instantiate for their own needs — same per-container
// instance pattern used throughout di/containers/.
export interface SectionAndTeamsContainer {
  sectionRepository: SectionRepository
  teamRepository: TeamRepository
  seasonRepository: SeasonRepository
  coachRepository: CoachRepository
  userRepository: UserRepository
  roleAssignmentRepository: RoleAssignmentRepository

  createSectionUseCase: CreateSectionUseCase
  updateSectionUseCase: UpdateSectionUseCase
  createTeamUseCase: CreateTeamUseCase
  updateTeamUseCase: UpdateTeamUseCase
  assignCoachToTeamsUseCase: AssignCoachToTeamsUseCase
}

export function createSectionAndTeamsContainer(supabaseClient: SupabaseClient): SectionAndTeamsContainer {
  const sectionRepository = new SectionRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const coachRepository = new CoachRepositoryImpl(supabaseClient)
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const roleAssignmentRepository = new RoleAssignmentRepositoryImpl(supabaseClient)

  return {
    sectionRepository,
    teamRepository,
    seasonRepository,
    coachRepository,
    userRepository,
    roleAssignmentRepository,
    createSectionUseCase: new CreateSectionUseCase(userRepository, sectionRepository),
    updateSectionUseCase: new UpdateSectionUseCase(userRepository, sectionRepository),
    createTeamUseCase: new CreateTeamUseCase(userRepository, teamRepository),
    updateTeamUseCase: new UpdateTeamUseCase(userRepository, teamRepository),
    assignCoachToTeamsUseCase: new AssignCoachToTeamsUseCase(userRepository, roleAssignmentRepository),
  }
}
