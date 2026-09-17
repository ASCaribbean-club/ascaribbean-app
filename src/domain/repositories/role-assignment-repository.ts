// specs/section-and-teams.md §2.9/§2.10 — the first write path onto
// public.user_roles in the app. Deliberately its own repository interface
// rather than folded into UserRepository (which reads/writes public.users,
// a different table) or TeamRepository (the resource actually written here
// is user_roles, never teams — §2.9, the entire reason 'role:assign-coach'
// is its own RBAC action distinct from 'team:write', §3).
export interface RoleAssignmentRepository {
  // §2.10/AC-ST-36 — idempotent: assigning a (userId, teamId) pair that
  // already exists is absorbed without error and without a duplicate row,
  // never surfaced to the caller as a failure. AssignCoachToTeamsUseCase is
  // the only caller (AC-ST-40) — it, not this method, is what guarantees
  // role is always 'coach' and section_id is always null regardless of
  // what presentation/ sends; this method's own DTO mapping repeats that
  // guarantee at the boundary rather than trusting the use case alone
  // (defence in depth, mirrored again server-side by
  // user_roles_insert_assign_coach's `with check`, AC-ST-33).
  assignCoachToTeams(userId: string, teamIds: string[]): Promise<void>
}
