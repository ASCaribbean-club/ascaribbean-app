-- Profile screen amendment (specs/profile-page.md, 2026-09-04 addendum):
-- expose a team's coach identity to that team's own members (players and
-- co-coaches), so a player's profile can show who coaches their team.
--
-- This is a deliberate, narrow exception to this screen's own AC-01/AC-02
-- ("no third-party nominative data, ever") — see the addendum's "Coach
-- identity — exception to AC-01/AC-02" section for the reasoning. The shape
-- mirrors get_convocation_responders (20260901120018_convocation_responder_
-- visibility_correction.sql): a narrow SECURITY DEFINER RPC returning only
-- (user_id, full_name), never widening `users_select_own` itself — widening
-- that policy to `is_team_member` would let any teammate read arbitrary
-- columns of another `users` row for a need that's actually just "coach's
-- display name in a shared context."

create or replace function public.get_team_coaches(p_team_id uuid)
returns table (user_id uuid, full_name text)
language sql
security definer
-- set search_path = '' (not `= public`), same convention as
-- 20260821092153_convocation_rpc_search_path_fix.sql — table references
-- below are schema-qualified accordingly.
set search_path = ''
as $$
  select
    u.id as user_id,
    u.full_name
  from public.user_roles ur
  join public.users u on u.id = ur.user_id
  where ur.team_id = p_team_id
    and ur.role = 'coach'
    -- Explicit team-scoping check, same reasoning as get_convocation_responders:
    -- inside a SECURITY DEFINER function, RLS on user_roles/users doesn't
    -- apply on its own (the function owner is exempt), so this EXISTS
    -- predicate IS the authorization boundary, not a redundant belt-and-
    -- braces check. Any current member of the team (player or coach) or an
    -- admin may resolve the team's coach(es) — same scope as
    -- private.is_team_member.
    and (private.is_team_member(p_team_id) or private.is_admin());
$$;

-- Deliberately narrow: two columns, no other `users` fields exposed.
revoke all on function public.get_team_coaches(uuid) from public;
grant execute on function public.get_team_coaches(uuid) to authenticated;
