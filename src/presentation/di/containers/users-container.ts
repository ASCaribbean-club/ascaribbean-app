import type { SupabaseClient } from '@supabase/supabase-js'
import { AuditLogRepositoryImpl } from '@data/repositories/AuditLogRepositoryImpl'
import { RoleAssignmentRepositoryImpl } from '@data/repositories/RoleAssignmentRepositoryImpl'
import { SeasonRepositoryImpl } from '@data/repositories/SeasonRepositoryImpl'
import { SectionRepositoryImpl } from '@data/repositories/SectionRepositoryImpl'
import { TeamRepositoryImpl } from '@data/repositories/TeamRepositoryImpl'
import { UserRepositoryImpl } from '@data/repositories/UserRepositoryImpl'
import type { AuditLogRepository } from '@domain/repositories/audit-log-repository'
import type { RoleAssignmentRepository } from '@domain/repositories/role-assignment-repository'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { SectionRepository } from '@domain/repositories/section-repository'
import type { TeamRepository } from '@domain/repositories/team-repository'
import type { UserRepository } from '@domain/repositories/user-repository'
import { AssignRoleUseCase } from '@domain/usecases/users/AssignRoleUseCase'
import { CountUsersRequiringAttentionUseCase } from '@domain/usecases/users/CountUsersRequiringAttentionUseCase'
import { EditRoleAssignmentScopeUseCase } from '@domain/usecases/users/EditRoleAssignmentScopeUseCase'
import { GeneratePasswordResetLinkUseCase } from '@domain/usecases/users/GeneratePasswordResetLinkUseCase'
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
  // Follow-up pass to specs/web-audit-logs.md (2026-09-30 addendum) — this
  // container's OWN instance, not shared with audit-log-container.ts's
  // (read-only /admin/audit screen) or section-and-teams-container.ts's own.
  // specs/web-audit-logs.md — 2026-09-30 (fourth addendum) — the SAME
  // instance below is now also wired into inviteUserUseCase/
  // generatePasswordResetLinkUseCase, not a second one.
  // specs/web-audit-logs.md — 2026-09-30 (fifth addendum) — and now also
  // into updateUserFullNameUseCase, still the same instance.
  auditLogRepository: AuditLogRepository

  inviteUserUseCase: InviteUserUseCase
  reissueInvitationLinkUseCase: ReissueInvitationLinkUseCase
  generatePasswordResetLinkUseCase: GeneratePasswordResetLinkUseCase
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
  const auditLogRepository = new AuditLogRepositoryImpl(supabaseClient)

  return {
    userRepository,
    roleAssignmentRepository,
    teamRepository,
    sectionRepository,
    seasonRepository,
    auditLogRepository,
    inviteUserUseCase: new InviteUserUseCase(userRepository, auditLogRepository),
    reissueInvitationLinkUseCase: new ReissueInvitationLinkUseCase(userRepository),
    generatePasswordResetLinkUseCase: new GeneratePasswordResetLinkUseCase(userRepository, auditLogRepository),
    updateUserFullNameUseCase: new UpdateUserFullNameUseCase(userRepository, auditLogRepository),
    assignRoleUseCase: new AssignRoleUseCase(userRepository, roleAssignmentRepository, auditLogRepository),
    editRoleAssignmentScopeUseCase: new EditRoleAssignmentScopeUseCase(userRepository, roleAssignmentRepository),
    removeRoleAssignmentUseCase: new RemoveRoleAssignmentUseCase(userRepository, roleAssignmentRepository, auditLogRepository),
    countUsersRequiringAttentionUseCase: new CountUsersRequiringAttentionUseCase(seasonRepository, userRepository),
  }
}
