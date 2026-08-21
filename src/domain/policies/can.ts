import type { Role, RoleAssignment, User } from '../entities/user'
import type { Action } from './actions'
import { rbacMatrix } from './rbac-matrix'

export interface AuthorizationContext {
  teamId?: string
  sectionId?: string
}

export function can(user: User, action: Action, context: AuthorizationContext = {}): boolean {
  const allowedRoles = rbacMatrix[action]
  return user.roles.some((assignment) => grants(assignment, allowedRoles, action, context))
}

function grants(
  assignment: RoleAssignment,
  allowedRoles: Role[],
  action: Action,
  context: AuthorizationContext,
): boolean {
  if (!allowedRoles.includes(assignment.role)) return false

  switch (assignment.role) {
    case 'player':
      return action !== 'convocation:respond' || assignment.teamId === context.teamId
    case 'coach':
      return (
        action !== 'convocation:create' ||
        (context.teamId !== undefined && assignment.teamIds.includes(context.teamId))
      )
    case 'section-manager':
      if (action === 'section:manage' || action === 'convocation:create') {
        // The use case resolves the target team's sectionId via TeamRepository
        // *before* calling can() — this policy only compares values it's given.
        return assignment.sectionId === context.sectionId
      }
      return true
    default:
      return true
  }
}
