import type { AssignableRoleAssignment } from '../entities/user'
import { InvalidRoleAssignmentInputError } from '../errors/invalid-role-assignment-input-error'
import type { AuthorizationContext } from './can'

// specs/web-users.md §2.6c/AC-WU-35 — originally AssignRoleUseCase's own
// private `validateScope`. Extracted here by
// specs/web-users-role-edit-remove.md §2.2 rule 2/§2.7/AC-WU-48
// ("AssignRoleUseCase.validateScope est déjà écrite : à extraire en helper
// pur partagé, jamais à dupliquer") — ONE implementation, consumed by
// AssignRoleUseCase (create) and EditRoleAssignmentScopeUseCase (scope
// edit). RemoveRoleAssignmentUseCase does NOT call this: it operates on an
// assignment that, by construction, already exists and was already valid
// when it was written — there is nothing left to validate on the way out.
export function validateRoleAssignmentScope(assignment: AssignableRoleAssignment): void {
  switch (assignment.role) {
    case 'player':
      if (!assignment.teamId) {
        throw new InvalidRoleAssignmentInputError('a team is required for the player role')
      }
      return
    case 'coach':
      if (assignment.teamIds.length === 0) {
        throw new InvalidRoleAssignmentInputError('at least one team is required for the coach role')
      }
      return
    case 'section-manager':
      if (!assignment.sectionId) {
        throw new InvalidRoleAssignmentInputError('a section is required for the section-manager role')
      }
      return
    default:
      // authorized-officer / treasurer / medical-referent / volunteer —
      // §2.6c: no scope field exists on these branches at all, nothing to
      // validate.
      return
  }
}

// specs/web-users.md §2.6e/AC-WU-36 — originally AssignRoleUseCase's own
// private `scopeContextFor`. Extracted alongside validateRoleAssignmentScope
// above (same "one shared implementation" reasoning) and reused by
// specs/web-users-role-edit-remove.md §2.5c/AC-WU-47: for a scope EDIT or a
// REMOVAL, the caller passes the assignment's CURRENT scope (the one being
// acted on), not the desired one — "le contexte est résolu depuis
// l'affectation ciblée (sa portée actuelle)". For a CREATE (AssignRoleUseCase),
// the assignment IS the one scope there is.
//
// Honest limitation, carried over unchanged: 'coach' can target several
// teams at once, and AuthorizationContext has no way to carry more than one
// teamId — moot today (rbacMatrix['role:assign'/'role:remove'] is
// ['admin']-only, club-wide by construction), worth naming rather than
// silently picking one team.
export function scopeContextFor(assignment: AssignableRoleAssignment): AuthorizationContext {
  switch (assignment.role) {
    case 'player':
      return { teamId: assignment.teamId }
    case 'section-manager':
      return { sectionId: assignment.sectionId }
    default:
      return {}
  }
}
