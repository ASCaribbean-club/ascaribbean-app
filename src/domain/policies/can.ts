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
    case 'coach': {
      // specs/coach-attendance-confirmation.md §2/§7 — 'attendance:validate'
      // is added to this branch's team-scope check rather than appended to
      // the old `action !== 'convocation:create' || ...` condition: that
      // shape only ever named ONE action, so any new action added to
      // rbacMatrix for 'coach' would fall through this switch with NO team
      // check at all (a coach could validate attendance, or anything else
      // added later, for a team they don't coach — the RLS would still
      // refuse it, but the UI button would render). Same class of gap
      // already fixed for 'section-manager' below, applied here instead of
      // reinvented — see specs/create-convocation.md §3 for that precedent.
      const requiresTeamScope = action === 'convocation:create' || action === 'attendance:validate'
      return !requiresTeamScope || (context.teamId !== undefined && assignment.teamIds.includes(context.teamId))
    }
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
