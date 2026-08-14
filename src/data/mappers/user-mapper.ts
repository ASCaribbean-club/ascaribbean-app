import type { RoleAssignment, User } from '@domain/entities/user'
import type { UserRoleRow, UserRow } from '../dto/user-dto'

// user_roles has one row per team for a coach, but User.roles collapses
// those into a single { role: 'coach', teamIds: [...] } entry — see the
// RoleAssignment comment in domain/entities/user.ts.
export function toUser(row: UserRow, roleRows: UserRoleRow[]): User {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    charterAcceptedAt: row.charter_accepted_at ? new Date(row.charter_accepted_at) : null,
    roles: toRoleAssignments(roleRows),
  }
}

function toRoleAssignments(rows: UserRoleRow[]): RoleAssignment[] {
  const assignments: RoleAssignment[] = []
  const coachTeamIds: string[] = []

  for (const row of rows) {
    switch (row.role) {
      case 'player':
        assignments.push({ role: 'player', teamId: row.team_id! })
        break
      case 'coach':
        coachTeamIds.push(row.team_id!)
        break
      case 'section-manager':
        assignments.push({ role: 'section-manager', sectionId: row.section_id! })
        break
      default:
        assignments.push({ role: row.role })
    }
  }

  if (coachTeamIds.length > 0) {
    assignments.push({ role: 'coach', teamIds: coachTeamIds })
  }

  return assignments
}
