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
}