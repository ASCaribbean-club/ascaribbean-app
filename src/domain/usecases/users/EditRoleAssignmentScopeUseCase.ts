import type { AssignableRoleAssignment } from '../../entities/user'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidRoleAssignmentInputError } from '../../errors/invalid-role-assignment-input-error'
import { can } from '../../policies/can'
import { scopeContextFor, validateRoleAssignmentScope } from '../../policies/role-assignment-scope'
import type { RoleAssignmentRepository } from '../../repositories/role-assignment-repository'
import type { UserRepository } from '../../repositories/user-repository'

export interface EditRoleAssignmentScopeUseCaseInput {
  actorId: string
  userId: string
  // §2.1 of the amendment — the natural-key identifier for the affectation
  // being edited: (userId, role, CURRENT scope). No `id` field exists on
  // RoleAssignment (deliberate, §2.1) — the row this targets is whichever
  // one this scope, today, actually describes.
  currentAssignment: AssignableRoleAssignment
  // The DESIRED scope, same role as currentAssignment — §1/§2.2: "le rôle
  // lui-même n'est jamais modifié par cette opération", enforced below
  // before any repository call.
  nextAssignment: AssignableRoleAssignment
}

// specs/web-users-role-edit-remove.md §2.2/§2.7/AC-WU-48/AC-WU-51 —
// "modifier la portée d'une affectation" (player/section-manager: move a
// single row; coach: reconcile a whole set — insert newly-checked teams,
// delete unchecked ones). Same shape as AssignRoleUseCase, same order:
// resolve the actor → can() (with the assignment's CURRENT scope as
// context, §2.5c) → domain validation → repository call.
//
// §1 — "le rôle lui-même n'est jamais modifié par cette opération": enforced
// here as a domain-level guard (defence in depth — the real, non-bypassable
// guarantee is user_roles_update_assign_role's own `grant update (team_id,
// section_id)`, §2.6 of the amendment, which makes `role`/`user_id`
// structurally unwritable at the Postgres privilege level, before RLS is
// even evaluated).
//
// §2.5d — the coach reconciliation case touches BOTH actions: 'role:assign'
// is required in every case, 'role:remove' is required IN ADDITION if and
// only if the submission deletes at least one row. Written here, not in
// data/ (which doesn't know — and shouldn't need to know — about the
// row-level INSERT/DELETE breakdown, §2.7).
//
// §4 "Journal d'audit" — CDC §11.3 names "changement de rôle" literally,
// and this is the SECOND of the two operations §4 of the amendment flags as
// newly-pressing (the first being AssignRoleUseCase's own creation path).
// Same "no infrastructure exists yet" position — no audit call is added
// below: blocked on PO-WU-07, see specs/web-users-role-edit-remove.md §4.
export class EditRoleAssignmentScopeUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleAssignmentRepository: RoleAssignmentRepository,
  ) {}

  async execute(input: EditRoleAssignmentScopeUseCaseInput): Promise<void> {
    const actor = await this.userRepository.findById(input.actorId)
    if (!actor) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }

    // §2.5c — the CURRENT scope is the context 'role:assign' is checked
    // against, not the desired one (scopeContextFor's own comment on why).
    if (!can(actor, 'role:assign', scopeContextFor(input.currentAssignment))) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to edit a role assignment's scope`)
    }

    // §1 — defence in depth: the type system already lets a caller pass
    // mismatched roles (both branches are just AssignableRoleAssignment),
    // so this guard is what actually stops it at this layer.
    if (input.currentAssignment.role !== input.nextAssignment.role) {
      throw new InvalidRoleAssignmentInputError('a role assignment scope edit cannot change the role itself')
    }

    // §2.5d — a coach reconciliation that unchecks at least one team also
    // requires 'role:remove', checked in ADDITION to 'role:assign' above.
    if (removesAtLeastOneRow(input.currentAssignment, input.nextAssignment)) {
      if (!can(actor, 'role:remove', scopeContextFor(input.currentAssignment))) {
        throw new ForbiddenError(`User ${input.actorId} is not authorized to remove a team from this coach assignment`)
      }
    }

    if (!input.userId) {
      throw new InvalidRoleAssignmentInputError('userId is required')
    }
    // AC-WU-51 — rejected from the domain, before any network call, if the
    // DESIRED scope is itself missing/empty. The no-op case (desired scope
    // identical to the current one) is intercepted earlier, in
    // presentation/ (the ViewModel), before this use case is even called —
    // AC-WU-51's own "aucune écriture n'est envoyée" ("no network call").
    validateRoleAssignmentScope(input.nextAssignment)

    await this.roleAssignmentRepository.editRoleAssignmentScope(input.userId, input.currentAssignment, input.nextAssignment)

    // blocked on PO-WU-07 — see this class's own top comment: no audit
    // infrastructure exists to write the required "changement de rôle"
    // trace to yet.
  }
}

// §2.5d — true only for a 'coach' reconciliation that unchecks at least one
// currently-assigned team. 'player'/'section-manager' scope edits are
// always a plain UPDATE of one row (§2.2) — never a row deleted — so this
// is always false for them, regardless of the before/after values.
function removesAtLeastOneRow(current: AssignableRoleAssignment, next: AssignableRoleAssignment): boolean {
  if (current.role !== 'coach' || next.role !== 'coach') return false
  return current.teamIds.some((teamId) => !next.teamIds.includes(teamId))
}
