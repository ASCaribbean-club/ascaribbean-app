// specs/section-and-teams.md §2.9 — insert payload for
// RoleAssignmentRepositoryImpl.assignCoachToTeams(), one row per team_id.
// `role`/`section_id` are narrowed to a single literal value each rather
// than `string`/`string | null`: this DTO can only ever represent exactly
// what user_roles_insert_assign_coach's `with check` allows (AC-ST-33), so
// the type itself documents that guarantee instead of merely a runtime one.
export interface CoachAssignmentInsertRow {
  user_id: string
  role: 'coach'
  team_id: string
  section_id: null
}
