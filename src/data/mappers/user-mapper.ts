import type { PlayerPosition, RoleAssignment, User } from '@domain/entities/user'
import type { MissingElementFacts } from '@domain/policies/user-completeness'
import type { AdminUserDirectoryEntry, UserSummary } from '@domain/repositories/user-repository'
import type { AdminUserRow, MembershipCompletenessFactRow, UserCharterFactRow, UserRoleRow, UserRow, UserSummaryRow } from '../dto/user-dto'

// user_roles has one row per team for a coach, but User.roles collapses
// those into a single { role: 'coach', teamIds: [...] } entry — see the
// RoleAssignment comment in domain/entities/user.ts.
export function toUser(row: UserRow, roleRows: UserRoleRow[]): User {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    // Cast, not validated here — same trust boundary as `role` in
    // toRoleAssignments below: the CHECK constraint on public.users.position
    // is what actually guarantees the value is one of PlayerPosition's four.
    position: row.position as PlayerPosition | null,
    charterAcceptedAt: row.charter_accepted_at ? new Date(row.charter_accepted_at) : null,
    roles: toRoleAssignments(roleRows),
  }
}

// specs/section-and-teams.md §2.11/PO-ST-12b — backs UserRepositoryImpl.findAll(),
// the AssignCoachDialog's `UTILISATEUR` dropdown.
export function toUserSummary(row: UserSummaryRow): UserSummary {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
  }
}

// specs/web-users.md §2.2/§2.10 — /admin/users' own table row. `roleRows`
// is this ONE account's slice of AdminUserRoleRow[] (already grouped by
// user_id by the repository, per its own comment on why that grouping
// lives there); `facts` is computed by toMissingElementFacts below, shared
// verbatim with the badge count's own read (AC-WU-17).
export function toAdminUserDirectoryEntry(row: AdminUserRow, roleRows: UserRoleRow[], facts: MissingElementFacts): AdminUserDirectoryEntry {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    charterAcceptedAt: row.charter_accepted_at ? new Date(row.charter_accepted_at) : null,
    roles: toRoleAssignments(roleRows),
    missingElementFacts: facts,
  }
}

// specs/web-users.md §2.3/AC-WU-37 — assembles the four completeness facts
// from three raw, independently-queried pieces (never a fourth
// computation): the user's own charter_accepted_at (criterion 4), whether
// ANY user_roles row exists for them (criterion 1, passed in as a plain
// boolean the repository already reduced from a Set), and their
// current-season membership row if one exists (criteria 2/3). `currentSeasonId
// === null` forces criteria 2/3 to false — §2.3 "repli", never an error.
export function toMissingElementFacts(
  userRow: UserCharterFactRow,
  hasRole: boolean,
  membershipRow: MembershipCompletenessFactRow | undefined,
  currentSeasonId: string | null,
): MissingElementFacts {
  const hasMembershipForCurrentSeason = currentSeasonId !== null && membershipRow !== undefined
  return {
    hasRole,
    hasMembershipForCurrentSeason,
    hasLicenceNumberForCurrentSeason: hasMembershipForCurrentSeason && !!membershipRow?.licence_number,
    charterAccepted: userRow.charter_accepted_at !== null,
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
