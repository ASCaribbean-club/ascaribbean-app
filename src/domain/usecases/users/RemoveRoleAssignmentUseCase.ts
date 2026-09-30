import type { AssignableRoleAssignment } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidRoleAssignmentInputError } from '../../errors/invalid-role-assignment-input-error'
import { can } from '../../policies/can'
import { auditMetadataFor, scopeContextFor } from '../../policies/role-assignment-scope'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { RoleAssignmentRepository } from '../../repositories/role-assignment-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface RemoveRoleAssignmentUseCaseInput {
  actorId: string
  userId: string
  // §2.1/§2.3 of the amendment — the natural-key identifier: (userId, role,
  // CURRENT scope). Removal deletes every row THIS assignment describes
  // and no others — for 'coach', every team_id row it aggregates.
  assignment: AssignableRoleAssignment
}

// specs/web-users-role-edit-remove.md §2.3/§2.7/AC-WU-48/AC-WU-52 —
// "retirer une affectation". Same shape as AssignRoleUseCase/
// EditRoleAssignmentScopeUseCase: resolve the actor → can() (with the
// assignment's own scope as context, §2.5c) → repository call. No
// validateRoleAssignmentScope() call here, deliberately: unlike a create or
// a scope edit, this use case doesn't write a NEW scope, it deletes rows an
// existing, already-valid assignment describes — there is nothing left to
// validate on the way out.
//
// §2.3 — "retirer la dernière affectation d'un compte est autorisé": no
// extra guard is added here for that case. A zero-role account is a
// modeled, expected state (AC-WU-18's own "Aucun rôle" rendering, AC-WU-37's
// own criterion 1) — the confirmation step informs the administrator of it
// (presentation/'s own concern), it never blocks it here.
//
// §4 "Journal d'audit" — CDC §11.3 names "changement de rôle" literally,
// and §4 of the amendment names this THE most exposed of the two new
// operations: public.user_roles carries no archived_at/timestamp/author, so
// a removed row leaves nothing behind at all. Follow-up pass to
// specs/web-audit-logs.md (2026-09-30 addendum): the audit infrastructure
// PO-WU-07 was blocked on now exists (public.record_audit_log_entry,
// domain/repositories/audit-log-repository.ts's `record()`), and this use
// case emits 'role.revoked' below — the removed row's role/scope is exactly
// the archival detail this table exists to keep once the row itself is gone.
//
// Audit-write failure AFTER the role-removal write has already succeeded —
// same tradeoff, and same reasoning, as AssignRoleUseCase's own top comment:
// no shared transaction across the two calls (client-RLS-gated DELETE on
// user_roles vs. a SECURITY DEFINER RPC on audit_log), so the removal cannot
// be rolled back if the audit call fails. Caught and surfaced via
// `console.error`, never rejecting this use case's own promise — the
// business outcome (the role is gone) already succeeded, the caller/UI
// should see success.
export class RemoveRoleAssignmentUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleAssignmentRepository: RoleAssignmentRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: RemoveRoleAssignmentUseCaseInput): Promise<void> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(actor, 'role:remove', scopeContextFor(input.assignment))) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to remove a role assignment`)
    }

    if (!input.userId) {
      throw new InvalidRoleAssignmentInputError('userId is required')
    }

    await this.roleAssignmentRepository.removeRoleAssignment(input.userId, input.assignment)

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'role.revoked',
        targetId: input.userId,
        // specs/web-audit-logs.md — 2026-09-30 (third addendum) — the
        // target is always the affected account.
        targetType: 'user',
        metadata: auditMetadataFor(input.assignment),
      })
    } catch (auditError) {
      console.error('RemoveRoleAssignmentUseCase: failed to record role.revoked audit entry', {
        actorId: input.actorId,
        targetId: input.userId,
        auditError,
      })
    }
  }
}
