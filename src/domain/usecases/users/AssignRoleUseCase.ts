import type { AssignableRoleAssignment } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidRoleAssignmentInputError } from '../../errors/invalid-role-assignment-input-error'
import { can } from '../../policies/can'
import { scopeContextFor, validateRoleAssignmentScope } from '../../policies/role-assignment-scope'
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
// Same "no infrastructure exists yet" position as InviteUserUseCase — no
// audit call is added below: blocked on PO-WU-07, see
// specs/web-users.md §4.
export class AssignRoleUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleAssignmentRepository: RoleAssignmentRepository,
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

    // blocked on PO-WU-07 — see this class's own top comment: no audit
    // infrastructure exists to write the required "changement de rôle"
    // trace to yet.
  }
}
