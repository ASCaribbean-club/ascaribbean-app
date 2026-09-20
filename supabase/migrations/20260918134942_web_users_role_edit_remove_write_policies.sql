-- Backoffice write paths for editing the SCOPE of an existing role
-- assignment and REMOVING one, from /admin/users' RÔLES column —
-- specs/web-users-role-edit-remove.md §2.6/§2.9 (amendement du 2026-09-18 to
-- specs/web-users.md). Mirrors domain/policies/rbac-matrix.ts's
-- 'role:assign': ['admin'] (EXTENDED by this migration to also cover
-- UPDATE, not just INSERT) and the brand-new 'role:remove': ['admin']
-- (CLAUDE.md §7 — manual mirror, never generated either direction).
-- private.is_admin() already exists (20260811171754_initial_schema.sql) —
-- nothing new to create there.
--
-- Deliberately NOT touched by this migration (§1/AC-WU-46): 'role:assign-coach'
-- and its own user_roles_insert_assign_coach policy
-- (20260917145409_role_assign_coach_write_policy.sql), still exactly what
-- /admin/teams' AssignCoachDialog consumes; user_roles_select_own,
-- user_roles_insert_assign_coach and user_roles_insert_assign_role are all
-- UNCHANGED (AC-WU-44); no policy on public.users (§1: account
-- deactivation/revocation stays out of scope, PO-WU-05).

-- =========================================================================
-- (1) public.user_roles — UPDATE, mirrors 'role:assign''s SECOND policy
-- (§2.5a/§2.6 of the amendment). "Restriction de colonnes d'abord, comme
-- pour public.users" (§2.6): the blanket `grant ... update ...` this table
-- received in 20260811171754_initial_schema.sql is revoked first — without
-- that revoke, the column-level grant below would just ADD team_id/
-- section_id to an already unrestricted UPDATE privilege, not narrow it.
-- The revoke breaks nothing: no UPDATE path existed on this table before
-- this migration (original AC-WU-07).
--
-- Direct, deliberate consequence: `role` and `user_id` become STRUCTURALLY
-- unwritable — a forged UPDATE naming either column fails on a column-
-- privilege check before RLS is even evaluated (AC-WU-43), the guarantee
-- §1 of the amendment names ("le rôle lui-même n'est jamais modifié par
-- cette opération").
-- =========================================================================

revoke update on public.user_roles from authenticated;
grant update (team_id, section_id) on public.user_roles to authenticated;

-- §2.4 — 'admin' excluded, the ONE non-negotiable line, twin of §2.6a of
-- web-users.md: a literal whitelist of the seven non-admin roles (never
-- `role <> 'admin'`) in BOTH `using` (which row can be the STARTING point)
-- and `with check` (which row can be the RESULT) — redundant with the
-- column-level grant above, kept anyway: a `grant` revoked by mistake in a
-- future migration must not silently reopen an elevation path here.
--
-- The team_id/section_id SHAPE is not re-stated here either (same
-- reasoning as the INSERT policy, §2.6c of web-users.md):
-- user_roles_scope_check already applies to every UPDATE regardless of
-- which policy authorized it.
create policy user_roles_update_assign_role on public.user_roles
  for update to authenticated
  using (
    private.is_admin()
    and role in ('player', 'coach', 'section-manager', 'authorized-officer', 'treasurer', 'medical-referent', 'volunteer')
  )
  with check (
    private.is_admin()
    and role in ('player', 'coach', 'section-manager', 'authorized-officer', 'treasurer', 'medical-referent', 'volunteer')
  );

-- =========================================================================
-- (2) public.user_roles — DELETE, mirrors the brand-new 'role:remove'
-- action (§2.5b/§2.6 of the amendment). The FIRST DELETE policy ever opened
-- to a client in this repository (§2.5b: "toutes les autres « suppressions »
-- du backoffice sont des archivages"). No `grant` to add: `delete` on
-- public.user_roles has been granted to `authenticated` since the initial
-- schema, RLS being the only barrier — absolute, until this policy, for
-- want of any DELETE policy at all.
--
-- Same admin + literal seven-role whitelist as the UPDATE policy above. A
-- DELETE has no `with check` — only `using` decides which rows can be
-- targeted at all.
-- =========================================================================

create policy user_roles_delete_remove_role on public.user_roles
  for delete to authenticated
  using (
    private.is_admin()
    and role in ('player', 'coach', 'section-manager', 'authorized-officer', 'treasurer', 'medical-referent', 'volunteer')
  );
