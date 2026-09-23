import type { SupabaseClient } from '@supabase/supabase-js'
import { RoleAssignmentRepositoryImpl } from '@data/repositories/RoleAssignmentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { SectionRepositoryImpl } from '@data/repositories/SectionRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { RoleAssignmentRepository } from '@domain/repositories/role-assignment-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { SectionRepository } from '@domain/repositories/section-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { AssignRoleUseCase } from '@domain/usecases/users/AssignRoleUseCase'
import { CountUsersRequiringAttentionUseCase } from '@domain/usecases/users/CountUsersRequiringAttentionUseCase'
import { EditRoleAssignmentScopeUseCase } from '@domain/usecases/users/EditRoleAssignmentScopeUseCase'
import { InviteUserUseCase } from '@domain/usecases/users/InviteUserUseCase'
import { ReissueInvitationLinkUseCase } from '@domain/usecases/users/ReissueInvitationLinkUseCase'
import { RemoveRoleAssignmentUseCase } from '@domain/usecases/users/RemoveRoleAssignmentUseCase'
import { UpdateUserFullNameUseCase } from '@domain/usecases/users/UpdateUserFullNameUseCase'

// specs/web-users.md §2.10 — a dedicated container for the /admin/users
// write path, same per-container instance pattern used throughout
// di/containers/ (its OWN SeasonRepositoryImpl/TeamRepositoryImpl/
// SectionRepositoryImpl/UserRepositoryImpl, not shared with the ones other
// containers instantiate for their own needs). `membershipRepository` is
// deliberately absent here: the "Adhésion" entry point reuses
// MembershipFormDialog as-is, which pulls its own dependencies through
// useMembershipsDependencies — this container never needs to know about
// public.memberships (§2.4, "cet écran ne crée aucune ressource... d'adhésion").
export interface UsersContainer {
  userRepository: UserRepository
  roleAssignmentRepository: RoleAssignmentRepository
  teamRepository: TeamRepository
  sectionRepository: SectionRepository
  seasonRepository: SeasonRepository

  inviteUserUseCase: InviteUserUseCase
  reissueInvitationLinkUseCase: ReissueInvitationLinkUseCase
  updateUserFullNameUseCase: UpdateUserFullNameUseCase
  assignRoleUseCase: AssignRoleUseCase
  editRoleAssignmentScopeUseCase: EditRoleAssignmentScopeUseCase
  removeRoleAssignmentUseCase: RemoveRoleAssignmentUseCase
  countUsersRequiringAttentionUseCase: CountUsersRequiringAttentionUseCase
}

export function createUsersContainer(supabaseClient: SupabaseClient): UsersContainer {
  const userRepository = new UserRepositoryImpl(supabaseClient)
  const roleAssignmentRepository = new RoleAssignmentRepositoryImpl(supabaseClient)
  const seasonRepository = new SeasonRepositoryImpl(supabaseClient)
  const teamRepository = new TeamRepositoryImpl(supabaseClient, seasonRepository)
  const sectionRepository = new SectionRepositoryImpl(supabaseClient)

  return {
    userRepository,
    roleAssignmentRepository,
    teamRepository,
    sectionRepository,
    seasonRepository,
    inviteUserUseCase: new InviteUserUseCase(userRepository),
    reissueInvitationLinkUseCase: new ReissueInvitationLinkUseCase(userRepository),
    updateUserFullNameUseCase: new UpdateUserFullNameUseCase(userRepository),
    assignRoleUseCase: new AssignRoleUseCase(userRepository, roleAssignmentRepository),
    editRoleAssignmentScopeUseCase: new EditRoleAssignmentScopeUseCase(userRepository, roleAssignmentRepository),
    removeRoleAssignmentUseCase: new RemoveRoleAssignmentUseCase(userRepository, roleAssignmentRepository),
    countUsersRequiringAttentionUseCase: new CountUsersRequiringAttentionUseCase(seasonRepository, userRepository),
  }
}
