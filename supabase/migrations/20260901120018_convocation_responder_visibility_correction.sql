-- Convocation responder visibility correction.
-- Source of truth: docs/convocation_visibility_rls_correction.md, produced
-- after AC-MD-08 failed in recette (specs/match_details_page.md §2/§3).
--
-- Three pieces, none of them optional (see that doc's §6 "Acceptance for
-- this pass"):
--   1. `convocation_responders` view — booleans only, never status/reason.
--   2. `get_convocation_responders()` — narrow SECURITY DEFINER RPC. The
--      correction doc's §4 left the shape open ("two queries, joined
--      client-side, or a single RPC wrapping both — implementer's call, not
--      specified here"); this is the single-RPC choice, combining the
--      roster + `has_responded` boolean + display name in one round trip
--      instead of a separate `get_convocation_responder_names()` the caller
--      would join client-side.
--   3. `convocations_select_team_scoped` widened to match
--      `convocations_insert_create` (section-manager / authorized-officer
--      could create a convocation they couldn't read back — ex-PO-MD-05).
--
-- specs/match_details_page.md §5, PO-MD-09: three schema mismatches between
-- the correction doc's SQL and the real migrations, resolved here —
-- (a) `team_members` doesn't exist, team membership is `public.user_roles`
-- (user_id, team_id, role); (b) `public.users` has no `display_name` column,
-- the real column is `full_name`; (c) `user_roles` covers both `role =
-- 'player'` and `role = 'coach'` for a team, so the roster join is filtered
-- to `role = 'player'` (mirrors `private.is_player_of_team`) or the team's
-- own coach would show up as a convoked player "en attente".

-- =========================================================================
-- 1. convocation_responders — exposes, per convocation, whether each
-- convoked player has responded (boolean only). The base table
-- `convocation_responses` keeps its existing policy untouched — a single
-- Postgres SELECT policy can't show `status`/`reason` to one role and hide
-- them from another on the SAME row, so the narrower shape has to be a
-- separate view rather than a widened table policy
-- (docs/convocation_visibility_rls_correction.md §2.1).
-- =========================================================================

create view public.convocation_responders
with (security_invoker = true)
as
select
  c.id as convocation_id,
  ur.user_id,
  (cr.id is not null and cr.status != 'pending') as has_responded
from public.convocations c
-- PO-MD-09a/c: `team_members` doesn't exist — team membership lives in
-- `public.user_roles` (user_id, team_id, role), which covers BOTH
-- `role = 'player'` and `role = 'coach'` for a given team (see
-- private.is_team_member's `role in ('player', 'coach')`). Filtered to
-- `role = 'player'` here (mirrors private.is_player_of_team) so the team's
-- own coach doesn't show up in this view as a convoked player "en attente".
join public.user_roles ur on ur.team_id = c.team_id and ur.role = 'player'
left join public.convocation_responses cr
  on cr.convocation_id = c.id and cr.user_id = ur.user_id;

-- LEFT JOIN, not an inner join off convocation_responses: a convoked player
-- has no row in convocation_responses until they actually respond (no
-- materialization at creation time). Starting from the roster instead of
-- from convocation_responses is what makes non-responders show up as
-- "en attente" (AC-MD-09) instead of silently missing from the list.

-- Underlying tables' own RLS (convocations, user_roles, convocation_
-- responses) applies via security_invoker = true — this view adds no
-- additional predicate of its own, "if you can see the convocation, you can
-- see who from the convoked roster has responded."
revoke all on public.convocation_responders from public;
grant select on public.convocation_responders to authenticated;

-- =========================================================================
-- 2. get_convocation_responders — SECURITY DEFINER, single round trip:
-- combines the `convocation_responders` view (roster + `has_responded`
-- boolean, already team-scoped) with `users.full_name` in one call, instead
-- of a separate narrow RPC the caller joins client-side against the view.
-- `users_select_own` stays untouched (docs/convocation_visibility_rls_
-- correction.md §2.2) — widening it to `is_team_member` would let any
-- teammate read arbitrary columns of another `users` row for a need that's
-- actually just "display name in a shared context."
-- =========================================================================

create or replace function public.get_convocation_responders(p_convocation_id uuid)
returns table (user_id uuid, display_name text, has_responded boolean)
language sql
security definer
-- set search_path = '' (not `= public`) to match this project's established
-- SECURITY DEFINER convention — see 20260821092153_convocation_rpc_search_
-- path_fix.sql, which re-created three RPCs specifically to close the
-- function_search_path_mutable Supabase linter finding. Table references
-- below are schema-qualified accordingly.
set search_path = ''
as $$
  select
    cr.user_id,
    -- PO-MD-09b: `public.users` has no `display_name` column — the real
    -- column is `full_name` (20260811171754_initial_schema.sql, l. 38).
    u.full_name as display_name,
    cr.has_responded
  from public.convocation_responders cr
  left join public.users u on u.id = cr.user_id
  where cr.convocation_id = p_convocation_id
    -- Explicit team-scoping check, NOT redundant with convocation_responders'
    -- own `security_invoker = true`: inside a SECURITY DEFINER function,
    -- current_user is the function OWNER for the duration of the call, so
    -- "the user of the view" that security_invoker checks against is that
    -- owner, not the original caller — and since none of convocations /
    -- user_roles / convocation_responses have FORCE ROW LEVEL SECURITY, the
    -- (table-owning) function owner is exempt from their RLS entirely. Left
    -- to the view alone, this function would return ANY convocation's full
    -- roster/names to ANY authenticated caller regardless of team — the
    -- join is not itself a boundary once SECURITY DEFINER is in play. This
    -- EXISTS predicate intentionally stays `is_team_member` (not the
    -- narrower `is_coach_of_team`/self-row check that
    -- convocation_responses_select_own_or_coach now uses,
    -- 20260903205143_convocation_responses_select_own_or_coach.sql) —
    -- the RPC's whole purpose is exposing the booleans-only roster to
    -- every teammate, same scope as convocation_responders itself.
    and exists (
      select 1 from public.convocations c
      where c.id = p_convocation_id
        and (private.is_team_member(c.team_id) or private.is_admin())
    );
$$;

-- Deliberately narrow: three columns, no other `users` fields, and the
-- EXISTS check above is the actual authorization boundary — not the join
-- against convocation_responders, whose own RLS is bypassed by virtue of
-- running inside this SECURITY DEFINER function (see comment above).
revoke all on function public.get_convocation_responders(uuid) from public;
grant execute on function public.get_convocation_responders(uuid) to authenticated;

-- =========================================================================
-- 3. convocations_select_team_scoped — bug fix, not a permission expansion.
-- section-manager and authorized-officer already have the right to CREATE a
-- convocation in their scope (convocations_insert_create,
-- 20260821091519_convocation_creation_schema.sql); this widens SELECT to
-- match so they can read back what they just created (ex-PO-MD-05,
-- regression test AC-MD-16).
--
-- The two added branches below are copy-pasted verbatim from
-- convocations_insert_create's own predicate, not re-derived — so the two
-- policies stay comparable at a glance (ARCHITECTURE.md §7, "correspondance
-- vérifiable à l'œil") instead of drifting apart again.
-- =========================================================================

drop policy convocations_select_team_scoped on public.convocations;

create policy convocations_select_team_scoped on public.convocations
  for select to authenticated
  using (
    private.is_team_member(team_id)
    or private.is_section_manager_of_team(team_id)
    or private.has_role('authorized-officer')
    or private.is_admin()
  );
