import type { CoachAssignmentInsertRow } from '@data/dto/role-assignment-dto'

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
