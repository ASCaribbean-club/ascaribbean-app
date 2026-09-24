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
    case 'player': {
      // specs/player-vote.md §2/§7 — third occurrence of the same gap already
      // fixed for 'section-manager' and 'coach' above: applying the same
      // shape rather than reinventing one.
      // specs/match-stats.md §2 — 'match_goals:view' added to this same
      // list, fourth occurrence of the identical gap already fixed for
      // 'convocation:respond'/'vote:cast'/'attendance:validate': without
      // this, a player on team A could pass can() for team B's goals just
      // because 'player' is in match_goals:view's allowed-roles list.
      const requiresTeamScope = action === 'convocation:respond' || action === 'vote:cast' || action === 'match_goals:view'
      return !requiresTeamScope || assignment.teamId === context.teamId
    }
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
      // specs/match-stats.md §2 — same fix, same reasoning, for all three
      // new match-statistics actions: each is team-scoped to the coach's
      // own assigned teams, never club-wide.
      const requiresTeamScope =
        action === 'convocation:create' ||
        action === 'attendance:validate' ||
        action === 'match_result:record' ||
        action === 'match_goals:view' ||
        action === 'match_staff_events:view'
      return !requiresTeamScope || (context.teamId !== undefined && assignment.teamIds.includes(context.teamId))
    }
    case 'section-manager':
      // specs/web-users.md §2.6e/AC-WU-36 — 'role:assign' added to this
      // list in the SAME change as its rbac-matrix.ts entry, even though
      // that entry is ['admin']-only today (an admin's own RoleAssignment
      // carries no scope field, so it never reaches this branch at all —
      // it's caught by the `default` case below). Written now so a future
      // PO-WE-01 widening to 'section-manager' can't silently assign a
      // role outside that manager's own section with no can.ts guard in
      // place — the same gap already closed for 'convocation:create'.
      //
      // specs/web-users-role-edit-remove.md §2.5c/AC-WU-47 — 'role:remove'
      // added in the SAME change as ITS OWN rbac-matrix.ts entry, jumeau
      // exact of the 'role:assign' addition above, same "written now so a
      // future widening doesn't silently ship without it" reasoning.
      if (action === 'section:manage' || action === 'convocation:create' || action === 'role:assign' || action === 'role:remove') {
        // The use case resolves the target's sectionId (via TeamRepository
        // for a team-scoped target, or directly for a section-scoped one)
        // *before* calling can() — this policy only compares values it's given.
        return assignment.sectionId === context.sectionId
      }
      return true
    default:
      return true
  }
}
