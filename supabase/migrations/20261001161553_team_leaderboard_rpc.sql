-- specs/mobile-leaderboard.md §2 (PO-LB-01, tranché 2026-10-01) — per-player
-- goal / yellow card / red card COUNTS for the caller's own current-season
-- team, so a player can see teammates' counters without any raw
-- `match_events` row being opened to them.
--
-- Rule name: leaderboard:view-team-counts  (no rbac-matrix.ts entry by design,
-- spec §2 "Aucune entrée de matrice" — this function IS the boundary).
--
-- Deliberate non-changes (spec §2 "Interdits"):
--   * match_events_select_scoped is NOT widened — raw card rows stay
--     staff-only (AC-MS-09/AC-MS-10, AC-LB-08).
--   * get_team_roster is NOT widened — its coach/admin-only bound is a
--     documented coach-team-stats choice (AC-CTS-02).
--
-- Counting rule is the same as get_my_goals_count()/get_my_cards_count()
-- (20260928120000 / 20260929112002), AC-LB-06: event_type 'goal' (penalty
-- goals included, never derived from goals_for), 'yellow_card', 'red_card';
-- 'penalty_missed' never counted nor returned; no convocation-status filter;
-- season bound evaluated by Postgres via current_season() (AC-LB-04).
--
-- SECURITY DEFINER: RLS does not apply inside the body, so the explicit
-- private.is_team_member(p_team_id) predicate below IS the authorization
-- boundary (same lesson as get_convocation_responders / get_team_roster).
-- A caller outside the team, or a team outside the current season, gets zero
-- rows (AC-01/AC-02) — no existence leak.
--
-- Returned columns: user_id, full_name and the three counters only (AC-LB-09)
-- — no other `users` column, no match_events id.
-- Roster = users with a 'player' user_roles row on that team (PO-LB-04
-- default: current roster is authoritative), zero-count players included
-- (AC-LB-14).
create or replace function public.get_team_leaderboard(p_team_id uuid)
returns table (
  user_id uuid,
  full_name text,
  goals_count integer,
  yellow_count integer,
  red_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id as user_id,
    u.full_name,
    count(me.id) filter (where me.event_type = 'goal')::integer as goals_count,
    count(me.id) filter (where me.event_type = 'yellow_card')::integer as yellow_count,
    count(me.id) filter (where me.event_type = 'red_card')::integer as red_count
  from public.user_roles ur
  join public.users u on u.id = ur.user_id
  join public.teams t on t.id = ur.team_id
  left join public.match_events me
    on me.user_id = u.id
    and me.event_type in ('goal', 'yellow_card', 'red_card')
    and me.convocation_id in (
      select c.id from public.convocations c where c.team_id = p_team_id
    )
  where ur.team_id = p_team_id
    and ur.role = 'player'
    and t.season_id = (select id from public.current_season())
    and private.is_team_member(p_team_id)
  group by u.id, u.full_name;
$$;

comment on function public.get_team_leaderboard(uuid) is
  'Rule leaderboard:view-team-counts (specs/mobile-leaderboard.md, PO-LB-01). '
  'Counters only (goal/yellow/red) per player of the caller''s current-season '
  'team; boundary = private.is_team_member(p_team_id). Does not widen '
  'match_events_select_scoped nor get_team_roster. Mirrored client-side by '
  'domain/policies/leaderboard-rules.ts (ranking only, not authorization).';

revoke all on function public.get_team_leaderboard(uuid) from public, anon;
grant execute on function public.get_team_leaderboard(uuid) to authenticated;
