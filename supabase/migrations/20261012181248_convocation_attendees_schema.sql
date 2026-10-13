-- Convocation attendees ("convoqués") and match competition type —
-- specs/convocation-player-selection.md §1/§2/§3/§5.
--
-- Part 1/3: schema, backfill, integrity triggers, RLS. Parts 2 and 3
-- (20261012181317_convocation_attendees_rewire.sql,
-- 20261012181342_convocation_attendees_create_rpcs.sql) rewire the surfaces
-- that derived "who is convoked" from user_roles, and extend the three
-- create_*_convocation functions. The three files belong together: apply them
-- in one go.
--
-- Mirrors, MANUALLY (CLAUDE.md §7 — never generated either direction):
--   'convocation:create'        : coach / section-manager / authorized-officer / admin
--                                 -> convocation_attendees_insert_create (the list
--                                    written in the SAME transaction as the convocation)
--   'convocation_attendee:add'  : ['coach'], scoped to the team (domain/policies/rbac-matrix.ts)
--                                 -> convocation_attendees_insert_add
--   MAX_OFFICIAL_MATCH_ATTENDEES = 14 (domain/policies/convocation-attendee-rules.ts,
--                                 rule 'convocation-attendees:official-match-cap')
--                                 -> private.convocation_attendee_cap_check
--
-- Developer decisions (authoritative):
--   PO-CPS-01 — competition_type has exactly two values: 'official' | 'friendly'
--     (no separate is_official boolean). MS-07 counts ALL official matches.
--   PO-CPS-02(a) — every EXISTING match is backfilled as 'official'.
--   PO-CPS-02(b) — the backfilled list = every current player of the team, plus
--     anyone who already has a response / attendance / lineup row on that
--     convocation. The 14-cap is NOT enforced retroactively: the backfill runs
--     BEFORE the integrity triggers below exist, and it reports (RAISE NOTICE)
--     every official match left above 14.
--
-- Hypotheses followed, not resolved (flagged in the spec's §6): PO-CPS-03
-- (a non-convoked player cannot respond), PO-CPS-05 (competition_type is not
-- editable: no column grant, plus a guard trigger), PO-CPS-06 (add window =
-- convocation 'open' and before kickoff), PO-CPS-10 (at least one attendee).
-- NOT built here: PO-CPS-07 (a player leaving the team keeps their row).

-- =========================================================================
-- 1. match_details.competition_type (MS-06 / AC-CPS-05)
-- not null, NO default: a match without a competition type is refused.
-- The column is added nullable only to backfill, then constrained.
-- =========================================================================

alter table public.match_details
  add column competition_type text;

-- PO-CPS-02(a): every existing match is an official one.
update public.match_details
   set competition_type = 'official';

alter table public.match_details
  alter column competition_type set not null,
  add constraint match_details_competition_type_check
    check (competition_type in ('official', 'friendly'));

-- No column grant on competition_type: match_details UPDATE grants stay limited
-- to the existing columns (PO-CPS-05 — not editable in this pass).

-- =========================================================================
-- 2. convocation_attendees — current-state list (CLAUDE.md §6): one row per
-- (convocation, player), unicity held by the primary key. Distinct from
-- convocation_responses (player intent) and attendance_records (coach fact).
-- No free-text column, no health data (AC-CPS-18).
-- =========================================================================

create table public.convocation_attendees (
  convocation_id uuid not null references public.convocations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  primary key (convocation_id, user_id)
);

create index convocation_attendees_user_id_idx on public.convocation_attendees (user_id);

alter table public.convocation_attendees enable row level security;

-- Current-state list written once or appended to: no client UPDATE/DELETE (the
-- removal of an attendee is out of scope, PO-CPS-06). Rows disappear with
-- their convocation (cascade).
revoke update, delete on public.convocation_attendees from authenticated;

-- =========================================================================
-- 3. Backfill (AC-CPS-17). Runs as the migration owner BEFORE the triggers
-- are created, so it neither re-checks the cap nor the player-of-team rule
-- for former players who still hold historical rows.
-- =========================================================================

insert into public.convocation_attendees (convocation_id, user_id)
select c.id, ur.user_id
from public.convocations c
join public.user_roles ur on ur.team_id = c.team_id and ur.role = 'player'
union
select cr.convocation_id, cr.user_id from public.convocation_responses cr
union
select ar.convocation_id, ar.user_id from public.attendance_records ar
union
select s.convocation_id, s.user_id from public.match_lineup_slots s;

-- Report: official matches whose backfilled list exceeds the cap. They are kept
-- as they are (no truncation); only further additions are refused.
do $$
declare
  r record;
begin
  for r in
    select ca.convocation_id, count(*) as attendee_count
    from public.convocation_attendees ca
    join public.match_details md on md.convocation_id = ca.convocation_id
    where md.competition_type = 'official'
    group by ca.convocation_id
    having count(*) > 14
  loop
    raise notice 'official match % has % convoked players after backfill (cap is 14, not enforced retroactively)',
      r.convocation_id, r.attendee_count;
  end loop;
end;
$$;

-- =========================================================================
-- 4. Integrity triggers (created AFTER the backfill).
-- =========================================================================

-- AC-CPS-04: only a player of the convocation's team can be convoked (a coach,
-- a member of another team or a non-player is refused). A policy cannot express
-- it on the row being written, so a trigger does (23514, mapped by
-- mapSupabaseError). Security definer: reads user_roles regardless of the caller.
create or replace function private.convocation_attendee_must_be_team_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.convocations c
    join public.user_roles ur on ur.team_id = c.team_id and ur.role = 'player'
    where c.id = new.convocation_id
      and ur.user_id = new.user_id
  ) then
    raise exception 'convocation_attendee_not_team_player' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger convocation_attendees_must_be_team_player
  before insert on public.convocation_attendees
  for each row execute function private.convocation_attendee_must_be_team_player();

-- Rule 'convocation-attendees:official-match-cap' (AC-CPS-06): an official
-- match holds at most 14 attendees. AFTER INSERT so the count includes every row
-- of the statement; the parent convocation row is locked first, so two
-- concurrent additions on a 13-attendee match serialize and only one passes
-- (the second one re-counts after the first one committed). Security definer:
-- the caller (a coach) has no UPDATE privilege on convocations, which
-- `for update` requires. Mirrors MAX_OFFICIAL_MATCH_ATTENDEES and
-- isWithinOfficialMatchCap (domain/policies/convocation-attendee-rules.ts).
-- Only an official match is capped; friendly, training and meeting are not.
create or replace function private.convocation_attendee_cap_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_competition_type text;
  v_count integer;
begin
  select md.competition_type into v_competition_type
  from public.match_details md
  where md.convocation_id = new.convocation_id;

  if v_competition_type = 'official' then
    perform 1 from public.convocations c where c.id = new.convocation_id for update;

    select count(*) into v_count
    from public.convocation_attendees ca
    where ca.convocation_id = new.convocation_id;

    if v_count > 14 then
      raise exception 'convocation_attendee_cap_exceeded' using errcode = '23514';
    end if;
  end if;
  return null;
end;
$$;

create trigger convocation_attendees_official_match_cap
  after insert on public.convocation_attendees
  for each row execute function private.convocation_attendee_cap_check();

-- PO-CPS-05: competition_type has no edit path. If it ever changes (SQL
-- console, future feature), switching to 'official' is refused while the match
-- already holds more than 14 attendees.
create or replace function private.match_details_competition_type_cap_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.competition_type = 'official' and (
    select count(*) from public.convocation_attendees ca where ca.convocation_id = new.convocation_id
  ) > 14 then
    raise exception 'convocation_attendee_cap_exceeded' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger match_details_competition_type_cap
  before update of competition_type on public.match_details
  for each row execute function private.match_details_competition_type_cap_check();

-- =========================================================================
-- 5. RLS
-- =========================================================================

-- Read — same predicate as convocations_select_team_scoped (AC-01: nobody
-- outside the team, except officer / admin / section manager as for the
-- convocation itself). Ids only: names go through get_convocation_responders.
create policy convocation_attendees_select_scoped on public.convocation_attendees
  for select to authenticated
  using (
    exists (
      select 1 from public.convocations c
      where c.id = convocation_attendees.convocation_id
        and (
          private.is_team_member(c.team_id)
          or private.is_section_manager_of_team(c.team_id)
          or private.has_role('authorized-officer')
          or private.is_admin()
        )
    )
  );

-- 'convocation:create' — the list written by create_*_convocation (security
-- invoker) in the transaction that creates the convocation: same role predicate
-- as convocations_insert_create, restricted to a convocation created by THIS
-- transaction (created_at is forced to now() on insert, i.e. the transaction
-- start, and immutable afterwards — convocations_force_created_at).
create policy convocation_attendees_insert_create on public.convocation_attendees
  for insert to authenticated
  with check (
    exists (
      select 1 from public.convocations c
      where c.id = convocation_attendees.convocation_id
        and c.created_at = now()
        and (
          private.is_coach_of_team(c.team_id)
          or private.is_section_manager_of_team(c.team_id)
          or private.has_role('authorized-officer')
          or private.is_admin()
        )
    )
  );

-- 'convocation_attendee:add' — the coach of the convocation's team adds a
-- player after creation, while the convocation is open and before kickoff
-- (PO-CPS-06 hypothesis). A coach of another team, a player token or any other
-- role matches neither policy (AC-02, AC-CPS-11).
create policy convocation_attendees_insert_add on public.convocation_attendees
  for insert to authenticated
  with check (
    exists (
      select 1 from public.convocations c
      where c.id = convocation_attendees.convocation_id
        and private.is_coach_of_team(c.team_id)
        and c.status = 'open'
        and c.date > now()
    )
  );
