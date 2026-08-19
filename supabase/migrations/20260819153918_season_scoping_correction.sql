-- Season scoping correction (AC-CD-01, docs/season-scoping-correction.md).
--
-- Gap: nothing resolved "the current season" or filtered a coach's visible
-- teams by it. A coach's assignment from a prior season still showed up on
-- the dashboard, because public.teams has no notion of "current" and
-- season_id was never checked. Two things are needed to fix this:
-- 1. A way to unambiguously resolve "the current season" from now().
-- 2. A guarantee that two seasons can never overlap — otherwise "the
--    current season" is not a single, well-defined value.

-- =========================================================================
-- 1. Non-overlap constraint on seasons — database-enforced, not just
-- application-level validation, same reasoning as user_roles_scope_check
-- in the initial schema migration.
-- =========================================================================

alter table public.seasons
  add column season_range daterange
  generated always as (daterange(start_date, end_date, '[]')) stored;

-- '[]': both start_date and end_date are inclusive bounds. Whether a gap day
-- between two seasons is allowed/expected is OPEN (docs/season-scoping-correction.md
-- §3.3) — not decided here; this constraint only guarantees no *overlap*.
alter table public.seasons
  add constraint seasons_no_overlap
  exclude using gist (season_range with &&);

-- =========================================================================
-- 2. current_season() — resolves "the current season" as a single row, or
-- no row if there is a deliberate gap between two seasons (e.g. summer
-- break before rollover). Every consumer (dashboard use case, RLS policies)
-- must treat "no current season" as a valid state, not an exceptional one.
--
-- Lives in public (not private.*) and stays executable by authenticated:
-- it is called both directly via RPC (SeasonRepositoryImpl.findCurrent) and
-- from the teams RLS policy below. Not SECURITY DEFINER — public.seasons is
-- already readable by any authenticated user (seasons_select_authenticated),
-- so there is no elevated-privilege lookup to hide here, unlike the
-- private.* helpers.
-- =========================================================================

create or replace function public.current_season()
returns public.seasons
language sql
stable
set search_path = ''
as $$
  select * from public.seasons where season_range @> current_date limit 1;
$$;

revoke all on function public.current_season() from public;
grant execute on function public.current_season() to authenticated;

-- =========================================================================
-- 3. Team read scope now also requires the current season for the
-- team-member branch (AC-CD-01). This is the actual security boundary —
-- TeamRepositoryImpl's application-level filter (data/repositories/
-- TeamRepositoryImpl.ts) is necessary for correct app behaviour, but a coach
-- hitting the REST API directly with their own token must be blocked here
-- regardless. Admin is intentionally left unrestricted: nothing in this
-- correction asks for admin's cross-season visibility to change.
-- (select current_season()) wraps the STABLE function call so it is
-- evaluated once per statement, not once per row (security-rls-performance).
-- =========================================================================

drop policy teams_select_team_scoped on public.teams;

create policy teams_select_team_scoped on public.teams
  for select to authenticated
  using (
    (private.is_team_member(id) and season_id = (select id from public.current_season()))
    or private.is_admin()
  );
