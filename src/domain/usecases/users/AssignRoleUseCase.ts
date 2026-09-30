import type { AssignableRoleAssignment } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidRoleAssignmentInputError } from '../../errors/invalid-role-assignment-input-error'
import { can } from '../../policies/can'
import { auditMetadataFor, scopeContextFor, validateRoleAssignmentScope } from '../../policies/role-assignment-scope'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { RoleAssignmentRepository } from '../../repositories/role-assignment-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface AssignRoleUseCaseInput {
  actorId: string
  userId: string
  assignment: AssignableRoleAssignment
}

// specs/web-users.md §2.6/§2.6c/§2.6e/AC-WU-05/AC-WU-06/AC-WU-35/AC-WU-36 —
// the generalized "+ Rôle" write, distinct from AssignCoachToTeamsUseCase
// (which AssignCoachDialog/`/admin/teams` keep using unchanged, AC-WU-31).
// Same authorization-before-validation ordering as every other write use
// case in this backoffice.
//
// §2.6a — "admin est exclu, toujours". AssignableRoleAssignment already
// makes this STRUCTURAL (no 'admin' member exists on that type) — the
// three-level table the spec itself lays out (sélecteur, use case, RLS
// `with check`) puts the type system here at the "use case" level: this
// class cannot even be CALLED with role: 'admin' without a caller first
// bypassing TypeScript (`as any`/`as AssignableRoleAssignment`), and the
// real, non-bypassable barrier is user_roles_insert_assign_role's own
// `with check` (§2.6b) — this use case is defence in depth, not the
// boundary.
//
// §4 "Journal d'audit" — CDC §11.3 names "changement de rôle" literally.
// Follow-up pass to specs/web-audit-logs.md (2026-09-30 addendum): the audit
// infrastructure PO-WU-07 was blocked on now exists
// (public.record_audit_log_entry, domain/repositories/audit-log-repository.ts's
// `record()`) and this use case emits 'role.granted' below, after the role
// assignment itself has already committed. InviteUserUseCase's own
// "blocked on PO-WU-07" is untouched — account creation isn't one of the
// three use cases this pass wires.
//
// Audit-write failure AFTER the role-assignment write has already succeeded
// — no shared transaction across the two calls exists (different privilege
// paths: client-RLS-gated INSERT on user_roles vs. a SECURITY DEFINER RPC on
// audit_log), so the role change cannot be rolled back if the audit call
// fails. Deliberate, documented choice for this first emitter pass: catch
// the audit-write error, do NOT let it reject this use case's own promise
// (the business outcome already succeeded, and the caller/UI should see
// success) — but do NOT silently swallow it either, surface it via
// `console.error` with enough context to investigate (no dedicated
// error-reporting service exists elsewhere in this codebase to route it to
// instead, verified before choosing this).
export class AssignRoleUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleAssignmentRepository: RoleAssignmentRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: AssignRoleUseCaseInput): Promise<void> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    if (!can(actor, 'role:assign', scopeContextFor(input.assignment))) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to assign a role`)
    }

    // AC-WU-35 — rejected from the domain, before any network call: a
    // missing target account, or a role submitted without its required
    // scope. user_roles_scope_check is the real, non-bypassable guarantee
    // (§2.6c) — this is the earlier, friendlier rejection.
    if (!input.userId) {
      throw new InvalidRoleAssignmentInputError('userId is required')
    }
    validateRoleAssignmentScope(input.assignment)

    await this.roleAssignmentRepository.assignRole(input.userId, input.assignment)

    // See this class's own top comment for why a rejection here does not
    // reject execute()'s own promise.
    try {
      await this.auditLogRepository.record({
        action: 'role.granted',
        targetId: input.userId,
        // specs/web-audit-logs.md — 2026-09-30 (third addendum) — the
        // target is always the affected account.
        targetType: 'user',
        metadata: auditMetadataFor(input.assignment),
      })
    } catch (auditError) {
      console.error('AssignRoleUseCase: failed to record role.granted audit entry', {
        actorId: input.actorId,
        targetId: input.userId,
        auditError,
      })
    }
  }
}
