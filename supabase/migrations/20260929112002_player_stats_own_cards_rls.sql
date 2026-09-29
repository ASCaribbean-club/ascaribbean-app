-- specs/player-stats.md addendum "PO-PS-03 tranché" (2026-09-29, décision
-- développeuse) — resolves PO-PS-03 ("le joueur voit-il ses propres
-- cartons ?"), which the spec originally left OPEN with "Développeuse +
-- Bureau" as decision owners. Resolved here by the developer alone, on
-- direct request — the Bureau was NOT consulted. Flagged here, in
-- rbac-matrix.ts's 'match_cards:view-own' comment, and in the spec's own
-- addendum, rather than silently treated as fully settled.
--
-- ⚠️ This is a genuine RLS boundary change, not an additive read like
-- get_my_goals_count()/get_my_attendance_summary_by_type() were:
-- match_events_select_scoped (20260924100000_match_statistics_schema.sql)
-- was written as a WHITELIST on `event_type = 'goal'` for the team-member
-- branch specifically so that every OTHER event type (yellow_card,
-- red_card, penalty_missed) is staff-only FOR ANY NON-COACH TOKEN,
-- including the card-holder's own — see that migration's own comment
-- ("AC-MS-10 ... a 5th event type added later to the check constraint above
-- is staff-only by construction, with NO change needed here"). This
-- migration adds a narrow, additive OWN-ROW branch: a caller may now also
-- read a match_events row of ANY event_type when it is their OWN row
-- (`user_id = auth.uid()`), regardless of team membership. AC-MS-09/
-- AC-MS-10 (no TEAMMATE's card ever visible to a player) are UNCHANGED —
-- the new branch is keyed on user_id, it can never match a row belonging to
-- anyone else.
--
-- penalty_missed is included by this same own-row branch (it's a card-
-- adjacent event on the same table) even though only yellow/red cards were
-- asked for — get_my_cards_count() below still only ever COUNTS
-- yellow_card/red_card, so nothing new is surfaced beyond what was
-- requested; a player could in principle query match_events directly for
-- their own penalty_missed rows too, which is an accepted, minor
-- consequence of keying the RLS branch on "own row" rather than
-- "own row AND event_type IN ('yellow_card', 'red_card')" — the latter
-- would need the same whitelist-of-two maintained in two places (RLS +
-- RPC) for no real benefit, since a player already knows whether they
-- missed their own penalty from having been on the pitch.
drop policy match_events_select_scoped on public.match_events;

create policy match_events_select_scoped on public.match_events
  for select to authenticated
  using (
    match_events.user_id = (select auth.uid())
    or exists (
      select 1 from public.convocations c
      where c.id = match_events.convocation_id
        and (
          (match_events.event_type = 'goal' and private.is_team_member(c.team_id))
          or private.is_coach_of_team(c.team_id)
        )
    )
  );

-- =========================================================================
-- get_my_cards_count() — mirrors rbac-matrix.ts 'match_cards:view-own' ->
-- ['player']. SECURITY INVOKER: the own-row RLS branch above already
-- permits this without any elevated privilege. No parameter — filters on
-- auth.uid() internally (AC-02). Season-scoped via current_season()
-- (AC-PS-02). Counts ONLY yellow_card/red_card — never penalty_missed, not
-- asked for.
-- =========================================================================

create or replace function public.get_my_cards_count()
returns table (yellow_count integer, red_count integer)
language sql
security invoker
set search_path = ''
as $$
  select
    count(*) filter (where me.event_type = 'yellow_card')::integer as yellow_count,
    count(*) filter (where me.event_type = 'red_card')::integer as red_count
  from public.match_events me
  join public.match_details md on md.convocation_id = me.convocation_id
  join public.convocations c on c.id = md.convocation_id
  join public.teams t on t.id = c.team_id
  where me.user_id = (select auth.uid())
    and t.season_id = (select id from public.current_season());
$$;

comment on function public.get_my_cards_count() is
  'Mirrors rbac-matrix.ts action match_cards:view-own -> [player]. '
  'Person-scoped via auth.uid() internally, never a parameter. Resolves '
  'PO-PS-03 (specs/player-stats.md addendum, developer decision only, no '
  'Bureau sign-off — flagged, not silently settled). Requires the own-row '
  'branch added to match_events_select_scoped by this same migration.';

revoke all on function public.get_my_cards_count() from public, anon;
grant execute on function public.get_my_cards_count() to authenticated;
