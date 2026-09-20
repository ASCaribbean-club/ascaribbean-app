import type { AssignableRoleAssignment } from '../entities/user'

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

  // specs/web-users.md §2.6/AC-WU-06/AC-WU-35 — the generalized "+ Rôle"
  // write, AssignRoleUseCase is the only caller. `assignment`'s type
  // (AssignableRoleAssignment, domain/entities/user.ts) structurally
  // excludes 'admin' — this method never receives a role/scope pair the
  // caller didn't already validate. One row per team for 'coach' (same
  // idempotent-on-duplicate shape as assignCoachToTeams above), one row
  // otherwise. Belt-and-braces, not redundant with
  // assignCoachToTeams — that method stays the dedicated path
  // 'role:assign-coach'/AssignCoachDialog keeps using unchanged (AC-WU-31);
  // this one is the SEPARATE, generalized path the new 'role:assign'
  // action/user_roles_insert_assign_role policy backs (§2.6b).
  assignRole(userId: string, assignment: AssignableRoleAssignment): Promise<void>

  // specs/web-users-role-edit-remove.md §2.7/AC-WU-48 (amendement du
  // 2026-09-18) — "modifier la portée d'une affectation",
  // EditRoleAssignmentScopeUseCase is the only caller. Both `currentAssignment`
  // and `nextAssignment` share the SAME role (the use case enforces this
  // before calling here, §1 — the role is never modified by this
  // operation) — `currentAssignment` is the natural-key identifier (§2.1,
  // userId + role + its OWN scope), `nextAssignment` is the desired scope.
  // player/section-manager: a plain UPDATE of the one row `currentAssignment`
  // identifies. coach: a whole-set RECONCILIATION lives HERE, not in the
  // use case (which doesn't need to know about the row-level breakdown,
  // §2.7) — INSERT every newly-checked team, DELETE every unchecked one,
  // sequential, 23505 absorbed ONLY on the INSERTs (same reasoning as
  // assignRole above). A conflict on the UPDATE path (player/
  // section-manager moving onto a scope the same account/role already
  // occupies) is NOT absorbed, unlike that INSERT case: it surfaces as
  // DuplicateRoleAssignmentError via data/errors/map-supabase-error.ts
  // (§2.2 rule 4/AC-WU-51).
  editRoleAssignmentScope(
    userId: string,
    currentAssignment: AssignableRoleAssignment,
    nextAssignment: AssignableRoleAssignment,
  ): Promise<void>

  // specs/web-users-role-edit-remove.md §2.7/AC-WU-48 (amendement du
  // 2026-09-18) — "retirer une affectation", RemoveRoleAssignmentUseCase is
  // the only caller. Deletes every row `assignment` describes, and only
  // those — one row for six of the seven assignable roles, EVERY team_id
  // row for a multi-team 'coach' (§2.3: "retirer une seule équipe... se
  // fait par la modification de portée, pas par le retrait").
  removeRoleAssignment(userId: string, assignment: AssignableRoleAssignment): Promise<void>
}
