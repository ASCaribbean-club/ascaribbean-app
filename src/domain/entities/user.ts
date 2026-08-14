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

export interface User {
  id: string
  fullName: string
  email: string
  roles: RoleAssignment[]
  // CDC §3.1: "activation après acceptation de la charte" — null until the
  // member accepts, set once via the accept_charter() RPC, never cleared.
  charterAcceptedAt: Date | null
}