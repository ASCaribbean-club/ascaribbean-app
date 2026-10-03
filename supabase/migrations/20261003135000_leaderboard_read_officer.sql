-- Leaderboard — the Dirigeant habilité (authorized-officer) may read ANY team's
-- rankings, club-wide, to pick a team after a section on the leaderboard screen.
--
-- Both functions are SECURITY DEFINER with no rbac-matrix.ts entry (the
-- function IS the boundary, same as before). The boundary widens from
-- `private.is_team_member(p_team_id)` to
-- `(private.is_team_member(p_team_id) or private.has_role('authorized-officer'))`.
-- Everything else is unchanged: current-season team only, same columns (counters
-- only, no event ids), zero rows outside the boundary. Rule names:
-- leaderboard:view-team-counts and leaderboard:view-team-presence.
--
-- Same bodies as 20261001161553 (get_team_leaderboard) and 20261002174659
-- (get_team_presence_leaderboard), one predicate each changed. If the
-- retroactive-convocations migration
-- (20261003140100_presence_leaderboard_exclude_retroactive.sql) is also applied,
-- it must run AFTER this one and carry the same officer predicate, or the
-- officer loses presence access: it replaces get_team_presence_leaderboard whole.
--
-- NOT APPLIED by the agent that wrote it: to be reviewed and applied by the
-- developer. After applying, rename the file to the timestamp recorded
-- remotely.

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
    and (private.is_team_member(p_team_id) or private.has_role('authorized-officer'))
  group by u.id, u.full_name;
$$;

comment on function public.get_team_leaderboard(uuid) is
  'Rule leaderboard:view-team-counts (specs/mobile-leaderboard.md, PO-LB-01). '
  'Counters only (goal/yellow/red) per player of the caller''s current-season '
  'team; boundary = private.is_team_member(p_team_id) or the club-wide '
  'authorized-officer role. Does not widen '
  'match_events_select_scoped nor get_team_roster. Mirrored client-side by '
  'domain/policies/leaderboard-rules.ts (ranking only, not authorization).';

revoke all on function public.get_team_leaderboard(uuid) from public, anon;
grant execute on function public.get_team_leaderboard(uuid) to authenticated;

create or replace function public.get_team_presence_leaderboard(p_team_id uuid)
returns table (
  user_id uuid,
  full_name text,
  validated_count integer,
  present_count integer,
  convoked_count integer,
  responded_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id as user_id,
    u.full_name,
    (select count(*) from public.attendance_records ar
       join public.convocations c on c.id = ar.convocation_id
      where ar.user_id = u.id and c.team_id = p_team_id
        and c.status <> 'cancelled')::integer as validated_count,
    (select count(*) from public.attendance_records ar
       join public.convocations c on c.id = ar.convocation_id
      where ar.user_id = u.id and c.team_id = p_team_id
        and c.status <> 'cancelled'
        and ar.actual_status = 'present')::integer as present_count,
    (select count(*) from public.convocation_responses cr
       join public.convocations c on c.id = cr.convocation_id
      where cr.user_id = u.id and c.team_id = p_team_id
        and c.status <> 'cancelled' and c.date <= now())::integer as convoked_count,
    (select count(*) from public.convocation_responses cr
       join public.convocations c on c.id = cr.convocation_id
      where cr.user_id = u.id and c.team_id = p_team_id
        and c.status <> 'cancelled' and c.date <= now()
        and cr.status <> 'pending')::integer as responded_count
  from public.user_roles ur
  join public.users u on u.id = ur.user_id
  join public.teams t on t.id = ur.team_id
  where ur.team_id = p_team_id
    and ur.role = 'player'
    and t.season_id = (select id from public.current_season())
    and (private.is_team_member(p_team_id) or private.has_role('authorized-officer'));
$$;

comment on function public.get_team_presence_leaderboard(uuid) is
  'Rule leaderboard:view-team-presence. Presence + response counters per '
  'player of the caller''s current-season team; boundary = '
  'private.is_team_member(p_team_id) or the club-wide authorized-officer role. Mirrored client-side by '
  'domain/policies/presence-leaderboard-rules.ts (ranking only).';

revoke all on function public.get_team_presence_leaderboard(uuid) from public, anon;
grant execute on function public.get_team_presence_leaderboard(uuid) to authenticated;
