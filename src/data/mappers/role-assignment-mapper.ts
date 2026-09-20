import type { AssignableRoleAssignment } from '@domain/entities/user'
import type { CoachAssignmentInsertRow, RoleAssignmentInsertRow } from '@data/dto/role-assignment-dto'

// specs/section-and-teams.md §2.9/AC-ST-40 — role and section_id are
// hard-coded here, never taken from a caller-supplied value: this is the
// data-layer half of the same guarantee AssignCoachToTeamsUseCase's own
// input shape enforces domain-side (it has no role/sectionId field to leak
// in the first place).
export function toCoachAssignmentInsertRow(userId: string, teamId: string): CoachAssignmentInsertRow {
  return {
    user_id: userId,
    role: 'coach',
    team_id: teamId,
    section_id: null,
  }
}

// specs/web-users.md §2.6/AC-WU-06 — the generalized mapping, one row per
// team for 'coach' (mirrors user_roles' own one-row-per-team shape for that
// role, see the comment above RoleAssignment in domain/entities/user.ts),
// one row otherwise. AssignableRoleAssignment structurally excludes
// 'admin' (domain/entities/user.ts) — this function never has to guard
// against it, the same "the type IS the guarantee" reasoning as
// toCoachAssignmentInsertRow above.
export function toRoleAssignmentInsertRows(userId: string, assignment: AssignableRoleAssignment): RoleAssignmentInsertRow[] {
  switch (assignment.role) {
    case 'player':
      return [{ user_id: userId, role: 'player', team_id: assignment.teamId, section_id: null }]
    case 'coach':
      return assignment.teamIds.map((teamId) => ({ user_id: userId, role: 'coach' as const, team_id: teamId, section_id: null }))
    case 'section-manager':
      return [{ user_id: userId, role: 'section-manager', team_id: null, section_id: assignment.sectionId }]
    default:
      // authorized-officer / treasurer / medical-referent / volunteer —
      // §2.6c: club-wide, no scope.
      return [{ user_id: userId, role: assignment.role, team_id: null, section_id: null }]
  }
}
