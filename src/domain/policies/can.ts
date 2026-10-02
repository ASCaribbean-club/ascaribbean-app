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
      //
      // specs/player-stats.md §2, AC-PS-20 — 'attendance:read-own-summary'
      // and 'response:read-own-summary' are DELIBERATELY NOT added here,
      // even though every action added to rbacMatrix for 'player' so far
      // has ended up in this list (the repo has fixed that exact omission
      // five times). Those two actions aren't team-scoped, they're
      // PERSON-scoped: the RPCs behind them (get_my_attendance_summary/
      // get_my_response_summary) filter on auth.uid() internally and take
      // no team parameter at all, so there is no context.teamId to compare
      // — adding them to requiresTeamScope would make can() fail for every
      // caller, since a person-scoped read is never called with a teamId in
      // context. They fall through to this switch's own `return true`
      // below, on purpose. Do not "fix" this by adding them here.
      //
      // specs/player-stats.md addendum "PO-PS-03 tranché" — same reasoning,
      // third person-scoped action: 'match_cards:view-own' is bounded by
      // get_my_cards_count()'s own auth.uid() filter, not by a team. Also
      // deliberately NOT here.
      const requiresTeamScope = action === 'convocation:respond' ||
        action === 'vote:cast' ||
        action === 'match_goals:view' ||
        // specs/player-unavailability.md §2 — team-scoped (unlike the person-scoped
        // player-stats actions): without it a player of team A passes for team B.
        action === 'availability:read-team' ||
        action === 'mission:self-assign'
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
      // specs/edit-match-details.md §2 — fourth/fifth occurrence of this
      // exact gap (after 'convocation:create', 'attendance:validate',
      // 'vote:cast'): 'match_details:update' added HERE, not just to
      // rbacMatrix, so a coach can't see the edit control on another team's
      // match — RLS would still refuse the write, but the button would
      // wrongly render (moindre privilège, "jamais grisé" — the control
      // must be ABSENT, not merely blocked at write time).
      // specs/edit-match-details.md, developer decision (2026-09-25) —
      // 'convocation:update' added in the SAME change as its
      // rbac-matrix.ts entry, jumeau exact of 'match_details:update' just
      // above (same team, same window, same reasoning).
      // specs/coach-team-stats.md §2 ("le piège déjà corrigé cinq fois") —
      // 'team_stats:view' added here in the SAME change as its
      // rbac-matrix.ts entry: without this, a coach of team A would pass
      // can(user, 'team_stats:view', { teamId: 'team-B' }) just because
      // 'coach' is in that action's allowed-roles list (AC-CTS-03/AC-02).
      const requiresTeamScope =
        action === 'convocation:create' ||
        action === 'attendance:validate' ||
        action === 'match_result:record' ||
        action === 'match_goals:view' ||
        action === 'match_staff_events:view' ||
        action === 'match_details:update' ||
        action === 'convocation:update' ||
        action === 'team_stats:view' ||
        // specs/coach-match-composition.md §2 — team-scoped, same gap class as above.
        action === 'match_lineup:write' ||
        // specs/web-create-convocation.md §2 — inert today (admin only in the
        // matrix), listed now so a future widening carries a scope check.
        action === 'meeting_details:update' ||
        // specs/player-unavailability.md §2 — both team-scoped.
        action === 'availability:declare' ||
        action === 'availability:read-team' ||
        action === 'mission:manage'
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
      //
      // specs/edit-match-details.md §2 — 'match_details:update' added in the
      // SAME change as its rbac-matrix.ts entry, even though that entry is
      // ['coach']-only today: the CDC matrix explicitly names
      // section-manager (their own section) on the "Créer/modifier une
      // convocation" row, so PO-EM-01 has a real, matrix-backed chance of
      // widening this — stronger grounds than the purely hypothetical
      // widenings 'role:assign'/'role:remove' were pre-wired for above.
      // Currently inert (rbacMatrix['match_details:update'] is
      // ['coach']-only, so a section-manager's assignment never reaches
      // this branch at all — caught earlier by `grants()`'s
      // `allowedRoles.includes` check), same "written now so a future
      // widening doesn't silently ship without it" reasoning.
      // specs/edit-match-details.md, developer decision (2026-09-25) —
      // 'convocation:update' added in the SAME change as its own
      // rbac-matrix.ts entry, jumeau exact of the 'match_details:update'
      // addition above (also inert today, same reasoning).
      if (
        action === 'section:manage' ||
        action === 'convocation:create' ||
        action === 'role:assign' ||
        action === 'role:remove' ||
        action === 'match_details:update' ||
        action === 'convocation:update' ||
        // specs/coach-match-composition.md §2 — pre-wired, inert today
        // (rbacMatrix['match_lineup:write'] is ['coach']-only, PO-MC-10).
        action === 'match_lineup:write' ||
        // specs/web-create-convocation.md §2 — pre-wired, inert today.
        action === 'meeting_details:update' ||
        // specs/match-details-missions.md §3 — LIVE (unlike the pre-wired
        // entries above): a section-manager manages missions of their own
        // section's teams, same scope as 'convocation:create'.
        action === 'mission:manage'
      ) {
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
