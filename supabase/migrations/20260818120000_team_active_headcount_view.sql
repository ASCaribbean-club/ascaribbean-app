-- team_active_headcount — aggregate view for "N licenciés" style headcounts
-- (specs/coach-dashboard.md §1, the "18 licenciés" context line). SQL-only
-- pass: no domain/repositories or data/ mapper exists for this view yet.
--
-- public.memberships has no team_id (see its table comment in
-- 20260811171754_initial_schema.sql): licence/adhesion status is tracked
-- club-wide per season, independent of which team(s) a member is rostered
-- to that season. Team affiliation instead lives on public.user_roles
-- (role = 'player', team_id = the team). So "active members of this team"
-- can't be a direct team_id/season_id join on memberships — it has to go
-- teams -> user_roles -> memberships, using teams.season_id as the season
-- to check each player's membership against (a team is a per-season
-- instance, docs/ARCHITECTURE.md — teams.season_id is what scopes it).
--
-- =========================================================================
-- security_invoker = false (explicit, matches Postgres' default — spelled
-- out because it's a deliberate choice, not an oversight): memberships'
-- own RLS policy (memberships_select_own, initial schema) restricts a row
-- to user_id = auth.uid(), i.e. "own row only". If this view ran as the
-- querying user, that policy would apply to the join too and the count
-- would only ever include the querying user's own membership row —
-- undercounting every other team member. Running as the view owner lets
-- the join see every member's row for the aggregate, same trade-off the
-- private.* SECURITY DEFINER helpers below already make.
--
-- Access to the view itself is club-wide for any authenticated user
-- (docs/DEFAULTS-A-CHALLENGER.md, entry "Vue team_active_headcount —
-- visibilité de l'effectif"): headcount is an aggregate, non-nominative
-- number (a plain integer count, no member-level data), unlike row-level
-- data such as team rosters or member records, which stay restricted to
-- own-team-or-admin elsewhere (e.g. teams_select_team_scoped). So this
-- view does not repeat that boundary in its `where` clause — the grant
-- below is the only gate, and it's "authenticated", not team-scoped.
-- =========================================================================

create view public.team_active_headcount
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
