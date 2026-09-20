import type { AssignableRoleAssignment } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidRoleAssignmentInputError } from '../../errors/invalid-role-assignment-input-error'
import { can } from '../../policies/can'
import { scopeContextFor } from '../../policies/role-assignment-scope'
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
// a removed row leaves nothing behind at all. Same "no infrastructure
// exists yet" position as every other write use case in this backoffice —
// no audit call is added below: blocked on PO-WU-07, see
// specs/web-users-role-edit-remove.md §4.
export class RemoveRoleAssignmentUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleAssignmentRepository: RoleAssignmentRepository,
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

    // blocked on PO-WU-07 — see this class's own top comment: no audit
    // infrastructure exists to write the required "changement de rôle"
    // trace to yet.
  }
}
