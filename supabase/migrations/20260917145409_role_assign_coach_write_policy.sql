-- Coach assignment write path — specs/section-and-teams.md §2.9/§2.10/§5
-- (AC-ST-33 through AC-ST-37).
--
-- Adds exactly 1 policy: the FIRST write policy ever placed on
-- public.user_roles. No SELECT policy added — user_roles_select_own and
-- users_select_own (20260811171754_initial_schema.sql) already let an
-- admin session read every row of both tables via their own
-- `or private.is_admin()` branches, which is all the AssignCoachDialog's
-- `UTILISATEUR` list and the COACH(S) columns need (§2.11) — adding a new
-- SELECT policy or a SECURITY DEFINER function here would be exactly the
-- kind of RLS bypass AC-ST-08/AC-ST-35 forbid. No UPDATE policy, no DELETE
-- policy: this pass assigns a coach, it never reassigns or removes one
-- (§1, PO-ST-13 — decking a pre-checked team in the dialog is a no-op on
-- submit, not a removal).
--
-- Mirrors domain/policies/rbac-matrix.ts's 'role:assign-coach': ['admin']
-- entry (CLAUDE.md §7). The `role = 'coach'` predicate below is NOT
-- decorative (§3): it is the literal SQL mirror of this action's own
-- 'assign-coach' suffix, and the only thing that stops an admin session
-- from inserting a user_roles row for any OTHER role (including 'admin'
-- itself — privilege escalation) straight from the client. `team_id is not
-- null and section_id is null` mirrors user_roles_scope_check's own
-- 'coach' branch and AssignCoachToTeamsUseCase's hard-coded write shape
-- (AC-ST-40) — belt-and-braces, not redundant: this policy is the actual
-- security boundary, the use case is UX/defence-in-depth only
-- (CLAUDE.md §6).
create policy user_roles_insert_assign_coach on public.user_roles
  for insert to authenticated
  with check (
    private.is_admin()
    and role = 'coach'
    and team_id is not null
    and section_id is null
  );
