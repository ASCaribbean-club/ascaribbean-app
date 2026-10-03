-- Presence leaderboard — retroactive convocations no longer count in the
-- RESPONSE rate. A convocation created at or after its own kickoff could never
-- receive a response: every convoked player stayed 'pending' through no fault
-- of their own. ATTENDANCE counters (coach-confirmed fact, a different entity)
-- are unchanged: a late entry still records the real fact correctly.
--
-- Same function as 20261002174659_team_presence_leaderboard_rpc.sql, only the
-- two response counters (convoked_count, responded_count) gain
-- `c.created_at < c.date`. That filter is the manual mirror (CLAUDE.md §7) of
-- isRetroactiveConvocation in domain/policies/convocation-creation-window.ts
-- (`created_at >= date` is retroactive).
--
-- Informative indicator only: not coupled to ASC Legacy points.
--
-- Depends on 20261003140000_retroactive_convocations.sql (created_at).
-- NOT APPLIED by the agent that wrote it: to be reviewed and applied by the
-- developer.
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
    -- Response counters: retroactive convocations (created_at >= date) excluded.
    (select count(*) from public.convocation_responses cr
       join public.convocations c on c.id = cr.convocation_id
      where cr.user_id = u.id and c.team_id = p_team_id
        and c.status <> 'cancelled' and c.date <= now()
        and c.created_at < c.date)::integer as convoked_count,
    (select count(*) from public.convocation_responses cr
       join public.convocations c on c.id = cr.convocation_id
      where cr.user_id = u.id and c.team_id = p_team_id
        and c.status <> 'cancelled' and c.date <= now()
        and c.created_at < c.date
        and cr.status <> 'pending')::integer as responded_count
  from public.user_roles ur
  join public.users u on u.id = ur.user_id
  join public.teams t on t.id = ur.team_id
  where ur.team_id = p_team_id
    and ur.role = 'player'
    and t.season_id = (select id from public.current_season())
    and private.is_team_member(p_team_id);
$$;

comment on function public.get_team_presence_leaderboard(uuid) is
  'Rule leaderboard:view-team-presence. Presence + response counters per '
  'player of the caller''s current-season team; boundary = '
  'private.is_team_member(p_team_id). Response counters exclude retroactive '
  'convocations (created_at >= date). Mirrored client-side by '
  'domain/policies/presence-leaderboard-rules.ts (ranking only).';

revoke all on function public.get_team_presence_leaderboard(uuid) from public, anon;
grant execute on function public.get_team_presence_leaderboard(uuid) to authenticated;
