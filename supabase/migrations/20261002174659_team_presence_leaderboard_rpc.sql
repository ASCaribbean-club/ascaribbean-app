-- Presence tab of the leaderboard (specs/mobile-leaderboard.md, "Présence"
-- addendum) — per-player REAL presence (coach-confirmed attendance_records)
-- and RESPONSE rate (convocation_responses answered vs. sent) for the
-- caller's own current-season team.
--
-- Rule name: leaderboard:view-team-presence  (no rbac-matrix.ts entry, same
-- as leaderboard:view-team-counts — this function IS the boundary).
--
-- SECURITY DEFINER: RLS does not apply inside the body, so the explicit
-- private.is_team_member(p_team_id) predicate IS the authorization boundary.
-- A caller outside the team, or a team outside the current season, gets zero
-- rows — no existence leak.
--
-- Counting rules:
--   * attendance_records: validated_count = rows validated by a coach,
--     present_count = those with actual_status 'present' (fact, never the
--     player's declared intent — the two entities stay separate).
--   * convocation_responses: convoked_count = response rows, responded_count
--     = those no longer 'pending'.
--   * Only convocations of this team, not cancelled, already started.
--
-- Returned columns: user_id, full_name and four counters only.
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
    and private.is_team_member(p_team_id);
$$;

comment on function public.get_team_presence_leaderboard(uuid) is
  'Rule leaderboard:view-team-presence. Presence + response counters per '
  'player of the caller''s current-season team; boundary = '
  'private.is_team_member(p_team_id). Mirrored client-side by '
  'domain/policies/presence-leaderboard-rules.ts (ranking only).';

revoke all on function public.get_team_presence_leaderboard(uuid) from public, anon;
grant execute on function public.get_team_presence_leaderboard(uuid) to authenticated;
