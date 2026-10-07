-- Treasurer club-wide calendar read — same page as the authorized-officer
-- (specs/mobile-dirigeant-habilite.md §1.2): every current-season team and
-- every convocation, filterable by section client-side.
--
-- Widens convocations_select_team_scoped and teams_select_team_scoped with a
-- 'treasurer' branch mirroring the existing 'authorized-officer' one; existing
-- branches are copied verbatim. Reading is RLS-only (no rbac-matrix.ts entry).
-- No nominative data: convocation metadata and team name/section/season only.

drop policy convocations_select_team_scoped on public.convocations;

create policy convocations_select_team_scoped on public.convocations
  for select to authenticated
  using (
    private.is_team_member(team_id)
    or private.is_section_manager_of_team(team_id)
    or private.has_role('authorized-officer')
    or private.has_role('treasurer')
    or private.is_admin()
  );

drop policy teams_select_team_scoped on public.teams;

create policy teams_select_team_scoped on public.teams
  for select to authenticated
  using (
    (private.is_team_member(id) and season_id = (select id from public.current_season()))
    or (private.has_role('authorized-officer') and season_id = (select id from public.current_season()))
    or (private.has_role('treasurer') and season_id = (select id from public.current_season()))
    or private.is_admin()
  );

-- match_details / meeting_details: club-wide roles (authorized-officer,
-- treasurer) need the opponent, score and meeting title shown on the calendar
-- rows. Existing branches copied verbatim.

drop policy match_details_select_team_scoped on public.match_details;

create policy match_details_select_team_scoped on public.match_details
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = match_details.convocation_id
        and (
          private.is_team_member(c.team_id)
          or private.has_role('authorized-officer')
          or private.has_role('treasurer')
          or private.is_admin()
        )
    )
  );

drop policy meeting_details_select_team_scoped on public.meeting_details;

create policy meeting_details_select_team_scoped on public.meeting_details
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = meeting_details.convocation_id
        and (
          private.is_team_member(c.team_id)
          or private.has_role('authorized-officer')
          or private.has_role('treasurer')
          or private.is_admin()
        )
    )
  );
