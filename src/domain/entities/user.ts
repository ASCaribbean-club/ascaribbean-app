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