-- specs/coach-team-stats.md §1/§4.3/§6 — the "Effectif" section's own roster
-- read: every PLAYER currently assigned to a team, independent of any single
-- convocation. Mirrors get_team_coaches
-- (supabase/migrations/20260904083306_profile_team_coaches.sql) exactly,
-- role = 'player' instead of role = 'coach' — same reasoning: inside a
-- SECURITY DEFINER function, RLS on user_roles/users doesn't apply on its
-- own (the function owner is exempt), so the explicit EXISTS predicate below
-- IS the authorization boundary, not a redundant belt-and-braces check.
--
-- Deliberately narrower than get_team_coaches' own caller set: this feature
-- (specs/coach-team-stats.md §2) is Coach/Staff-only ('team_stats:view'),
-- not "any current member of the team" — a plain player has no route to
-- this screen at all (AC-CTS-02), so the RPC itself only admits that
-- team's own coach or an admin, never private.is_team_member(p_team_id)
-- (which would also admit a teammate player).
create or replace function public.get_team_roster(p_team_id uuid)
returns table (user_id uuid, full_name text)
language sql
security definer
-- set search_path = '' (not `= public`), same convention as
-- get_team_coaches / get_convocation_responders.
set search_path = ''
as $$
  select
    u.id as user_id,
    u.full_name
  from public.user_roles ur
  join public.users u on u.id = ur.user_id
  where ur.team_id = p_team_id
    and ur.role = 'player'
    and (private.is_coach_of_team(p_team_id) or private.is_admin());
$$;

-- Deliberately narrow: two columns, no other `users` fields exposed — same
-- shape as get_team_coaches.
revoke all on function public.get_team_roster(uuid) from public;
grant execute on function public.get_team_roster(uuid) to authenticated;
