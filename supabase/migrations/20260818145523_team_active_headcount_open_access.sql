-- team_active_headcount — open the aggregate headcount to any authenticated
-- member, instead of gating it to team members/admins (docs/DEFAULTS-A-
-- CHALLENGER.md, entry "Vue team_active_headcount — visibilité de
-- l'effectif"). Product decision: headcount is an aggregate, non-nominative
-- number (a plain integer count, no member-level data), unlike row-level
-- data such as team rosters or member records, which stay restricted to
-- own-team-or-admin elsewhere (e.g. teams_select_team_scoped). So this
-- view no longer repeats that boundary in its `where` clause — the grant
-- below is the only gate, and it's "authenticated", not team-scoped.
--
-- Reconciles remote with the corrected supabase/migrations/
-- 20260818120000_team_active_headcount_view.sql (the version originally
-- applied here still had the team/admin gate; this replaces it in place).
--
-- security_invoker stays false, unchanged from the original migration —
-- required regardless of the access decision above: memberships' own RLS
-- policy (memberships_select_own) restricts rows to user_id = auth.uid(),
-- which would collapse the count to 1 for any non-admin caller if this
-- view ran as invoker.

create or replace view public.team_active_headcount
with (security_invoker = false)
as
select
  t.id as team_id,
  count(distinct ur.user_id)::integer as headcount
from public.teams t
join public.user_roles ur
  on ur.team_id = t.id
  and ur.role = 'player'
join public.memberships m
  on m.user_id = ur.user_id
  and m.season_id = t.season_id
where
  m.status = 'active'
  and m.valid_until >= current_date
group by t.id;

revoke all on public.team_active_headcount from public;
grant select on public.team_active_headcount to authenticated;
