import type { Role } from '@domain/entities/user'

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

// specs/web-users.md §2.6/AC-WU-06 — insert payload for
// RoleAssignmentRepositoryImpl.assignRole(), one row per team_id for
// 'coach', one row otherwise. `role` is the domain Role union minus
// nothing at the TYPE level (unlike CoachAssignmentInsertRow's single
// literal) — the CALLER (toRoleAssignmentInsertRows, data/mappers/
// role-assignment-mapper.ts) is what guarantees 'admin' is never produced,
// mirroring AssignableRoleAssignment's own structural exclusion
// domain-side. The real, non-bypassable guarantee is still
// user_roles_insert_assign_role's own `with check` (§2.6b).
export interface RoleAssignmentInsertRow {
  user_id: string
  role: Role
  team_id: string | null
  section_id: string | null
}
