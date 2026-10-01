-- Match lineup ("Composition") — specs/coach-match-composition.md §1/§2/§3.
--
-- Mirrors, MANUALLY (CLAUDE.md §7 — never generated either direction):
--   * domain/policies/rbac-matrix.ts 'match_lineup:write': ['coach'], scoped
--     to the coach of the convocation's own team  -> write policies below,
--     each commented 'match_lineup:write'. NO temporal predicate on writes
--     (PO-MC-05, AC-MC-22) — deliberately unlike match_details_update_arrangements.
--   * domain/policies/match-lineup-rules.ts, rule 'match_lineup:read-window'
--     (isLineupVisibleToPlayer / getLineupOpeningTime) -> private.can_read_match_lineup.
--     Players: strictly after meeting_point_time, or — PO-MC-12, unconfirmed
--     assumption — kickoff minus one hour when no RDV is set. Coaches: always
--     (PO-MC-02, unconfirmed assumption).
--
-- A third fact, never merged with convocation_responses / attendance_records
-- (AC-MC-12): nothing here writes to either. No free-text column, no health or
-- financial data (AC-MC-15). No audit trigger (spec §4). No `convocation_attendees`
-- table: the placeable pool is the derived convoked roster = players of the
-- convocation's team (PO-MC-04), the same definition as convocation_responders.

-- =========================================================================
-- 1. Tables. One header row per convocation (upsert, last value wins,
-- AC-MC-08) + one row per OCCUPIED slot.
-- =========================================================================

create table public.match_lineups (
  convocation_id uuid primary key references public.convocations(id) on delete cascade,
  -- AC-MC-04 — exactly the four presets.
  formation text not null check (formation in ('4-3-3', '4-4-2', '3-5-2', '4-2-3-1')),
  updated_at timestamptz not null default now()
);

create table public.match_lineup_slots (
  convocation_id uuid not null references public.match_lineups(convocation_id) on delete cascade,
  -- Football at 11 (PO-MC-09); slot 0 = goalkeeper, number shown = index + 1 (PO-MC-07).
  slot_index smallint not null check (slot_index between 0 and 10),
  user_id uuid not null references public.users(id),
  -- AC-MC-07 — a slot holds at most one player...
  constraint match_lineup_slots_pkey primary key (convocation_id, slot_index),
  -- ...and a player holds at most one slot.
  constraint match_lineup_slots_player_unique unique (convocation_id, user_id)
);

alter table public.match_lineups enable row level security;
alter table public.match_lineup_slots enable row level security;

-- =========================================================================
-- 2. Helpers (private schema, same conventions as private.is_coach_of_team).
-- =========================================================================

-- AC-MC-01 — a MATCH of a FOOTBALL team (PO-MC-09). Used by every write policy
-- so a forged write on a training, a meeting or a non-football team is refused.
create or replace function private.is_football_match(p_convocation_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.convocations c
    join public.teams t on t.id = c.team_id
    join public.sections s on s.id = t.section_id
    where c.id = p_convocation_id
      and c.type = 'match'
      and s.type = 'football'
  );
$$;

-- 'match_lineup:write' — the coach of the convocation's team, on a football
-- match. No time condition (PO-MC-05). Inherits the helper's known gap (no
-- season filter, specs/edit-match-details.md §6), not corrected here.
create or replace function private.can_write_match_lineup(p_convocation_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.convocations c
    where c.id = p_convocation_id
      and private.is_coach_of_team(c.team_id)
  ) and private.is_football_match(p_convocation_id);
$$;

-- 'match_lineup:read-window' — coach of the team: always (PO-MC-02). Player of
-- the team: only once now() is strictly after the RDV, or kickoff - 1h when no
-- RDV (PO-MC-12). Evaluated with the SERVER clock on the CURRENT
-- meeting_point_time (AC-MC-09). Nobody else (AC-01).
create or replace function private.can_read_match_lineup(p_convocation_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select private.is_football_match(p_convocation_id)
    and exists (
      select 1
      from public.convocations c
      left join public.match_details md on md.convocation_id = c.id
      where c.id = p_convocation_id
        and (
          private.is_coach_of_team(c.team_id)
          or (
            private.is_player_of_team(c.team_id)
            and now() > coalesce(md.meeting_point_time, c.date - interval '1 hour')
          )
        )
    );
$$;

revoke all on function private.is_football_match(uuid) from public;
revoke all on function private.can_write_match_lineup(uuid) from public;
revoke all on function private.can_read_match_lineup(uuid) from public;
grant execute on function private.is_football_match(uuid) to authenticated;
grant execute on function private.can_write_match_lineup(uuid) to authenticated;
grant execute on function private.can_read_match_lineup(uuid) to authenticated;

-- =========================================================================
-- 3. Invariant: a placed player belongs to the convoked roster (AC-MC-07,
-- PO-MC-04) — players of the convocation's team, same derivation as the
-- convocation_responders view. A policy cannot express it on the row being
-- written, so a trigger does (raises 23514, mapped by mapSupabaseError).
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
    from public.convocations c
    join public.user_roles ur on ur.team_id = c.team_id and ur.role = 'player'
    where c.id = new.convocation_id
      and ur.user_id = new.user_id
  ) then
    raise exception 'match_lineup_player_not_convoked' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger match_lineup_slots_player_must_be_convoked
  before insert or update on public.match_lineup_slots
  for each row execute function private.match_lineup_slot_player_must_be_convoked();

-- =========================================================================
-- 4. RLS policies.
-- =========================================================================

-- Read ('match_lineup:read-window'). The RPC below is the path the app uses;
-- these keep a direct table read as tight as the RPC (AC-02, AC-MC-09).
create policy match_lineups_select_window on public.match_lineups
  for select to authenticated
  using (private.can_read_match_lineup(convocation_id));

create policy match_lineup_slots_select_window on public.match_lineup_slots
  for select to authenticated
  using (private.can_read_match_lineup(convocation_id));

-- 'match_lineup:write' — coach of the convocation's team, football match only,
-- no time window. `using` gates the existing row, `with check` the resulting one.
create policy match_lineups_insert_coach on public.match_lineups
  for insert to authenticated
  with check (private.can_write_match_lineup(convocation_id));

create policy match_lineups_update_coach on public.match_lineups
  for update to authenticated
  using (private.can_write_match_lineup(convocation_id))
  with check (private.can_write_match_lineup(convocation_id));

create policy match_lineup_slots_insert_coach on public.match_lineup_slots
  for insert to authenticated
  with check (private.can_write_match_lineup(convocation_id));

create policy match_lineup_slots_update_coach on public.match_lineup_slots
  for update to authenticated
  using (private.can_write_match_lineup(convocation_id))
  with check (private.can_write_match_lineup(convocation_id));

-- Slots are replaced on every save (delete + insert inside save_match_lineup),
-- so the coach needs DELETE on slots. The header row is never deleted by the
-- app (it cascades from the convocation): no delete policy on match_lineups.
create policy match_lineup_slots_delete_coach on public.match_lineup_slots
  for delete to authenticated
  using (private.can_write_match_lineup(convocation_id));

-- =========================================================================
-- 5. RPCs.
-- =========================================================================

-- save_match_lineup — SECURITY INVOKER on purpose: every statement runs under
-- the write policies above ('match_lineup:write'). Header upsert + slot
-- replacement in ONE transaction (AC-MC-08: last value wins, no row growth).
-- Writes nothing to convocation_responses / attendance_records (AC-MC-12).
create or replace function public.save_match_lineup(
  p_convocation_id uuid,
  p_formation text,
  p_slots jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.match_lineups (convocation_id, formation, updated_at)
  values (p_convocation_id, p_formation, now())
  on conflict (convocation_id) do update
    set formation = excluded.formation,
        updated_at = excluded.updated_at;

  delete from public.match_lineup_slots where convocation_id = p_convocation_id;

  insert into public.match_lineup_slots (convocation_id, slot_index, user_id)
  select p_convocation_id, s.slot_index, s.user_id
  from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb)) as s(slot_index smallint, user_id uuid);
end;
$$;

revoke all on function public.save_match_lineup(uuid, text, jsonb) from public;
grant execute on function public.save_match_lineup(uuid, text, jsonb) to authenticated;

-- get_match_lineup — SECURITY DEFINER so a player can read teammates' names
-- without widening users_select_own (spec §4: two columns, one convocation's
-- scope). The authorization boundary is the explicit
-- private.can_read_match_lineup() check: for a player token BEFORE the
-- opening time the function returns NO ROW AT ALL — no formation, no player,
-- no slot (AC-MC-09). Returns [] when no lineup exists (AC-MC-14).
create or replace function public.get_match_lineup(p_convocation_id uuid)
returns table (formation text, slot_index integer, user_id uuid, display_name text)
language sql
security definer
set search_path = ''
as $$
  select
    l.formation,
    s.slot_index::integer,
    s.user_id,
    u.full_name as display_name
  from public.match_lineups l
  join public.match_lineup_slots s on s.convocation_id = l.convocation_id
  join public.users u on u.id = s.user_id
  where l.convocation_id = p_convocation_id
    and private.can_read_match_lineup(p_convocation_id)
  order by s.slot_index;
$$;

revoke all on function public.get_match_lineup(uuid) from public;
grant execute on function public.get_match_lineup(uuid) to authenticated;
