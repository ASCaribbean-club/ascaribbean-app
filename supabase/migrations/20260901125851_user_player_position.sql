-- Player position on public.users, backing domain/entities/user.ts's
-- PlayerPosition and the Effectif roster's position sub-label
-- (specs/match_details_page.md correction #10, reversed 2026-09-01,
-- décision développeuse — the mockup's per-row position label had no
-- domain support until now).
--
-- Two pieces:
--   1. public.users gains a nullable `position` column, CHECK-constrained
--      to the same four values as domain's PlayerPosition union — nullable
--      because only players have one, and a player may not have set one
--      yet.
--   2. get_convocation_responders() (20260901120018_convocation_responder_
--      visibility_correction.sql) is widened to also return it. This is a
--      genuine widening of that RPC's deliberately-narrow shape, but not a
--      privacy regression: unlike status/reason, a position isn't a fact
--      the correction doc's §2.1 boundary was ever protecting — it's non-
--      sensitive roster metadata, same visibility class as display_name.

-- =========================================================================
-- 1. public.users.position
-- =========================================================================

-- `position` is a reserved word in Postgres's grammar (the POSITION(a IN b)
-- expression) — quoted everywhere it's used as an identifier below,
-- including inside the RPC's RETURNS TABLE list and its SELECT list.
alter table public.users
  add column "position" text
  check ("position" in ('goalkeeper', 'defender', 'midfielder', 'forward'));

-- =========================================================================
-- 2. get_convocation_responders — widened return shape (user_id,
-- display_name, has_responded, position). CREATE OR REPLACE can't change a
-- function's return type, so the old three-column signature is dropped
-- first. Body and comments otherwise unchanged from 20260901120018 — same
-- SECURITY DEFINER scoping check, same search_path convention, same
-- underlying join against convocation_responders + users.
-- =========================================================================

drop function public.get_convocation_responders(uuid);

create function public.get_convocation_responders(p_convocation_id uuid)
returns table (user_id uuid, display_name text, has_responded boolean, "position" text)
language sql
security definer
set search_path = ''
as $$
  select
    cr.user_id,
    u.full_name as display_name,
    cr.has_responded,
    u."position"
  from public.convocation_responders cr
  left join public.users u on u.id = cr.user_id
  where cr.convocation_id = p_convocation_id
    and exists (
      select 1 from public.convocations c
      where c.id = p_convocation_id
        and (private.is_team_member(c.team_id) or private.is_admin())
    );
$$;

revoke all on function public.get_convocation_responders(uuid) from public;
grant execute on function public.get_convocation_responders(uuid) to authenticated;
