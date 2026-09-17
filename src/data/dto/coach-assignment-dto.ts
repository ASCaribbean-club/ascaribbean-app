// specs/section-and-teams.md §2.11 — inline join of public.user_roles
// (role='coach') and public.users, no view behind it — XxxDto convention
// (CLAUDE.md §4), same reasoning as CoachDto (get_team_coaches' RPC return
// value). Backs CoachRepositoryImpl.listAllAssignments(); the embedded
// `users` object comes from PostgREST's foreign-key embedding of
// user_roles.user_id -> users.id, never null in practice (user_id is
// `not null` and users_select_own already lets an admin session read every
// row — see that policy's `or private.is_admin()` branch, §2.11) but typed
// nullable to match what a foreign-table embed can structurally return.
export interface CoachAssignmentDto {
  // Never null in practice: every row this DTO represents is filtered
  // server-side to role='coach' (CoachRepositoryImpl.listAllAssignments'
  // own query), and user_roles_scope_check guarantees a 'coach' row always
  // carries a non-null team_id.
  team_id: string
  user_id: string
  users: { full_name: string } | null
}
