-- Backoffice write paths for /admin/users — specs/web-users.md §2.6/§2.7/§2.9
-- (AC-WU-05, AC-WU-25, AC-WU-38). Amendement du 2026-09-18: PO-WU-02 (edit)
-- and PO-WU-03 (generalized role assignment) resolved.
--
-- Mirrors domain/policies/rbac-matrix.ts's 'user:write': ['admin'] and
-- 'role:assign': ['admin'] (CLAUDE.md §7 — manual mirror, never generated
-- either direction). private.is_admin() already exists
-- (20260811171754_initial_schema.sql) — nothing new to create there.
--
-- Deliberately NOT touched by this migration (§2.9): 'role:assign-coach'
-- and its own user_roles_insert_assign_coach policy
-- (20260917145409_role_assign_coach_write_policy.sql), still exactly what
-- /admin/teams' AssignCoachDialog consumes (AC-WU-31); no SELECT policy
-- added anywhere (users_select_own/user_roles_select_own already carry an
-- `or private.is_admin()` branch, AC-WU-01/AC-WU-02); no INSERT policy on
-- public.users (account creation is the invite-user Edge Function's own
-- service_role client, which bypasses RLS entirely — AC-WU-04, §2.5); no
-- DELETE, no UPDATE on public.user_roles (no role-removal/reassignment
-- control exists anywhere in this pass, AC-WU-07).

-- =========================================================================
-- (1) public.users — mirrors 'user:write' (§2.7). full_name ONLY, email
-- STRUCTURALLY unwritable — not a `with check` comparing old/new email (the
-- spec's own "au choix du développeur" between the two forms, §2.7), but
-- `grant update (full_name)`: the spec's own recommended form, "la plus
-- simple à vérifier et la plus difficile à contourner". The blanket
-- `grant ... update ...` this table received in
-- 20260811171754_initial_schema.sql is revoked first — without that revoke,
-- the column-level grant below would just ADD full_name to an already
-- unrestricted UPDATE privilege, not narrow it. A forged UPDATE naming
-- `email` (AC-WU-38: "une requête forgée avec la même session administrateur
-- ... est refusée par Postgres") now fails on a column-privilege check
-- before RLS is even evaluated — a stronger guarantee than `using`/
-- `with check` alone, which only ever gate ROWS, never COLUMNS.
-- charter_accepted_at stays written EXCLUSIVELY by the accept_charter() RPC
-- (AC-WU-25) — never opened here, not even to an admin; same for `id`,
-- `created_at`, `position`.
-- =========================================================================

revoke update on public.users from authenticated;
grant update (full_name) on public.users to authenticated;

create policy users_update_admin on public.users
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- =========================================================================
-- (2) public.user_roles — mirrors 'role:assign' (§2.6). A SIBLING of
-- user_roles_insert_assign_coach, NOT a widening of it (§2.6b): permissive
-- policies combine with OR, so both coexist — the 'coach' policy becomes
-- redundant for a coach assignment made through THIS one, but stays exact,
-- and keeps naming the action ('role:assign-coach') it has always mirrored.
--
-- §2.6a — the ONE non-negotiable line: no path here ever inserts
-- role = 'admin'. A literal whitelist of the seven non-admin roles (not
-- `role <> 'admin'`) is the form the spec prefers (§2.6b): a NINTH role
-- added one day to user_roles_scope_check's own CHECK constraint would
-- otherwise become insertable through this policy by default, silently.
--
-- The team_id/section_id SHAPE for whichever of the seven roles was
-- inserted is NOT re-stated here — user_roles_scope_check (existing since
-- 20260811171754_initial_schema.sql; the mockup's own "OPEN-5" is
-- factually wrong, §2.6c) already applies to every insert regardless of
-- which policy authorized it.
-- =========================================================================

create policy user_roles_insert_assign_role on public.user_roles
  for insert to authenticated
  with check (
    private.is_admin()
    and role in ('player', 'coach', 'section-manager', 'authorized-officer', 'treasurer', 'medical-referent', 'volunteer')
  );
