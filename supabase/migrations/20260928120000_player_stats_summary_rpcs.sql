-- specs/player-stats.md §2/§6 — PO-PS-02 tranché (2026-09-28): a player
-- reads their own attendance ONLY through an aggregate RPC, never a raw
-- attendance_records row. attendance_records' RLS is NOT touched by this
-- migration — no new SELECT policy, no widening (AC-PS-18/AC-PS-21).
--
-- Three functions:
--   1. get_my_attendance_summary() — mirrors rbac-matrix.ts
--      'attendance:read-own-summary' -> ['player']. SECURITY DEFINER,
--      because attendance_records_select_coach_admin (initial schema
--      migration) does not grant a player SELECT at all.
--   2. get_my_response_summary() — mirrors rbac-matrix.ts
--      'response:read-own-summary' -> ['player']. SECURITY INVOKER: verified
--      against convocation_responses_select_own_or_coach (migration
--      20260903205143_convocation_responses_select_own_or_coach.sql), which
--      already grants `user_id = (select auth.uid())` — a player reading
--      their own convocation_responses rows needs no elevated privilege.
--   3. get_my_goals_count() — a build-time addition, NOT one of the two
--      RPCs §6.3 names explicitly. Flagged here rather than silently added:
--      AC-PS-02 requires every indicator on this screen to be season-scoped
--      via current_season(), evaluated by Postgres — and the goals count
--      needs a 3-hop join (match_events -> match_details -> convocations ->
--      teams) to apply that filter, which no client-side query pattern
--      already used in this codebase covers for more than one join level.
--      SECURITY INVOKER: match_events_select_scoped already lets a team
--      member read their own 'goal' rows (20260924100000_
--      match_statistics_schema.sql), so no elevated privilege is needed
--      either — this function performs no new authorization decision, it's
--      already covered by rbac-matrix.ts 'match_goals:view' (§2, "aucune
--      action de matrice non plus").
--
-- All three: no parameter of any kind (AC-02 — nothing to falsify), filter
-- on auth.uid() explicitly in the body (never relying on an underlying
-- table's RLS alone inside a SECURITY DEFINER function — the
-- get_convocation_responders/get_vote_tally lesson, §6.3's own reminder),
-- `set search_path = ''` with schema-qualified names (repo convention, see
-- 20260821092153_convocation_rpc_search_path_fix.sql), `revoke ... from
-- public, anon` + `grant execute to authenticated` only.

-- =========================================================================
-- 1. get_my_attendance_summary() — mirrors rbac-matrix.ts
-- 'attendance:read-own-summary' -> ['player']. Denominator = attendance_records
-- rows the coach has actually VALIDATED for this player (never every
-- scheduled convocation — §6.1, "une échéance sans AttendanceRecord est ni
-- présente ni absente, elle est hors du calcul"). Numerator =
-- actual_status = 'present' among those. Season-scoped via current_season()
-- through the convocation's team (AC-PS-02).
-- =========================================================================

create or replace function public.get_my_attendance_summary()
returns table (validated_count integer, present_count integer)
language sql
security definer
set search_path = ''
as $$
  select
    count(*)::integer as validated_count,
    count(*) filter (where ar.actual_status = 'present')::integer as present_count
  from public.attendance_records ar
  join public.convocations c on c.id = ar.convocation_id
  join public.teams t on t.id = c.team_id
  where ar.user_id = (select auth.uid())
    and t.season_id = (select id from public.current_season());
$$;

comment on function public.get_my_attendance_summary() is
  'Mirrors rbac-matrix.ts action attendance:read-own-summary -> [player]. '
  'Person-scoped via auth.uid() internally, never a parameter. Only read '
  'path onto attendance_records for a player token — its own RLS stays '
  'closed (specs/player-stats.md PO-PS-02, AC-PS-18/AC-PS-19).';

revoke all on function public.get_my_attendance_summary() from public, anon;
grant execute on function public.get_my_attendance_summary() to authenticated;

-- =========================================================================
-- 2. get_my_response_summary() — mirrors rbac-matrix.ts
-- 'response:read-own-summary' -> ['player']. Denominator = past,
-- non-cancelled convocations of the player's CURRENT teams (§6.1 — inherits
-- the ex-PO-CV-05 limitation from specs/create-convocation.md: a player who
-- left a team disappears from past counts, not fixed here, PO-PS-10).
-- Numerator = convocation_responses of status 'present' or 'absent' only
-- ('pending' is not a response).
-- =========================================================================

create or replace function public.get_my_response_summary()
returns table (convocated_count integer, responded_count integer)
language sql
security invoker
set search_path = ''
as $$
  with current_teams as (
    select ur.team_id
    from public.user_roles ur
    join public.teams t on t.id = ur.team_id
    where ur.user_id = (select auth.uid())
      and ur.role = 'player'
      and t.season_id = (select id from public.current_season())
  ),
  scoped_convocations as (
    select c.id
    from public.convocations c
    join current_teams ct on ct.team_id = c.team_id
    where c.date < now()
      and c.status <> 'cancelled'
  )
  select
    (select count(*)::integer from scoped_convocations) as convocated_count,
    (
      select count(*)::integer
      from public.convocation_responses cr
      join scoped_convocations sc on sc.id = cr.convocation_id
      where cr.user_id = (select auth.uid())
        and cr.status in ('present', 'absent')
    ) as responded_count;
$$;

comment on function public.get_my_response_summary() is
  'Mirrors rbac-matrix.ts action response:read-own-summary -> [player]. '
  'Person-scoped via auth.uid() internally, never a parameter. SECURITY '
  'INVOKER — convocation_responses_select_own_or_coach already grants a '
  'player SELECT on their own rows (specs/player-stats.md §6.2).';

revoke all on function public.get_my_response_summary() from public, anon;
grant execute on function public.get_my_response_summary() to authenticated;

-- =========================================================================
-- 3. get_my_goals_count() — specs/player-stats.md §1/AC-PS-03. Not one of
-- the two RPCs §6.3 names explicitly — see this file's own top comment for
-- why it exists anyway. No new authorization decision: already covered by
-- rbac-matrix.ts 'match_goals:view' -> ['player', 'coach'].
-- =========================================================================

create or replace function public.get_my_goals_count()
returns integer
language sql
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from public.match_events me
  join public.match_details md on md.convocation_id = me.convocation_id
  join public.convocations c on c.id = md.convocation_id
  join public.teams t on t.id = c.team_id
  where me.user_id = (select auth.uid())
    and me.event_type = 'goal'
    and t.season_id = (select id from public.current_season());
$$;

comment on function public.get_my_goals_count() is
  'No new rbac-matrix.ts action — already covered by match_goals:view -> '
  '[player, coach] (specs/player-stats.md §2). Person-scoped via auth.uid() '
  'internally, never a parameter. Season-scoped via current_season() '
  '(AC-PS-02), never a client-supplied date.';

revoke all on function public.get_my_goals_count() from public, anon;
grant execute on function public.get_my_goals_count() to authenticated;
