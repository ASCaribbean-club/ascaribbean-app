import type { Convocation } from '../entities/convocation'
import type { User } from '../entities/user'

// "What's true" (is the active role relevant to this convocation), never
// "who's allowed" — authorization stays in domain/policies/, same split as
// convocation-rules.ts / membership-rules.ts.
//
// Mirrors presentation/app/providers/active-role-provider.tsx's
// `DashboardRole` structurally (not imported from there — domain/ never
// imports presentation/, CLAUDE.md §3). Both are `'coach' | 'player'`
// string unions, so a `DashboardRole` value from useActiveRole() is
// assignable here with no cast at the call site.
export type ActiveDashboardRole = 'coach' | 'player'

/**
 * Does the user's currently active dashboard role tab even apply to this
 * convocation?
 *
 * This is deliberately NOT an authorization check — it doesn't decide
 * whether the user is allowed to respond or validate attendance (that's
 * still `can()`, unchanged). It answers a narrower UX question: "is the
 * active role relevant to this specific convocation's team, so the
 * corresponding variant should render instead of an empty state?"
 *
 * Only 'player' and 'coach' are handled today — this screen has no
 * player/coach dashboard tabs that need something else. Add a branch only
 * when a concrete screen need appears for another role; don't pre-fill the
 * switch.
 */
export function hasActiveRoleForConvocation(user: User, activeRole: ActiveDashboardRole, convocation: Convocation): boolean {
  const assignment = user.roles.find((r) => r.role === activeRole)
  if (!assignment) return false

  switch (assignment.role) {
    case 'player':
      return assignment.teamId === convocation.teamId
    case 'coach':
      return assignment.teamIds.includes(convocation.teamId)
    default:
      return false
  }
}
