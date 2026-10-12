-- Jersey numbers ("numéro de maillot") — specs/coach-match-composition.md §1
-- "Numéro de maillot", AC-MC-24..29 (amendement du 2026-10-12), and the mirror
-- note in specs/web-memberships.md.
--
-- Two levels (PO-MC-07, decided):
--   1. memberships.jersey_number — the per-SEASON default (one membership row
--      per player and season).
--   2. match_lineup_slots.jersey_number — the number actually worn for THIS
--      match, a snapshot (AC-MC-27). Nothing here ever copies one into the
--      other after the fact: editing a membership never rewrites a saved
--      lineup, and saving a lineup never writes into memberships.
--
-- Decisions: range 1..99 (PO-MC-15), NO unicity constraint anywhere (PO-MC-14),
-- nullable everywhere (AC-MC-29), NO audit trigger (not financial, not a role
-- change). The range is validated by the database (AC-MC-29), mirrored
-- MANUALLY by domain/policies/match-lineup-rules.ts isValidJerseyNumber
-- (rule name 'jersey-number:range', CLAUDE.md §7).

-- =========================================================================
-- 1. Columns. Existing rows stay null.
-- =========================================================================

-- AC-MC-24 — default number of one membership (= one season).
-- Written by the existing memberships_update_admin / memberships_insert_admin
-- policies ('membership:write'): no new policy, a column grant is not in use.
alter table public.memberships
  add column jersey_number smallint
  constraint memberships_jersey_number_range check (jersey_number is null or jersey_number between 1 and 99);

-- AC-MC-27 — number worn for this match. Written by the existing slot
-- insert/update policies ('match_lineup:write').
alter table public.match_lineup_slots
  add column jersey_number smallint
  constraint match_lineup_slots_jersey_number_range check (jersey_number is null or jersey_number between 1 and 99);

-- =========================================================================
-- 2. save_match_lineup — same contract as before (SECURITY INVOKER, so the
-- 'match_lineup:write' policies apply; header upsert + slot replacement in one
-- transaction), now also persisting each slot's jersey_number. A forged value
-- outside 1..99 is refused by the check constraint (AC-MC-29), mapped by
-- mapSupabaseError like the other 23514 errors. The signature is unchanged:
-- the new key is optional in the jsonb payload (absent = null).
-- =========================================================================

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

  insert into public.match_lineup_slots (convocation_id, slot_index, user_id, jersey_number)
  select p_convocation_id, s.slot_index, s.user_id, s.jersey_number
  from jsonb_to_recordset(coalesce(p_slots, '[]'::jsonb))
    as s(slot_index smallint, user_id uuid, jersey_number smallint);
end;
$$;

revoke all on function public.save_match_lineup(uuid, text, jsonb) from public;
grant execute on function public.save_match_lineup(uuid, text, jsonb) to authenticated;

-- =========================================================================
-- 3. get_match_lineup — the return type gains a column, which `create or
-- replace` cannot do: drop and recreate. Read window UNCHANGED
-- ('match_lineup:read-window', AC-MC-09): no row at all for a player before
-- the opening time, so the number is never visible before the composition is
-- (AC-MC-29). The number comes from the SLOT only — no join on memberships, so
-- no other membership column (status, cotisation, licence) can leak.
-- =========================================================================

drop function public.get_match_lineup(uuid);

create function public.get_match_lineup(p_convocation_id uuid)
returns table (formation text, slot_index integer, user_id uuid, display_name text, jersey_number integer)
language sql
security definer
set search_path = ''
as $$
  select
    l.formation,
    s.slot_index::integer,
    s.user_id,
    u.full_name as display_name,
    s.jersey_number::integer
  from public.match_lineups l
  join public.match_lineup_slots s on s.convocation_id = l.convocation_id
  join public.users u on u.id = s.user_id
  where l.convocation_id = p_convocation_id
    and private.can_read_match_lineup(p_convocation_id)
  order by s.slot_index;
$$;

revoke all on function public.get_match_lineup(uuid) from public;
grant execute on function public.get_match_lineup(uuid) to authenticated;

-- =========================================================================
-- 4. get_lineup_default_jersey_numbers — the prefill source (AC-MC-26,
-- PO-MC-16). One row per PLAYER of the convocation's team (the same convoked
-- pool as get_convocation_responders, PO-MC-04) that has a NON-ARCHIVED
-- membership with a number for the season whose [start_date, end_date] range
-- contains the convocation's date. No season contains it, or no membership, or
-- no number -> no row (the client prefills an empty field, AC-MC-29).
-- Exposes (user_id, jersey_number) ONLY — nothing else of the membership.
-- Restricted to the writer: 'match_lineup:write' (private.can_write_match_lineup),
-- a player never needs it. Mirrored MANUALLY by
-- domain/policies/match-lineup-rules.ts getPrefilledJerseyNumber.
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
  join public.user_roles ur
    on ur.team_id = c.team_id and ur.role = 'player'
  join public.memberships m
    on m.user_id = ur.user_id
   and m.season_id = se.id
   and m.archived_at is null
  where c.id = p_convocation_id
    and m.jersey_number is not null
    and private.can_write_match_lineup(p_convocation_id);
$$;

revoke all on function public.get_lineup_default_jersey_numbers(uuid) from public;
grant execute on function public.get_lineup_default_jersey_numbers(uuid) to authenticated;
