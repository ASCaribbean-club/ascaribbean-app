-- Backoffice write path on sections/teams — specs/section-and-teams.md
-- §2.2/§2.6/§5 (AC-ST-01 through AC-ST-08).
--
-- Adds exactly 4 policies on top of the existing sections_select_authenticated
-- and teams_select_team_scoped (supabase/migrations/20260811171754_initial_schema.sql,
-- 20260819153918_season_scoping_correction.sql), neither of which is touched,
-- modified or replaced by this migration (AC-ST-02): every authenticated role
-- keeps reading every section, and the teams_select_team_scoped admin branch
-- stays unrestricted by season (needed for the /admin/teams list to show a
-- 2024-2025 row, §2.6). No new SELECT policy either — the admin branches of
-- both existing policies already cover what the admin console needs (§2.6).
-- No DELETE policy anywhere — specs/section-and-teams.md §1: no suppression
-- or archive control exists anywhere on /admin/sections or /admin/teams,
-- this is not an oversight to fill in later (PO-ST-06, AC-ST-21).
--
-- Mirrors domain/policies/rbac-matrix.ts's 'section:write'/'team:write':
-- ['admin'] entries (CLAUDE.md §7 — manual mirror, never generated either
-- direction). private.is_admin() already exists
-- (20260811171754_initial_schema.sql) — nothing new to create there.

-- (1) mirrors 'section:write'.
create policy sections_insert_admin on public.sections
  for insert to authenticated
  with check (private.is_admin());

-- (2) mirrors 'section:write'. No "which rows are modifiable" restriction
-- (§2.6) — unlike seasons_update_admin, no document requires locking a
-- section's editability by any state (PO-ST-04b).
create policy sections_update_admin on public.sections
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- (3) mirrors 'team:write'.
create policy teams_insert_admin on public.teams
  for insert to authenticated
  with check (private.is_admin());

-- (4) mirrors 'team:write'. No "ended season" restriction either (§2.6) —
-- the mockup shows the edit pencil even on the 2024-2025 row, and the
-- seasons_update_admin rule is deliberately NOT extended to teams by
-- analogy (PO-ST-04c).
create policy teams_update_admin on public.teams
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- =========================================================================
-- §2.2/AC-ST-05/PO-ST-01 — teams.section_id/season_id become `not null`.
-- Product-level requirement per the "Créer une équipe" mockup's own italic
-- copy ("Section et saison sont obligatoires..."), domain/entities/team.ts
-- already declaring both fields non-optional, and
-- docs/season-scoping-correction.md §1's "une nouvelle ligne Team est créée
-- chaque saison" being impossible to interpret for a team with no season.
--
-- Conditioned on no existing null row (§2.2, same principle as
-- season-scoping-correction.md §5.2: never resolve silently, signal and
-- stop). Verified directly against the live project before writing this
-- migration (2026-09-17, via the REST API with the service_role key — never
-- committed anywhere, never a VITE_-prefixed env var): `select id from
-- public.teams where section_id is null or season_id is null` returned zero
-- rows out of the 4 existing teams. If this migration is ever replayed
-- against a database that DOES have such rows, it will fail loudly at the
-- `alter table` step below rather than silently dropping/rewriting them —
-- that failure is the intended behaviour, not a bug to work around.
-- =========================================================================

alter table public.teams
  alter column section_id set not null,
  alter column season_id set not null;
