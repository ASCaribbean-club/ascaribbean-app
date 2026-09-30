import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidCoachAssignmentInputError } from '../../errors/invalid-coach-assignment-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { RoleAssignmentRepository } from '../../repositories/role-assignment-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface AssignCoachToTeamsUseCaseInput {
  actorId: string
  userId: string
  teamIds: string[]
}

// specs/section-and-teams.md §2.9/§2.10/§3/AC-ST-40 — writes public.user_roles,
// never public.teams/public.sections (§2.9). Always inserts role='coach' and
// section_id=null, regardless of what presentation/ sends — there is no
// `role`/`sectionId` field anywhere on AssignCoachToTeamsUseCaseInput for
// exactly that reason, not merely a runtime check that could be bypassed by
// a different caller.
//
// §2.10/AC-ST-36 — idempotent: re-submitting a team the userId is already
// coaching is absorbed by RoleAssignmentRepository.assignCoachToTeams, never
// surfaced here as an error.
//
// §4 "Journal d'audit — ce n'est plus une question ouverte, c'est une
// exigence" — CDC §11.3 requires a "changement de rôle" to be traced, and
// assigning a coach is exactly that. Per CLAUDE.md §6 this belongs here (a
// business action, logged from the use case, never from a component or a
// trigger). Follow-up pass to specs/web-audit-logs.md (2026-09-30 addendum):
// the audit infrastructure PO-ST-14 deferred to now exists
// (public.record_audit_log_entry, domain/repositories/audit-log-repository.ts's
// `record()`) and this use case emits 'role.granted' below, after the coach
// assignment itself has already committed. AC-ST-37 no longer blocks
// production on a missing emitter for this use case.
//
// Audit-write failure AFTER the coach-assignment write has already
// succeeded — same tradeoff, and same reasoning, as AssignRoleUseCase's own
// top comment: no shared transaction across the two calls
// (client-RLS-gated INSERT on user_roles vs. a SECURITY DEFINER RPC on
// audit_log), so the assignment cannot be rolled back if the audit call
// fails. Caught and surfaced via `console.error`, never rejecting this use
// case's own promise — the business outcome already succeeded, the
// caller/UI should see success.
export class AssignCoachToTeamsUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleAssignmentRepository: RoleAssignmentRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: AssignCoachToTeamsUseCaseInput): Promise<void> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(actor, 'role:assign-coach')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to assign a coach`)
    }

    // AC-ST-40 — rejected from the domain, before any network call: a
    // missing account, or submitting with no team checked at all.
    if (!input.userId) {
      throw new InvalidCoachAssignmentInputError('userId is required')
    }
    if (input.teamIds.length === 0) {
      throw new InvalidCoachAssignmentInputError('at least one team must be selected')
    }

    await this.roleAssignmentRepository.assignCoachToTeams(input.userId, input.teamIds)

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'role.granted',
        targetId: input.userId,
        // specs/web-audit-logs.md — 2026-09-30 (third addendum) — the
        // target is always the affected account.
        targetType: 'user',
        metadata: { role: 'coach', teamIds: input.teamIds },
      })
    } catch (auditError) {
      console.error('AssignCoachToTeamsUseCase: failed to record role.granted audit entry', {
        actorId: input.actorId,
        targetId: input.userId,
        auditError,
      })
    }
  }
}
