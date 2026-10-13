-- Convocation attendees — part 2/3: rewire every surface that derived "who is
-- convoked" from user_roles (role = 'player') so that it reads the real list
-- (public.convocation_attendees, 20261012181248). specs/convocation-player-selection.md
-- §2 "Ce que lit désormais la liste de convoqués".
--
-- Unchanged on purpose (a non-convoked player stays a full team member for
-- these): claim_mission, votes_insert_cast / votes_update_cast, get_vote_tally
-- (its voters denominator is every player of the team), reading the convocation.
--
-- Not touched here, to flag: get_convocation_responders keeps its body — it
-- reads the convocation_responders view, which now reads the list (below).

-- =========================================================================
-- 1. convocation_responders — the join on user_roles becomes a join on the
-- list. LEFT JOIN to the responses is kept: a convoked player without a
-- response is still "en attente". security_invoker stays: the caller's RLS on
-- convocation_attendees (convocation_attendees_select_scoped) applies.
-- Same columns, same types, same order (create or replace view).
-- =========================================================================

create or replace view public.convocation_responders
with (security_invoker = true)
as
select
  c.id as convocation_id,
  ca.user_id,
  (cr.id is not null and cr.status != 'pending') as has_responded
from public.convocations c
join public.convocation_attendees ca on ca.convocation_id = c.id
left join public.convocation_responses cr
  on cr.convocation_id = c.id and cr.user_id = ca.user_id;

-- =========================================================================
-- 2. Automatic closure — required_count = number of attendees (AC-CPS-15).
-- Mirrors domain/policies/convocation-closure.ts (requiredUserIds = the
-- convoked ids). Only the records of attendees count toward completeness.
-- Otherwise identical to 20261003165056_delay_convocation_closure.sql
-- (CONVOCATION_CLOSURE_DELAY_MS = 6h).
-- =========================================================================

create or replace function private.close_convocation_if_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_date timestamptz;
  required_count int;
  recorded_count int;
begin
  select date into v_date
  from public.convocations
  where id = new.convocation_id;

  -- Too early: private.close_elapsed_convocations closes it once 6h have passed.
  if now() < v_date + interval '6 hours' then
    return new;
  end if;

  select count(*) into required_count
  from public.convocation_attendees
  where convocation_id = new.convocation_id;

  select count(*) into recorded_count
  from public.attendance_records ar
  where ar.convocation_id = new.convocation_id
    and exists (
      select 1 from public.convocation_attendees ca
      where ca.convocation_id = ar.convocation_id and ca.user_id = ar.user_id
    );

  if required_count > 0 and recorded_count >= required_count then
    update public.convocations
    set status = 'closed', closed_at = now(), closed_by = new.validated_by
    where id = new.convocation_id and status = 'open';
  end if;

  return new;
end;
$$;

create or replace function private.close_elapsed_convocations()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.convocations c
  set status = 'closed', closed_at = now(),
      closed_by = (
        select ar.validated_by from public.attendance_records ar
        where ar.convocation_id = c.id
        order by ar.validated_at desc limit 1
      )
  where c.status = 'open'
    and c.date + interval '6 hours' <= now()
    and (select count(*) from public.convocation_attendees ca where ca.convocation_id = c.id) > 0
    and (
      select count(*)
      from public.attendance_records ar
      where ar.convocation_id = c.id
        and exists (
          select 1 from public.convocation_attendees ca
          where ca.convocation_id = ar.convocation_id and ca.user_id = ar.user_id
        )
    ) >= (select count(*) from public.convocation_attendees ca where ca.convocation_id = c.id)
    and exists (select 1 from public.attendance_records ar where ar.convocation_id = c.id);
$$;

-- =========================================================================
-- 3. Lineup invariant — a placed player must be on the list (AC-CPS-13,
-- AC-MC-07 read on the real list). Same errcode / token as before.
-- =========================================================================

create or replace function private.match_lineup_slot_player_must_be_convoked()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.convocation_attendees ca
    where ca.convocation_id = new.convocation_id
      and ca.user_id = new.user_id
  ) then
    raise exception 'match_lineup_player_not_convoked' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- =========================================================================
-- 4. Jersey-number prefill — one row per CONVOKED player (was: per player of
-- the team). Same shape, same restriction to the writer
-- ('match_lineup:write' via private.can_write_match_lineup).
-- =========================================================================

create or replace function public.get_lineup_default_jersey_numbers(p_convocation_id uuid)
returns table (user_id uuid, jersey_number integer)
language sql
security definer
set search_path = ''
as $$
  select m.user_id, m.jersey_number::integer
  from public.convocations c
  join public.seasons se
    on c.date::date between se.start_date and se.end_date
  join public.convocation_attendees ca
    on ca.convocation_id = c.id
  join public.memberships m
    on m.user_id = ca.user_id
   and m.season_id = se.id
   and m.archived_at is null
  where c.id = p_convocation_id
    and m.jersey_number is not null
    and private.can_write_match_lineup(p_convocation_id);
$$;

revoke all on function public.get_lineup_default_jersey_numbers(uuid) from public;
grant execute on function public.get_lineup_default_jersey_numbers(uuid) to authenticated;

-- =========================================================================
-- 5. Responses — 'convocation:respond' now also requires the player to be
-- convoked (hypothesis PO-CPS-03, AC-CPS-16). Mirrors the use case's
-- isConvoked check. Everything else is unchanged from the initial schema.
-- =========================================================================

drop policy convocation_responses_insert_respond on public.convocation_responses;
create policy convocation_responses_insert_respond on public.convocation_responses
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = convocation_responses.convocation_id
        and private.is_player_of_team(c.team_id)
    )
    and exists (
      select 1 from public.convocation_attendees ca
      where ca.convocation_id = convocation_responses.convocation_id
        and ca.user_id = convocation_responses.user_id
    )
  );

drop policy convocation_responses_update_respond on public.convocation_responses;
create policy convocation_responses_update_respond on public.convocation_responses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.convocations c
      where c.id = convocation_responses.convocation_id
        and private.is_player_of_team(c.team_id)
    )
    and exists (
      select 1 from public.convocation_attendees ca
      where ca.convocation_id = convocation_responses.convocation_id
        and ca.user_id = convocation_responses.user_id
    )
  );

-- =========================================================================
-- 6. get_my_response_summary — the denominator is the set of past,
-- non-cancelled convocations where the player is CONVOKED (AC-CPS-16,
-- PO-PS-10). SECURITY INVOKER as before.
-- =========================================================================

create or replace function public.get_my_response_summary()
returns table (convocated_count integer, responded_count integer)
language sql
security invoker
set search_path = ''
as $$
  with scoped_convocations as (
    select c.id
    from public.convocation_attendees ca
    join public.convocations c on c.id = ca.convocation_id
    join public.teams t on t.id = c.team_id
    where ca.user_id = (select auth.uid())
      and t.season_id = (select id from public.current_season())
      and c.date < now()
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

revoke all on function public.get_my_response_summary() from public, anon;
grant execute on function public.get_my_response_summary() to authenticated;

-- =========================================================================
-- 7. get_convocation_team_players — every PLAYER of the convocation's team,
-- convoked or not (id, name, position). The mission flows (claim / assign
-- eligibility, member picker) keep their pre-existing pool "players of the
-- team" (claim_mission is unchanged, AC-CPS-12): they can no longer use
-- get_convocation_responders, which is now the convoked list. Same scope check
-- as get_convocation_responders; read-only; no other users column.
-- =========================================================================

create or replace function public.get_convocation_team_players(p_convocation_id uuid)
returns table (user_id uuid, display_name text, "position" text)
language sql
security definer
set search_path = ''
as $$
  select
    ur.user_id,
    u.full_name as display_name,
    u."position"
  from public.convocations c
  join public.user_roles ur on ur.team_id = c.team_id and ur.role = 'player'
  left join public.users u on u.id = ur.user_id
  where c.id = p_convocation_id
    and (private.is_team_member(c.team_id) or private.has_role('authorized-officer') or private.is_admin());
$$;

revoke all on function public.get_convocation_team_players(uuid) from public;
grant execute on function public.get_convocation_team_players(uuid) to authenticated;

-- =========================================================================
-- 8. get_team_roster — also readable by the roles that may create a
-- convocation for the team (section manager, authorized officer), so the
-- creation form can list the players to convoke. Same predicate family as
-- convocations_insert_create. The coach / admin branches are unchanged.
-- =========================================================================

create or replace function public.get_team_roster(p_team_id uuid)
returns table (user_id uuid, full_name text)
language sql
security definer
set search_path = ''
as $$
  select
    u.id as user_id,
    u.full_name
  from public.user_roles ur
  join public.users u on u.id = ur.user_id
  where ur.team_id = p_team_id
    and ur.role = 'player'
    and (
      private.is_coach_of_team(p_team_id)
      or private.is_section_manager_of_team(p_team_id)
      or private.has_role('authorized-officer')
      or private.is_admin()
    );
$$;

revoke all on function public.get_team_roster(uuid) from public;
grant execute on function public.get_team_roster(uuid) to authenticated;
