-- ASC Legacy tab of the "Classements" screen — points ranking of a team.
-- docs/specs/asc-legacy.md (the ledger is own-rows only under RLS, so a ranking
-- that shows teammates needs a SECURITY DEFINER read, same approach as
-- get_team_presence_leaderboard).
--
-- Returns, for every player of the team in the CURRENT season, the Legacy points
-- of the season's points mode (PO-LG-06): cumulative = every entry, per_season =
-- the entries whose earned_on falls in the season (inclusive). `is_configured` is
-- the PO-LG-16 flag (mode AND tiers) of the current season, repeated on each row,
-- so the screen can say "not configured" instead of ranking zeros.
--
-- Boundary, same predicate as get_team_presence_leaderboard
-- (20261003165053_presence_leaderboard_exclude_retroactive.sql):
-- private.is_team_member(p_team_id) or the club-wide authorized-officer role. A
-- team outside the caller's scope resolves to no rows (no existence leak).
-- Mirrored client-side by domain/policies/legacy-leaderboard-rules.ts (ranking
-- only). Only the points are exposed: never a reason, a source or a convocation.
create or replace function public.get_team_legacy_leaderboard(p_team_id uuid)
returns table (
  user_id uuid,
  full_name text,
  points integer,
  is_configured boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select
      s.id as season_id,
      s.start_date,
      s.end_date,
      st.points_mode,
      private.legacy_season_is_configured((now() at time zone 'Europe/Paris')::date) as is_configured
    from public.current_season() s
    left join public.legacy_season_settings st on st.season_id = s.id
  )
  select
    u.id as user_id,
    u.full_name,
    coalesce((
      select sum(e.points)
      from public.legacy_points_entries e
      where e.user_id = u.id
        and (cfg.points_mode is distinct from 'per_season' or e.earned_on between cfg.start_date and cfg.end_date)
    ), 0)::integer as points,
    cfg.is_configured
  from cfg
  join public.teams t on t.season_id = cfg.season_id and t.id = p_team_id
  join public.user_roles ur on ur.team_id = t.id and ur.role = 'player'
  join public.users u on u.id = ur.user_id
  where private.is_team_member(p_team_id) or private.has_role('authorized-officer');
$$;

comment on function public.get_team_legacy_leaderboard(uuid) is
  'ASC Legacy points per player of the caller''s current-season team, by the '
  'season''s points mode. Boundary = private.is_team_member(p_team_id) or the '
  'club-wide authorized-officer role. Exposes points only.';

revoke all on function public.get_team_legacy_leaderboard(uuid) from public, anon;
grant execute on function public.get_team_legacy_leaderboard(uuid) to authenticated;
