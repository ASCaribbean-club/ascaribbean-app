-- Authorized-officer read of public.teams — specs/mobile-dirigeant-habilite.md
-- §2 "Lecture des équipes" (PO-DH-05, AC-DH-13).
--
-- Widens teams_select_team_scoped (last defined in
-- 20260819153918_season_scoping_correction.sql) with ONE extra branch, same
-- pattern as the ex-PO-MD-05 correction of convocations_select_team_scoped:
-- the existing branches are copied verbatim, not re-derived.
--
-- Rule name mirrored: reading teams is RLS-only (no rbac-matrix.ts entry,
-- presentation/ renders what the repository returns). The branch is bounded
-- to the CURRENT season, same bound as the team-member branch; the admin
-- branch stays unrestricted by season (needed by /admin/teams).
-- Exposes only team name / section / season: no nominative data.

drop policy teams_select_team_scoped on public.teams;

create policy teams_select_team_scoped on public.teams
  for select to authenticated
  using (
    (private.is_team_member(id) and season_id = (select id from public.current_season()))
    or (private.has_role('authorized-officer') and season_id = (select id from public.current_season()))
    or private.is_admin()
  );
