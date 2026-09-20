// Scope rules (team_id / section_id) — ENFORCED by the user_roles_scope_check
// CHECK constraint in Postgres, see supabase/migrations/20260811171754_initial_schema.sql.
// This comment is documentation only; it does not validate anything. The
// discriminated union below already makes the scope shape structural per role
// (which field exists, and whether it's singular or plural), so there's no
// separate teamId/sectionId pair to keep consistent by hand.
// Any change to this matrix must be mirrored in both places.
//
// - player               → teamId required (one team)
// - coach                → teamIds required (one row per team in user_roles,
//                          aggregated into this array by the mapper)
// - section-manager      → sectionId required
// - authorized-officer, treasurer, medical-referent,
//   volunteer, admin     → no scope field (club-wide)
export type RoleAssignment =
  // assumption: one team per player, revisit if CDC requirement changes
  | { role: 'player'; teamId: string }
  | { role: 'coach'; teamIds: string[] }
  | { role: 'section-manager'; sectionId: string }
  | { role: 'authorized-officer' }
  | { role: 'treasurer' }
  | { role: 'medical-referent' } // TODO: confirm with CDC section 6.3 whether this
  // should eventually be section-scoped, not club-wide
  | { role: 'volunteer' }        // scope lives in mission/event assignment, not here
  | { role: 'admin' }

export type Role = RoleAssignment['role']

export function distinctRoles(assignments: RoleAssignment[]) {
  return Array.from(new Set(assignments.map((assignment) => assignment.role)))
}

export function isPlayer(assignment: RoleAssignment): assignment is Extract<RoleAssignment, { role: 'player' }> {
  return assignment.role === 'player'
}

export function isCoach(assignment: RoleAssignment): assignment is Extract<RoleAssignment, { role: 'coach' }> {
  return assignment.role === 'coach'
}

export function isSectionManager(assignment: RoleAssignment): assignment is Extract<RoleAssignment, { role: 'section-manager' }> {
  return assignment.role === 'section-manager'
}

// specs/web-users.md §2.6/AC-WU-06 — the "Assigner un rôle" dialog offers
// exactly the seven non-admin roles, never 'admin'. This type makes that
// exclusion STRUCTURAL at every call site that needs it (AssignRoleUseCase's
// own input, RoleAssignmentRepository.assignRole, the dialog's ViewModel) —
// the same "the type documents the guarantee instead of merely a runtime
// check" reasoning already used for CoachAssignmentInsertRow
// (data/dto/role-assignment-dto.ts). Excludes the 'admin' member of
// RoleAssignment only; every other branch (and its scope shape) is
// untouched.
export type AssignableRoleAssignment = Exclude<RoleAssignment, { role: 'admin' }>

export function isAssignableRole(role: Role): role is AssignableRoleAssignment['role'] {
  return role !== 'admin'
}

// specs/match_details_page.md correction #10 originally removed the
// Effectif roster's position sub-label ("Gardienne", "Milieu"...) for lack
// of domain support — this is that support, added back deliberately rather
// than left as a mockup-only decoration. Top-level and nullable rather than
// nested under the 'player' RoleAssignment branch: a position is a fact
// about the person's game role, not part of the team-scope shape
// RoleAssignment already models, and staying flat avoids forcing every
// non-player branch to carry a dead `position` field.
export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward'

export interface User {
  id: string
  fullName: string
  email: string
  roles: RoleAssignment[]
  // null for every non-player role, and for a player who hasn't set one yet.
  position: PlayerPosition | null
  // CDC §3.1: "activation après acceptation de la charte" — null until the
  // member accepts, set once via the accept_charter() RPC, never cleared.
  charterAcceptedAt: Date | null
}