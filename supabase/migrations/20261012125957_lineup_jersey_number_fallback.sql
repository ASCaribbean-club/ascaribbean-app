-- 'match_lineup:jersey-fallback' — specs/coach-match-composition.md §1
-- "Numéro de maillot", point 6 (amendement du 2026-10-12): a saved lineup slot
-- with NO jersey number of its own (every composition saved before the
-- jersey_number column existed, or saved with the field left empty) falls back
-- to the player's membership default for the season of the convocation's date
-- (PO-MC-16), so existing compositions pick the number up as soon as the
-- membership carries one. A number stored on the slot ALWAYS wins (AC-MC-27
-- snapshot). Nothing is written: this is a read-time fallback only, so editing
-- a membership later changes what a number-less slot shows, never a slot that
-- has its own number.
--
-- Same shape, same read window ('match_lineup:read-window', AC-MC-09) as before.
-- Only (jersey_number) is read from memberships — no other column can leak
-- (AC-MC-29). Mirrors the season rule of get_lineup_default_jersey_numbers.

create or replace function public.get_match_lineup(p_convocation_id uuid)
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
    coalesce(s.jersey_number, m.jersey_number)::integer
  from public.match_lineups l
  join public.convocations c on c.id = l.convocation_id
  join public.match_lineup_slots s on s.convocation_id = l.convocation_id
  join public.users u on u.id = s.user_id
  left join public.seasons se on c.date::date between se.start_date and se.end_date
  left join public.memberships m
    on m.user_id = s.user_id
   and m.season_id = se.id
   and m.archived_at is null
  where l.convocation_id = p_convocation_id
    and private.can_read_match_lineup(p_convocation_id)
  order by s.slot_index;
$$;

revoke all on function public.get_match_lineup(uuid) from public;
grant execute on function public.get_match_lineup(uuid) to authenticated;
